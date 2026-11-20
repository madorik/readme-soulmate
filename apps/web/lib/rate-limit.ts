import "server-only";
import { systemOne } from "./db";

// 속도 제한. 두 가지:
// - memoryHit: 이 서버 인스턴스 안에서만 세는 가벼운 제한(DB를 안 부른다). 이용 기록 받기처럼 자주 오는 곳의 터무니없는 반복을 막는 용도
// - dbHit: 모든 인스턴스가 같이 세는 제한(rate_hit, 마이그레이션 0027). 로그인·관리자 키처럼 드물고 중요한 곳
// 표·함수가 아직 없으면(배포와 마이그레이션 사이) 막지 않고 통과시킨다. 그 밖의 DB 오류는 failClosed일 때만 막는다.

const memory = new Map<string, { n: number; resetAt: number }>();
const MEMORY_MAX_KEYS = 50_000;

/** 이 인스턴스 안에서 창(ms) 동안 max번까지. 넘으면 false */
export function memoryHit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  if (memory.size > MEMORY_MAX_KEYS) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    // 그래도 가득하면 비운다(메모리가 끝없이 늘지 않게)
    if (memory.size > MEMORY_MAX_KEYS) memory.clear();
  }
  const cur = memory.get(key);
  if (!cur || cur.resetAt <= now) {
    memory.set(key, { n: 1, resetAt: now + windowMs });
    return true;
  }
  cur.n += 1;
  return cur.n <= max;
}

function missing(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return code === "42P01" || code === "42883";
}

/** 모든 인스턴스가 같이 센다. 창(초) 동안 max번까지, 넘으면 false */
export async function dbHit(key: string, windowSec: number, max: number, opts: { failClosed?: boolean } = {}): Promise<boolean> {
  try {
    const row = await systemOne<{ ok: boolean }>("select public.rate_hit($1, $2, $3) as ok", [key.slice(0, 200), windowSec, max]);
    return row?.ok !== false;
  } catch (e) {
    if (missing(e)) return true;
    console.warn("rate limit failed", e instanceof Error ? e.message : e);
    return !opts.failClosed;
  }
}

/** 요청 머리글에서 보낸 사람 주소(Vercel이 x-forwarded-for의 맨 앞에 실제 주소를 넣는다). 모르면 "unknown" */
export function clientIp(h: { get(name: string): string | null }): string {
  const first = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim();
  return (first || h.get("x-real-ip") || "unknown").slice(0, 64);
}
