// FCM(HTTP v1) 응답 해석(순수 함수)

type Detail = { errorCode?: unknown; fieldViolations?: { field?: unknown }[] };

/**
 * 이 기기 토큰이 더는 못 쓰는 것이라고 FCM이 말한 응답인지.
 * 404(UNREGISTERED)이거나, 400인데 오류 상세가 UNREGISTERED이거나 '등록 토큰'이 틀렸다고 짚은 INVALID_ARGUMENT일 때만 true.
 * 그 밖의 400(알림 내용·데이터 모양 오류 등)은 토큰이 멀쩡한 것이니 지우면 안 된다
 */
export function fcmTokenGone(status: number, body: unknown): boolean {
  if (status === 404) return true;
  if (status !== 400) return false;
  const error = (body as { error?: { message?: unknown; details?: unknown } } | null)?.error;
  const details = Array.isArray(error?.details) ? (error.details as Detail[]) : [];
  if (details.some((d) => d?.errorCode === "UNREGISTERED")) return true;
  if (!details.some((d) => d?.errorCode === "INVALID_ARGUMENT")) return false;
  // 어느 칸이 틀렸는지가 토큰(message.token)이거나, 메시지가 등록 토큰을 말할 때만
  const onToken = details.some((d) => Array.isArray(d?.fieldViolations) && d.fieldViolations.some((f) => typeof f?.field === "string" && /(^|\.)token$/.test(f.field)));
  return onToken || (typeof error?.message === "string" && /registration token/i.test(error.message));
}
