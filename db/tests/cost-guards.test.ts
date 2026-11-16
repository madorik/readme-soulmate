// 비용 방어 함수 테스트(AI 호출 한도 reserve_ai_call, 이용 기록 접기 compact_app_events). 로컬 도커 Postgres에 붙어서 돈다: pnpm test:db
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import pg from "pg";

const URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:55433/readme";
const pool = new pg.Pool({ connectionString: URL, max: 4 });
const made: string[] = [];
// 익명 방문자 id는 사용자를 지워도 안 지워지므로 실행마다 새로 만들고 끝나면 지운다
const ANON = `t${randomUUID().replace(/-/g, '').slice(0, 20)}`;

async function makeUser(): Promise<string> {
  const id = randomUUID();
  await pool.query(`insert into "user" (id, name, email) values ($1, 'cost-test', $2)`, [id, `${id}@test.invalid`]);
  made.push(id);
  return id;
}

const reserve = async (user: string, kind: string, userLimit: number, globalLimit: number) =>
  (await pool.query<{ r: string }>("select public.reserve_ai_call($1, $2, $3, $4) as r", [user, kind, userLimit, globalLimit])).rows[0]!.r;

after(async () => {
  if (made.length) await pool.query(`delete from "user" where id = any ($1)`, [made]); // ai_calls·app_events는 사람이 지워지면 함께 지워진다
  await pool.query("delete from public.app_events where anon = $1", [ANON]);
  await pool.end();
});

describe("reserve_ai_call", () => {
  test("사람마다·종류마다 센다: 한도까지 ok, 그다음 user_limit, 다른 종류·다른 사람은 따로", async () => {
    const a = await makeUser();
    const b = await makeUser();
    assert.equal(await reserve(a, "capture", 2, 1_000_000), "ok");
    assert.equal(await reserve(a, "capture", 2, 1_000_000), "ok");
    assert.equal(await reserve(a, "capture", 2, 1_000_000), "user_limit");
    assert.equal(await reserve(a, "gift", 2, 1_000_000), "ok");
    assert.equal(await reserve(b, "capture", 2, 1_000_000), "ok");
  });

  test("한도 0이면 첫 호출부터 막고, 막힌 호출은 기록에 남기지 않는다", async () => {
    const a = await makeUser();
    assert.equal(await reserve(a, "capture", 0, 1_000_000), "user_limit");
    const { rows } = await pool.query("select count(*)::int as n from public.ai_calls where user_id = $1", [a]);
    assert.equal(rows[0].n, 0);
  });

  test("24시간이 지난 호출은 세지 않는다", async () => {
    const a = await makeUser();
    await pool.query("insert into public.ai_calls (user_id, kind, at) values ($1, 'capture', now() - interval '25 hours'), ($1, 'capture', now() - interval '25 hours')", [a]);
    assert.equal(await reserve(a, "capture", 1, 1_000_000), "ok");
    assert.equal(await reserve(a, "capture", 1, 1_000_000), "user_limit");
  });

  test("서비스 전체 한도: 지난 24시간 전체 호출 수가 한도에 닿으면 global_limit", async () => {
    const a = await makeUser();
    const total = (await pool.query<{ n: number }>("select count(*)::int as n from public.ai_calls where at > now() - interval '24 hours'")).rows[0]!.n;
    assert.equal(await reserve(a, "capture", 100, total + 1), "ok");
    assert.equal(await reserve(a, "capture", 100, total + 1), "global_limit");
  });

  test("같은 사람의 동시 요청이 한도를 넘어 통과하지 못한다", async () => {
    const a = await makeUser();
    const results = await Promise.all(Array.from({ length: 12 }, () => reserve(a, "capture", 5, 1_000_000)));
    assert.equal(results.filter((r) => r === "ok").length, 5);
    assert.equal(results.filter((r) => r === "user_limit").length, 7);
  });

  test("앱 역할(app_user)은 부를 수 없다(남의 횟수를 늘리지 못하게)", async () => {
    const a = await makeUser();
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query("set local role app_user");
      await assert.rejects(c.query("select public.reserve_ai_call($1, 'capture', 5, 100)", [a]), /permission denied/);
    } finally {
      await c.query("rollback").catch(() => {});
      c.release();
    }
  });
});

