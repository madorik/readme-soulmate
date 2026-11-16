// 정리 규칙 값(서버 전용 아님: 시험에서 바로)

export const KEEP_DAYS_DEFAULT = 180;

/** 이용 기록을 원래대로 두는 날 수: APP_EVENTS_KEEP_DAYS가 90 이상의 정수일 때만, 아니면 180(90일 범위 통계·8주 리텐션을 지킨다) */
export function keepDays(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.APP_EVENTS_KEEP_DAYS);
  return Number.isInteger(n) && n >= 90 ? n : KEEP_DAYS_DEFAULT;
}
