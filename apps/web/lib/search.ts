// 사람 찾기(사람들 화면·폴더에 사람 넣기). 서버·화면이 같이 쓴다.
// 이름·태그(부르는 말)에서 찾는다. 띄어쓰기·대소문자는 보지 않고, 초성만 적어도 찾는다(ㄱㄱㅈ → 김 과장님)

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/** 한글 음절은 초성으로, 나머지는 그대로 */
function initials(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    out += c >= 0xac00 && c <= 0xd7a3 ? CHO[Math.floor((c - 0xac00) / 588)] : ch;
  }
  return out;
}

export function matchesPerson(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = norm(query);
  if (!q) return true;
  const text = norm(fields.filter(Boolean).join(" "));
  if (text.includes(q)) return true;
  return /^[ㄱ-ㅎ]+$/.test(q) && initials(text).includes(q);
}
