// 부름말 맞추기: "와이프"와 "아내", "엄마"와 "어머니"는 같은 사람을 가리킨다.
// 말로 적기에서 AI가 새 사람("와이프")이라고 답해도, 이미 같은 말("아내")로 적어 둔 사람이 있으면 그 사람에게 합치려는 용도.
// 가족·연인 부름말만 다루고, 그 밖의 이름(김민수…)은 글자가 똑같을 때만 같은 것으로 본다.

/** 같은 사람을 가리키는 말 묶음. 한 말이 여러 묶음에 들어갈 수 있다(배우자는 아내도 남편도 가리킨다) */
const GROUPS: readonly (readonly string[])[] = [
  // 배우자·연인
  ["아내", "와이프", "부인", "집사람", "안사람", "마누라", "배우자", "wife", "wifey", "spouse"],
  ["남편", "신랑", "배우자", "husband", "hubby", "spouse"],
  ["여자친구", "여친", "애인", "연인", "girlfriend", "gf"],
  ["남자친구", "남친", "애인", "연인", "boyfriend", "bf"],
  // 부모
  ["엄마", "어머니", "모친", "mom", "mum", "mother", "mommy", "mama"],
  ["아빠", "아버지", "부친", "dad", "father", "daddy", "papa"],
  // 조부모: 외가·친가는 서로 다른 분이라 따로 둔다
  ["할머니", "할머님", "조모", "할매", "grandma", "grandmother", "granny", "nana"],
  ["외할머니", "외조모", "외할매", "maternalgrandmother", "maternalgrandma"],
  ["친할머니", "친조모", "친할매", "paternalgrandmother", "paternalgrandma"],
  ["할아버지", "할아버님", "조부", "할배", "grandpa", "grandfather", "granddad", "grandad"],
  ["외할아버지", "외조부", "외할배", "maternalgrandfather", "maternalgrandpa"],
  ["친할아버지", "친조부", "친할배", "paternalgrandfather", "paternalgrandpa"],
  // 자녀
  ["아들", "아드님", "son"],
  ["딸", "따님", "daughter"],
  // 형제자매: 말하는 사람의 성별마다 부르는 말이 달라 따로 둔다
  ["형", "형님", "olderbrother", "bigbrother"],
  ["오빠", "olderbrother", "bigbrother"],
  ["누나", "누님", "oldersister", "bigsister"],
  ["언니", "oldersister", "bigsister"],
  ["남동생", "동생", "youngerbrother", "littlebrother"],
  ["여동생", "동생", "youngersister", "littlesister"],
  ["동생", "youngersibling"],
  ["brother", "bro"],
  ["sister", "sis"],
  // 사돈: 아내 쪽(장)과 남편 쪽(시)은 따로, 영어는 어느 쪽이든 한 말이다
  ["장모", "처모", "motherinlaw"],
  ["시어머니", "시어머님", "시모", "motherinlaw"],
  ["장인", "장인어른", "장인어르신", "처부", "fatherinlaw"],
  ["시아버지", "시아버님", "시부", "fatherinlaw"],
];

/** 비교용으로 다듬기: 모양을 맞추고 소문자로, 띄어쓰기·붙임표·점을 없앤다 */
function norm(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[\s\-_.·ㆍ]+/g, "");
}

const INDEX = (() => {
  const map = new Map<string, number[]>();
  GROUPS.forEach((words, i) => {
    for (const w of words) map.set(w, [...(map.get(w) ?? []), i]);
  });
  return map;
})();

/** 말이 속한 묶음들. 사전에 없으면 존칭 '님'을 뗀 말로 한 번 더 찾는다("장모님" → "장모"). 이름("민수님")은 사전에 없으니 건드리지 않는다 */
function groupsOf(key: string): number[] {
  return INDEX.get(key) ?? (key.length > 1 && key.endsWith("님") ? INDEX.get(key.slice(0, -1)) : undefined) ?? [];
}

/** 같은 사람을 가리키는 부름말인지: 글자가 같거나(띄어쓰기·대소문자 무시), 같은 묶음에 든 말이면 true */
export function sameRelation(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const gy = groupsOf(y);
  return groupsOf(x).some((g) => gy.includes(g));
}

/**
 * items 중 이름 중 하나가 name과 같은 부름말인 것. 딱 하나일 때만 돌려준다
 * (두 명 이상이면 누구인지 알 수 없어 합치지 않는다. 예: 장모와 시어머니가 다 있는데 "mother-in-law")
 */
export function findByRelation<T>(items: readonly T[], name: string, namesOf: (item: T) => readonly string[]): T | null {
  const hits = items.filter((item) => namesOf(item).some((n) => sameRelation(n, name)));
  return hits.length === 1 ? hits[0]! : null;
}
