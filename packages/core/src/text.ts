// 사람이 쓴 글을 저장 길이에 맞게 자른다. 글자 반쪽(이모지 한가운데)을 남기면 Postgres jsonb가 저장을 거절하므로 UTF-16 칸이 아니라 글자(코드 포인트) 단위로 자른다.

const LONE_SURROGATE = /[\ud800-\udfff]/;

/** 앞에서 max 글자까지. 짝 없는 서로게이트(깨진 이모지 반쪽)는 버린다 */
export function clip(value: string, max: number): string {
  if (max <= 0) return "";
  // 대부분의 글은 짧고 멀쩡하다
  if (value.length <= max && !LONE_SURROGATE.test(value)) return value;
  const out: string[] = [];
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) continue;
    if (out.length >= max) break;
    out.push(ch);
  }
  return out.join("");
}
