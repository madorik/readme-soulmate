/** uuid 모양인지(8-4-4-4-12). DB에 넘기기 전에 거르면 `$1::uuid`로 인덱스를 쓰면서도 이상한 글이 오류(500)가 되지 않는다 */
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
