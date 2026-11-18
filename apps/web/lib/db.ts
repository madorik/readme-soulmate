import "server-only";
import { Pool, type PoolClient } from "pg";

// Postgres 연결(운영은 Supabase 서울의 트랜잭션 풀러(6543), 로컬은 docker의 postgres:17).
// - asUser(uid, fn): 트랜잭션 안에서 app_user 역할 + app.user_id로 바꿔서 돈다. RLS가 그 사람 것만 보이게 한다
// - asSystem(fn): 소유자 권한(RLS 밖). 크론·앱 없이 답하기·초대 미리보기처럼 로그인한 사람이 없는 곳에서만 쓰고, 범위는 코드에서 직접 지킨다
// - systemQuery/systemOne: 트랜잭션이 필요 없는 문장 하나(읽기·한 번에 끝나는 쓰기)를 소유자 권한으로
// 풀러가 트랜잭션 모드(pgbouncer)라서 세션 상태·이름 붙인 준비 문장은 쓰지 않는다(set은 모두 local, 쿼리는 이름 없이)

const globalForPool = globalThis as unknown as { __readmePool?: Pool };

export function pool(): Pool {
  if (!globalForPool.__readmePool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is missing (run pnpm env:local)");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const created = new Pool({
      connectionString: url,
      // Supabase 트랜잭션 풀러는 클라이언트 연결을 넉넉히 받아 주므로(서버 쪽 연결은 풀러가 나눠 쓴다) 운영도 8까지 연다
      max: local ? 10 : 8,
      // 풀이 가득 차면 끝없이 기다리지 않고 8초 뒤에 실패시킨다
      connectionTimeoutMillis: 8000,
      ssl: local ? false : { rejectUnauthorized: false },
    });
    // 놀고 있는 연결이 풀러 쪽에서 끊겨도 서버가 죽지 않게(error 이벤트를 안 받으면 프로세스가 내려간다). 풀이 그 연결을 버린다
    created.on("error", (e) => console.warn("pg idle client error", e.message));
    globalForPool.__readmePool = created;
  }
  return globalForPool.__readmePool;
}

export type Row = Record<string, unknown>;

export interface Q {
  <T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  one<T extends Row = Row>(text: string, params?: unknown[]): Promise<T | null>;
}

function bind(client: PoolClient): Q {
  const q = (async <T extends Row>(text: string, params: unknown[] = []) => (await client.query(text, params)).rows as T[]) as Q;
  q.one = async <T extends Row>(text: string, params: unknown[] = []) => ((await client.query(text, params)).rows[0] as T | undefined) ?? null;
  return q;
}

// 풀러가 여러 문장을 한 번에 보낸 단순 쿼리를 못 받으면(거부·오류) 이 프로세스에서는 하나씩 보낸다(느려질 뿐 멈추지 않는다)
let combinedStart = true;

/** 트랜잭션을 연다. 한 번에(왕복 한 번) 보내고, 역할·app.user_id는 모두 트랜잭션 안에서만 유지된다(local) */
async function start(client: PoolClient, uid: string | undefined): Promise<void> {
  if (uid === undefined) {
    await client.query("begin");
    return;
  }
  if (combinedStart) {
    try {
      // 문장을 여러 개 이어 보내는 단순 쿼리라 값을 바인딩할 수 없다: escapeLiteral로 따옴표·역슬래시를 막는다
      await client.query(`begin; set local role app_user; select set_config('app.user_id', ${client.escapeLiteral(uid)}, true)`);
      return;
    } catch (e) {
      combinedStart = false;
      console.warn("pg combined tx start failed, falling back to separate statements:", e instanceof Error ? e.message : e);
      await client.query("rollback");
    }
  }
  await client.query("begin");
  await client.query("set local role app_user");
  await client.query("select set_config('app.user_id', $1, true)", [uid]);
}

async function run<T>(uid: string | undefined, fn: (q: Q) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  let broken = false;
  try {
    await start(client, uid);
    const result = await fn(bind(client));
    // 쓴 내용이 확정(commit)된 뒤에만 돌려준다
    await client.query("commit");
    return result;
  } catch (e) {
    // 되돌리기도 안 되면 연결이 망가진 것이니 풀에 돌려놓지 않고 버린다
    await client.query("rollback").catch(() => {
      broken = true;
    });
    throw e;
  } finally {
    client.release(broken);
  }
}

/** 로그인한 사람 권한으로(RLS 적용). uid가 null이면 로그인 안 한 사람(공개 함수만 통과) */
export function asUser<T>(uid: string | null, fn: (q: Q) => Promise<T>): Promise<T> {
  return run(uid ?? "", fn);
}

/** 소유자 권한(RLS 밖) */
export function asSystem<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  return run(undefined, fn);
}

/** 소유자 권한으로 문장 하나(트랜잭션 없이 왕복 한 번). 여러 문장이 한꺼번에 되어야 하면 asSystem을 쓴다 */
export async function systemQuery<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query(text, params)).rows as T[];
}

export async function systemOne<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await systemQuery<T>(text, params))[0] ?? null;
}

/** DB 함수가 raise exception 한 이유(예: 'expired', 'used') */
export function dbReason(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
