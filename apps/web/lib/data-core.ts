// 저장 값 검사(서버 전용 모듈을 들이지 않는 순수 함수)

/**
 * 저장된 값이 암호화본(enc)인데 지금 키로 풀 수 없는지.
 * 키가 다른 환경에서 이 값을 새 값으로 덮으면 진짜 기록이 영영 사라지니, 덮기 전에 이걸로 막는다.
 * 암호문 모양이 아닌 값(평문 data, 깨진 모양)은 어느 키로도 못 푸는 값이라 덮어도 된다
 */
export function isLockedPayload(payload: unknown, tryOpen: (payload: unknown) => unknown | null): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (p.v !== 1 || typeof p.enc !== "string") return false;
  // iv 12 + 태그 16 + 최소 1바이트가 안 되면 암호문이 아니다(crypto-core의 openWith와 같은 기준)
  if (Buffer.from(p.enc, "base64").length < 29) return false;
  return tryOpen(payload) == null;
}

/** 한 사람이 가질 수 있는 수(넉넉하게. 넘으면 더하기가 조용히 막힌다) */
export const LIMITS = { people: 500, folders: 50, notes: 200 } as const;
