// RLS·함수 권한 테스트. 로컬 도커 Postgres(pnpm db:start && pnpm db:migrate)에 붙어서 돈다: pnpm test:db
// 앱 서버와 똑같이 트랜잭션 안에서 app_user 역할 + app.user_id로 바꿔서 쿼리한다(apps/web/lib/db.ts).
import { createHash, randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import pg from "pg";

const URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:55433/readme";
const pool = new pg.Pool({ connectionString: URL, max: 4 });
const made: string[] = [];

type Client = pg.PoolClient;

async function as<T>(uid: string | null, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("set local role app_user");
    await c.query("select set_config('app.user_id', $1, true)", [uid ?? ""]);
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

async function rows(uid: string | null, sql: string, params: unknown[] = []) {
  return as(uid, async (c) => (await c.query(sql, params)).rows);
}

async function makeUser(name: string, anonymous = false): Promise<string> {
  const id = randomUUID();
  await pool.query(`insert into "user" (id, name, email, "isAnonymous") values ($1, $2, $3, $4)`, [id, name, `${id}@test.invalid`, anonymous]);
  made.push(id);
  return id;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function token() {
  const raw = randomBytes(24).toString("base64url");
  const code = Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return { raw, hash: createHash("sha256").update(raw).digest("hex"), code };
}

async function invite(uid: string, kind: "share" | "request", sections: string[], extra: { relation?: string; recipient?: string } = {}) {
  const t = token();
  await rows(
    uid,
    `insert into invites (kind, inviter_id, token_hash, code, relation, sections, recipient_name, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, now() + interval '7 days')`,
    [kind, uid, t.hash, t.code, extra.relation ?? "partner", sections, extra.recipient ?? ""],
  );
  return t;
}

async function writeCard(uid: string, section: string, payload: unknown) {
  await rows(uid, "insert into card_sections (owner_id, section, payload) values ($1, $2, $3) on conflict (owner_id, section) do update set payload = excluded.payload", [
    uid,
    section,
    JSON.stringify(payload),
  ]);
}

async function rejects(p: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(p, (e: Error) => pattern.test(e.message));
}

let alice: string, bob: string, carol: string;

before(async () => {
  alice = await makeUser("앨리스");
  bob = await makeUser("밥");
  carol = await makeUser("캐럴");
  await writeCard(alice, "safety", { sealed: "x" });
  await writeCard(alice, "taste", { likes: ["떡볶이"] });
  await writeCard(alice, "sizes", { sealed: "y" });
});

after(async () => {
  await pool.query(`delete from "user" where id = any ($1)`, [made]);
  await pool.end();
});

describe("로그인 표", () => {
  test("앱 역할은 user·session·account를 못 읽는다", async () => {
    for (const table of [`"user"`, "session", "account", "verification"]) {
      await rejects(rows(alice, `select * from ${table} limit 1`), /permission denied/);
    }
  });

  test("가입하면 프로필이 생기고, 데모 계정은 이름이 비어 있다", async () => {
    const demo = await makeUser("Anonymous", true);
    const [p] = await rows(demo, "select display_name, locale from profiles where id = $1", [demo]);
    assert.equal(p.display_name, "");
    assert.equal(p.locale, null);
    const [a] = await rows(alice, "select display_name from profiles where id = $1", [alice]);
    assert.equal(a.display_name, "앨리스");
  });
});

describe("리드미 보기", () => {
  test("모르는 사람은 남의 리드미도 프로필도 못 본다", async () => {
    assert.equal((await rows(carol, "select * from card_sections where owner_id = $1", [alice])).length, 0);
    assert.equal((await rows(carol, "select * from profiles where id = $1", [alice])).length, 0);
    assert.equal((await rows(null, "select * from card_sections")).length, 0);
  });

  test("남의 리드미를 쓰거나 고칠 수 없다", async () => {
    await rejects(rows(carol, "insert into card_sections (owner_id, section, payload) values ($1, 'gifts', '{}')", [alice]), /row-level security/);
    const changed = await rows(carol, "update card_sections set payload = '{}' where owner_id = $1 returning 1", [alice]);
    assert.equal(changed.length, 0);
  });

  test("공유 링크를 받으면 허락한 항목만 보이고, 끊으면 안 보인다", async () => {
    const t = await invite(alice, "share", ["taste", "sizes"]);
    const [{ id: contact }] = await rows(bob, "select accept_share($1, null, false) as id", [t.hash]);
    assert.ok(contact);
    const seen = await rows(bob, "select section from card_sections where owner_id = $1 order by section", [alice]);
    assert.deepEqual(
      seen.map((r) => r.section),
      ["sizes", "taste"],
    );
    assert.equal((await rows(bob, "select * from profiles where id = $1", [alice])).length, 1);
    // 앨리스가 끊는다
    await rows(alice, "update grants set revoked_at = now() where owner_id = $1 and viewer_id = $2", [alice, bob]);
    assert.equal((await rows(bob, "select * from card_sections where owner_id = $1", [alice])).length, 0);
    // 다시 이어 준다
    await rows(alice, "update grants set revoked_at = null where owner_id = $1 and viewer_id = $2", [alice, bob]);
  });

  test("보는 사람은 허락을 넓히지 못하고, 허락의 주인·대상은 못 바꾼다", async () => {
    const changed = await rows(bob, "update grants set sections = array['safety','taste','sizes','gifts','dates'] where owner_id = $1 returning 1", [alice]);
    assert.equal(changed.length, 0);
    await rejects(rows(alice, "update grants set viewer_id = $2 where owner_id = $1 and viewer_id = $3", [alice, carol, bob]), /cannot change/);
    await rejects(rows(carol, "insert into grants (owner_id, viewer_id, sections) values ($1, $2, array['safety'])", [alice, carol]), /row-level security/);
  });
});

describe("초대", () => {
  test("남의 초대는 안 보이고, 쓰인 상태로 만들 수 없다", async () => {
    assert.equal((await rows(carol, "select * from invites where inviter_id = $1", [alice])).length, 0);
    const t = token();
    await rejects(
      rows(carol, `insert into invites (kind, inviter_id, token_hash, code, sections, expires_at, used_at) values ('share', $1, $2, $3, array['taste'], now() + interval '1 day', now())`, [
        carol,
        t.hash,
        t.code,
      ]),
      /must start unused/,
    );
    await rejects(
      rows(carol, `insert into invites (kind, inviter_id, token_hash, code, sections, expires_at) values ('share', $1, $2, $3, array['taste'], now() + interval '1 day')`, [alice, t.hash, t.code]),
      /row-level security/,
    );
  });

  test("미리보기는 로그인 없이도 되지만, 시스템 전용 함수는 못 부른다", async () => {
    const t = await invite(alice, "share", ["taste"]);
    const [p] = await rows(null, "select * from invite_preview($1, null)", [t.hash]);
    assert.equal(p.state, "active");
    assert.equal(p.inviter_name, "앨리스");
    const [byCode] = await rows(null, "select * from invite_preview(null, $1)", [t.code.toLowerCase()]);
    assert.equal(byCode.state, "active");
    await rejects(rows(carol, "select * from find_invite($1, null)", [t.hash]), /permission denied/);
    await rejects(rows(carol, "select * from request_for_answer($1)", [t.hash]), /permission denied/);
    await rejects(rows(carol, "select submit_request_answer($1, 'x', '{}'::jsonb, false)", [t.hash]), /permission denied/);
  });

  test("한 번 쓴 링크·내 링크·지난 링크·취소한 링크는 못 받는다", async () => {
    const t = await invite(alice, "share", ["taste"]);
    await rejects(rows(alice, "select accept_share($1, null, false)", [t.hash]), /self/);
    await rows(carol, "select accept_share(null, $1, false)", [t.code]);
    await rejects(rows(bob, "select accept_share($1, null, false)", [t.hash]), /used/);

    const old = token();
    await pool.query(
      `insert into invites (kind, inviter_id, token_hash, code, sections, created_at, expires_at) values ('share', $1, $2, $3, array['taste'], now() - interval '3 days', now() - interval '1 minute')`,
      [alice, old.hash, old.code],
    );
    await rejects(rows(bob, "select accept_share($1, null, false)", [old.hash]), /expired/);

    const c = await invite(alice, "share", ["taste"]);
    const [{ ok: notMine }] = await rows(bob, "select cancel_invite(id) as ok from (select $1::uuid as id) x", [
      (await pool.query("select id from invites where token_hash = $1", [c.hash])).rows[0].id,
    ]);
    assert.equal(notMine, false);
    const id = (await pool.query("select id from invites where token_hash = $1", [c.hash])).rows[0].id;
    const [{ ok }] = await rows(alice, "select cancel_invite($1) as ok", [id]);
    assert.equal(ok, true);
    await rejects(rows(bob, "select accept_share($1, null, false)", [c.hash]), /canceled/);
  });

  test("받으면서 내 것도 보내면, 관계 기본 항목으로 서로 보인다", async () => {
    const dan = await makeUser("댄");
    const erin = await makeUser("에린");
    await writeCard(erin, "gifts", { wish: ["책"] });
    await writeCard(erin, "sizes", { sealed: "z" });
    await writeCard(erin, "favorites", { idol: "아이유" });
    const t = await invite(dan, "share", ["taste"], { relation: "friend" });
    await rows(erin, "select accept_share($1, null, true)", [t.hash]);
    const seen = await rows(dan, "select section from card_sections where owner_id = $1 order by section", [erin]);
    assert.deepEqual(
      seen.map((r) => r.section),
      ["favorites", "gifts"],
    ); // 친구 기본값에는 sizes가 없고, 좋아하는 것들은 있다
    const [n] = await rows(dan, "select kind, actor_id from notifications where user_id = $1", [dan]);
    assert.equal(n.kind, "accepted");
    assert.equal(n.actor_id, erin);
  });
});

describe("주소록·메모·알림", () => {
  test("모르는 사람을 주소록에 직접 넣어 엿볼 수 없다", async () => {
    await rejects(rows(carol, "insert into contacts (user_id, person_id) values ($1, $2)", [carol, bob]), /not connected/);
    await rejects(rows(carol, "insert into contacts (user_id, person_id) values ($1, $2)", [bob, alice]), /row-level security|not connected/);
  });

  test("메모는 내 주소록 칸에만, 나만 본다", async () => {
    const [{ id: bobsContact }] = await rows(bob, "select id from contacts where user_id = $1 and person_id = $2", [bob, alice]);
    await rows(bob, "insert into notes (author_id, contact_id, label, payload) values ($1, $2, '선물', '{}')", [bob, bobsContact]);
    assert.equal((await rows(bob, "select * from notes where contact_id = $1", [bobsContact])).length, 1);
    assert.equal((await rows(alice, "select * from notes where contact_id = $1", [bobsContact])).length, 0);
    await rejects(rows(carol, "insert into notes (author_id, contact_id, payload) values ($1, $2, '{}')", [carol, bobsContact]), /row-level security/);
  });

  test("알림은 직접 만들 수 없고, 열람 알림은 켜 둔 사람에게 하루 한 번만", async () => {
    await rejects(rows(carol, "insert into notifications (user_id, kind) values ($1, 'viewed')", [alice]), /row-level security/);
    await rows(bob, "select record_view($1)", [alice]);
    assert.equal((await rows(alice, "select * from notifications where kind = 'viewed' and actor_id = $1", [bob])).length, 0);
    await rows(alice, "update profiles set notify_views = true where id = $1", [alice]);
    await rows(bob, "select record_view($1)", [alice]);
    await rows(bob, "select record_view($1)", [alice]);
    await rows(carol, "select record_view($1)", [alice]); // 캐럴은 taste만 받았지만 허락이 있으니 남는다
    const viewed = await rows(alice, "select actor_id from notifications where kind = 'viewed' order by actor_id", []);
    assert.deepEqual(viewed.map((r) => r.actor_id).sort(), [bob, carol].sort());
    const stranger = await makeUser("모르는 사람");
    await rows(stranger, "select record_view($1)", [alice]);
    assert.equal((await rows(alice, "select * from notifications where kind = 'viewed' and actor_id = $1", [stranger])).length, 0);
  });

  test("그룹은 내 것만 보고, 남의 그룹을 내 사람에게 못 넣고, 기본 그룹은 못 지우며, 그룹을 지우면 그룹 없음이 된다", async () => {
    await rows(alice, "insert into contact_groups (user_id, builtin) values ($1, 'family') on conflict do nothing", [alice]);
    const [mine] = await rows(alice, "insert into contact_groups (user_id, name) values ($1, '동창') returning id", [alice]);
    assert.equal((await rows(bob, "select id from contact_groups where id = $1", [mine.id])).length, 0);
    await rejects(rows(bob, "insert into contact_groups (user_id, name) values ($1, '엿보기')", [alice]), /row-level security/);

    const [bc] = await rows(bob, "insert into contacts (user_id, nickname) values ($1, '누군가') returning id", [bob]);
    await rejects(rows(bob, "update contacts set group_id = $2 where id = $1", [bc.id, mine.id]), /not your group/);
    await rejects(rows(bob, "insert into contacts (user_id, nickname, group_id) values ($1, '또', $2)", [bob, mine.id]), /not your group/);

    const [fam] = await rows(alice, "select id from contact_groups where user_id = $1 and builtin = 'family'", [alice]);
    await rejects(rows(alice, "delete from contact_groups where id = $1", [fam.id]), /builtin group/);
    await rejects(rows(alice, "update contact_groups set name = '우리집' where id = $1", [fam.id]), /builtin group/);

    const [ac] = await rows(alice, "insert into contacts (user_id, nickname, group_id, favorite) values ($1, '친구', $2, true) returning id", [alice, mine.id]);
    await rows(alice, "delete from contact_groups where id = $1", [mine.id]);
    const [after] = await rows(alice, "select group_id, favorite from contacts where id = $1", [ac.id]);
    assert.equal(after.group_id, null);
    assert.equal(after.favorite, true);
  });

  test("푸시 토큰은 내 것만", async () => {
    await rows(bob, "insert into push_tokens (user_id, token, platform) values ($1, 'tok-bob', 'android')", [bob]);
    assert.equal((await rows(carol, "select * from push_tokens where user_id = $1", [bob])).length, 0);
    await rejects(rows(carol, "insert into push_tokens (user_id, token, platform) values ($1, 'tok', 'ios')", [bob]), /row-level security/);
  });
});

describe("앱 없이 답하기(요청)", () => {
  test("답하면 요청한 사람만 보고, 답한 사람이 가입해서 가져오면 자기 리드미가 된다", async () => {
    const mom = await makeUser("엄마");
    const t = await invite(alice, "request", ["safety", "dates"], { relation: "family", recipient: "엄마" });
    const inviteId = (await pool.query("select id from invites where token_hash = $1", [t.hash])).rows[0].id;
    await rows(alice, "insert into contacts (user_id, request_invite_id, nickname) values ($1, $2, '엄마')", [alice, inviteId]);

    // 시스템(소유자) 권한으로 답한다. 알레르기를 넣으면 동의가 필요하다
    await rejects(pool.query("select submit_request_answer($1, '엄마', $2::jsonb, false)", [t.hash, JSON.stringify({ safety: { sealed: "a" } })]), /consent_required/);
    const card = (await pool.query("select submit_request_answer($1, '엄마', $2::jsonb, true) as id", [t.hash, JSON.stringify({ safety: { sealed: "a" }, dates: { sealed: "b" } })])).rows[0].id;
    await rejects(pool.query("select submit_request_answer($1, '엄마', '{}'::jsonb, true)", [t.hash]), /used/);

    assert.equal((await rows(alice, "select * from guest_cards where id = $1", [card])).length, 1);
    assert.equal((await rows(bob, "select * from guest_cards where id = $1", [card])).length, 0);
    const [contact] = await rows(alice, "select guest_card_id, person_id from contacts where user_id = $1 and request_invite_id = $2", [alice, inviteId]);
    assert.equal(contact.guest_card_id, card);
    assert.equal(contact.person_id, null);

    await rejects(rows(alice, "select * from claim_guest_card($1)", [t.hash]), /self/);
    const [claimed] = await rows(mom, "select * from claim_guest_card($1)", [t.hash]);
    assert.equal(claimed.claimed_requester_id, alice);
    assert.deepEqual([...claimed.claimed_sections].sort(), ["dates", "safety"]);
    await rejects(rows(bob, "select * from claim_guest_card($1)", [t.hash]), /used/);

    const [after] = await rows(alice, "select person_id from contacts where user_id = $1 and request_invite_id = $2", [alice, inviteId]);
    assert.equal(after.person_id, mom);
    const [g] = await rows(alice, "select sections from grants where owner_id = $1 and viewer_id = $2", [mom, alice]);
    assert.deepEqual([...g.sections].sort(), ["dates", "safety"]);
  });
});

describe("직접 적어 둔 사람", () => {
  test("내 주소록 칸에 내 이름으로만 카드를 만들고, 나만 보며, 칸을 지우면 같이 지워진다", async () => {
    const [mom] = await rows(alice, "insert into contacts (user_id, nickname) values ($1, '엄마') returning id", [alice]);
    await rows(alice, "insert into contact_cards (contact_id, author_id) values ($1, $2)", [mom.id, alice]);
    await rows(alice, "update contact_cards set sections = sections || jsonb_build_object('dates', '{\"v\":1,\"data\":{}}'::jsonb) where contact_id = $1", [mom.id]);
    const [mine] = await rows(alice, "select sections from contact_cards where contact_id = $1", [mom.id]);
    assert.deepEqual(Object.keys(mine.sections), ["dates"]);

    // 남은 못 보고, 못 고치고, 못 지운다
    assert.equal((await rows(bob, "select * from contact_cards where contact_id = $1", [mom.id])).length, 0);
    assert.equal((await rows(bob, "update contact_cards set sections = '{}' where contact_id = $1 returning 1", [mom.id])).length, 0);
    assert.equal((await rows(bob, "delete from contact_cards where contact_id = $1 returning 1", [mom.id])).length, 0);

    // 남의 주소록 칸에 붙이거나, 남의 이름으로 만들 수 없다
    const [bobs] = await rows(bob, "insert into contacts (user_id, nickname) values ($1, '삼촌') returning id", [bob]);
    await rejects(rows(alice, "insert into contact_cards (contact_id, author_id) values ($1, $2)", [bobs.id, alice]), /row-level security/);
    await rejects(rows(bob, "insert into contact_cards (contact_id, author_id) values ($1, $2)", [bobs.id, alice]), /row-level security/);
    await rejects(rows(alice, "insert into contact_cards (contact_id, author_id) values ($1, $2)", [mom.id, alice]), /duplicate key/);

    await rows(alice, "delete from contacts where id = $1", [mom.id]);
    assert.equal((await pool.query("select 1 from contact_cards where contact_id = $1", [mom.id])).rowCount, 0);
  });
});

describe("계정 삭제", () => {
  test("지우면 리드미·허락·주소록이 함께 사라진다", async () => {
    const gone = await makeUser("지울 사람");
    await writeCard(gone, "taste", { likes: ["커피"] });
    const [aunt] = await rows(gone, "insert into contacts (user_id, nickname) values ($1, '이모') returning id", [gone]);
    await rows(gone, "insert into contact_cards (contact_id, author_id) values ($1, $2)", [aunt.id, gone]);
    const t = await invite(gone, "share", ["taste"]);
    await rows(carol, "select accept_share($1, null, false)", [t.hash]);
    assert.equal((await rows(carol, "select * from card_sections where owner_id = $1", [gone])).length, 1);

    await rejects(rows(carol, `delete from "user" where id = $1`, [gone]), /permission denied/);
    await rows(null, "select delete_my_account()").then(
      () => assert.fail("로그인 없이 지워지면 안 된다"),
      (e: Error) => assert.match(e.message, /not_signed_in/),
    );
    await rows(gone, "select delete_my_account()");
    assert.equal((await pool.query(`select 1 from "user" where id = $1`, [gone])).rowCount, 0);
    assert.equal((await pool.query("select 1 from card_sections where owner_id = $1", [gone])).rowCount, 0);
    assert.equal((await pool.query("select 1 from grants where owner_id = $1", [gone])).rowCount, 0);
    assert.equal((await pool.query("select 1 from contact_cards where author_id = $1", [gone])).rowCount, 0);
    const [c] = await rows(carol, "select person_id from contacts where user_id = $1 order by created_at desc limit 1", [carol]);
    assert.equal(c.person_id, null);
  });
});
