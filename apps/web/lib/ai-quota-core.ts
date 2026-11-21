// AI 호출 한도 값(서버 전용 아님: 시험에서 바로). 한도는 환경 변수로 바꾼다. 지난 24시간 기준.
//   AI_CAPTURE_DAILY_LIMIT  말로 적기, 사람마다 (기본 40)
//   AI_GIFT_DAILY_LIMIT     선물 추천(AI가 고르는 것), 사람마다 (기본 60). 한도가 차면 AI 없이 기록만으로 고른다
//   AI_IMPORT_DAILY_LIMIT   메모 가져오기(긴 글을 통째로 읽는다), 사람마다 (기본 5). 한 번 가져오기가 한 번으로 센다(조각 수와 상관없이)
//   AI_DEMO_DAILY_LIMIT     데모(익명) 계정은 종류마다 이만큼까지 (기본 5). 캡차 없이 열려 있는 계정이라 낮게 둔다
//   AI_GLOBAL_DAILY_LIMIT   서비스 전체 (기본 3000). 계정을 마구 만들어 부르는 것까지 막는 마지막 안전장치

export type AiKind = "capture" | "gift" | "import";

export const AI_DEFAULTS = { capture: 40, gift: 60, import: 5, demo: 5, global: 3000 } as const;

const KIND_ENV = { capture: "AI_CAPTURE_DAILY_LIMIT", gift: "AI_GIFT_DAILY_LIMIT", import: "AI_IMPORT_DAILY_LIMIT" } as const;

/** 0 이상의 정수만 받는다(비었거나 이상한 값은 기본값) */
function whole(v: string | undefined, fallback: number): number {
  if (v == null || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export function aiLimits(kind: AiKind, demo: boolean, env: Record<string, string | undefined> = process.env): { user: number; global: number } {
  const kindLimit = whole(env[KIND_ENV[kind]], AI_DEFAULTS[kind]);
  const user = demo ? Math.min(kindLimit, whole(env.AI_DEMO_DAILY_LIMIT, AI_DEFAULTS.demo)) : kindLimit;
  return { user, global: whole(env.AI_GLOBAL_DAILY_LIMIT, AI_DEFAULTS.global) };
}

export type AiGate = "ok" | "user_limit" | "global_limit" | "error";

export function isAiGate(v: unknown): v is AiGate {
  return v === "ok" || v === "user_limit" || v === "global_limit";
}

/** 표·함수가 아직 없다(마이그레이션 0022 전) = 배포와 마이그레이션 사이의 짧은 틈 */
export function isMissingQuotaTable(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return code === "42P01" || code === "42883";
}
