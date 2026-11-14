import "server-only";
import { Pool, type PoolClient } from "pg";

// Postgres 연결(운영은 Supabase 서울의 트랜잭션 풀러(6543), 로컬은 docker의 postgres:17).
// - asUser(uid, fn): 트랜잭션 안에서 app_user 역할 + app.user_id로 바꿔서 돈다. RLS가 그 사람 것만 보이게 한다
// - asSystem(fn): 소유자 권한(RLS 밖). 크론·앱 없이 답하기·초대 미리보기처럼 로그인한 사람이 없는 곳에서만 쓰고, 범위는 코드에서 직접 지킨다

const globalForPool = globalThis as unknown as { __readmePool?: Pool };

export function pool(): Pool {
  if (!globalForPool.__readmePool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is missing (run pnpm env:local)");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    globalForPool.__readmePool = new Pool({ connectionString: url, max: local ? 10 : 5, ssl: local ? false : { rejectUnauthorized: false } });
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

async function run<T>(setup: ((c: PoolClient) => Promise<void>) | null, fn: (q: Q) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    if (setup) await setup(client);
    const result = await fn(bind(client));
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** 로그인한 사람 권한으로(RLS 적용). uid가 null이면 로그인 안 한 사람(공개 함수만 통과) */
export function asUser<T>(uid: string | null, fn: (q: Q) => Promise<T>): Promise<T> {
  return run(async (c) => {
    await c.query("set local role app_user");
    await c.query("select set_config('app.user_id', $1, true)", [uid ?? ""]);
  }, fn);
}

/** 소유자 권한(RLS 밖) */
export function asSystem<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  return run(null, fn);
}

/** DB 함수가 raise exception 한 이유(예: 'expired', 'used') */
export function dbReason(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