describe("compact_app_events", () => {
  async function seed(userId: string | null, anon: string | null, name: string, daysAgo: number, hourOffset: number, value: number | null, path = "/home") {
    await pool.query(
      `insert into public.app_events (name, user_id, anon, path, value, at)
       values ($1, $2, $3, $4, $5, (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') - make_interval(days => $6) + make_interval(hours => $7))`,
      [name, userId, anon, path, value, daysAgo, hourOffset],
    );
  }

  test("오래된 날은 (날짜, 사람)마다 줄 하나로: 활동한 사람 수와 머문 시간 합계는 그대로, 최근 줄과 다른 기록은 그대로", async () => {
    const u = await makeUser();
    const v = await makeUser();
    // 200일 전: u는 화면 5번 + 머문 시간 3번, v는 화면 2번 / 이틀 뒤(198일 전) u 화면 2번
    for (let i = 0; i < 5; i++) await seed(u, null, "page_view", 200, i + 1, null);
    for (let i = 0; i < 3; i++) await seed(u, null, "page_time", 200, i + 1, 1000 * (i + 1));
    for (let i = 0; i < 2; i++) await seed(v, null, "page_view", 200, i + 1, null);
    for (let i = 0; i < 2; i++) await seed(u, null, "page_view", 198, i + 1, null);
    await seed(null, ANON, "page_view", 200, 3, null);
    await seed(null, ANON, "page_view", 200, 4, null);
    await seed(null, null, "page_view", 200, 5, null); // 사람도 익명 id도 없는 줄
    await seed(u, null, "me_save", 200, 6, null); // 기능 기록
    await seed(null, ANON, "visit", 200, 1, null);
    // 최근(10일 전)은 건드리지 않는다
    for (let i = 0; i < 4; i++) await seed(u, null, "page_view", 10, i + 1, null);

    const ids = `user_id in ('${u}', '${v}') or anon = '${ANON}' or (user_id is null and anon is null and at > now() - interval '300 days' and path = '/home')`;
    const before = (await pool.query(`select count(*)::int as n from public.app_events where ${ids}`)).rows[0].n;
    const { rows } = await pool.query<{ n: number }>("select public.compact_app_events(180) as n");
    // 지운 줄: u 200일 전 화면 4 + 머문 시간 2, v 1, u 198일 전 1, 익명 1, id 없는 줄 1 = 10(다른 시험 데이터가 있으면 그 이상)
    assert.ok(rows[0]!.n >= 10, "지운 줄 수");

    const day = (n: number) => `(at at time zone 'Asia/Seoul')::date = ((now() at time zone 'Asia/Seoul')::date - ${n})`;
    const count = async (where: string) => (await pool.query(`select count(*)::int as n from public.app_events where ${where}`)).rows[0].n;
    // 200일 전 u: page_view 1줄, page_time 1줄(합계 6000)
    assert.equal(await count(`user_id = '${u}' and name = 'page_view' and ${day(200)}`), 1);
    const t = (await pool.query(`select value from public.app_events where user_id = '${u}' and name = 'page_time' and ${day(200)}`)).rows;
    assert.equal(t.length, 1);
    assert.equal(t[0].value, 6000);
    // 활동한 사람 수는 그대로(u·v·익명 하나)
    assert.equal(await count(`user_id = '${v}' and name = 'page_view' and ${day(200)}`), 1);
    assert.equal(await count(`anon = '${ANON}' and name = 'page_view' and ${day(200)}`), 1);
    assert.equal(await count(`user_id = '${u}' and name = 'page_view' and ${day(198)}`), 1);
    // 아무 id도 없는 줄은 지웠고, 기능 기록·visit·최근 줄은 그대로
    assert.equal(await count(`user_id is null and anon is null and name = 'page_view' and ${day(200)}`), 0);
    assert.equal(await count(`user_id = '${u}' and name = 'me_save'`), 1);
    assert.equal(await count(`anon = '${ANON}' and name = 'visit'`), 1);
    assert.equal(await count(`user_id = '${u}' and name = 'page_view' and ${day(10)}`), 4);

    // 여러 번 불러도 같다
    const again = (await pool.query<{ n: number }>("select public.compact_app_events(180) as n")).rows[0]!.n;
    assert.equal(again, 0);
    const after = (await pool.query(`select count(*)::int as n from public.app_events where ${ids}`)).rows[0].n;
    assert.ok(after < before);
  });

  test("보관 일수는 90일 밑으로 내릴 수 없다(90일 범위 통계·8주 리텐션을 지킨다)", async () => {
    const u = await makeUser();
    for (let i = 0; i < 3; i++) await seed(u, null, "page_view", 120, i + 1, null);
    await pool.query("select public.compact_app_events(1)"); // 1일로 불러도 90일로 본다
    assert.equal((await pool.query(`select count(*)::int as n from public.app_events where user_id = $1 and name = 'page_view'`, [u])).rows[0].n, 1 /* 120일 전은 90일보다 오래돼 접힌다 */);
    const w = await makeUser();
    for (let i = 0; i < 3; i++) await seed(w, null, "page_view", 60, i + 1, null);
    await pool.query("select public.compact_app_events(1)");
    assert.equal((await pool.query(`select count(*)::int as n from public.app_events where user_id = $1 and name = 'page_view'`, [w])).rows[0].n, 3 /* 60일 전은 그대로 */);
  });

  test("앱 역할(app_user)은 부를 수 없다", async () => {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query("set local role app_user");
      await assert.rejects(c.query("select public.compact_app_events(180)"), /permission denied/);
    } finally {
      await c.query("rollback").catch(() => {});
      c.release();
    }
  });
});

before(async () => {
  await pool.query("select 1");
});
