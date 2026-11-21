import { NONE } from "./catalog";
import { emptySection, isEmptySection, isSection, sanitizeSection, type PartialCard, type Section } from "./card";

// 받은 기록(링크로 온 사람의 기록)을 내 사람에 합치는 규칙. 순수 함수라 시험에서 바로 돌린다.
//  - keep: 이미 적어 둔 값은 그대로 두고, 빈 칸만 받은 값으로 채운다. 목록(좋아하는 것·알레르기 …)은 있던 것은 두고 없던 것만 더한다
//  - overwrite: 받은 값이 있는 칸은 받은 값으로 바꾼다(목록도 통째로). 받은 쪽이 빈 칸이면 있던 값을 지우지 않는다

export type MergeMode = "keep" | "overwrite";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** 값이 비었나: 없음·빈 글·빈 목록·false(안 켠 스위치). 숫자 0이나 날짜 같은 객체는 비지 않았다 */
function blank(v: unknown): boolean {
  if (v == null || v === false) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** 목록의 같은 항목을 알아보는 열쇠(글이면 그 글, 위시·기념일·반려동물은 이름) */
function itemKey(field: string, x: unknown): string {
  if (typeof x === "string") return x.trim().toLowerCase();
  if (isObj(x)) {
    if (field === "wishlist") return String(x.title ?? "").trim().toLowerCase();
    if (field === "anniversaries") return `${String(x.label ?? "").trim().toLowerCase()}|${JSON.stringify(x.spec)}`;
    if (field === "pets") return `${String(x.name ?? "").trim().toLowerCase()}|${String(x.kind ?? "")}`;
  }
  return JSON.stringify(x);
}

function mergeObj(cur: Obj, inc: Obj, mode: MergeMode): Obj {
  const out: Obj = { ...cur };
  for (const [k, iv] of Object.entries(inc)) {
    if (blank(iv)) continue; // 받은 쪽의 빈 칸은 있던 값을 지우지 않는다
    const cv = out[k];
    if (k === "alcohol" && isObj(iv) && isObj(cv)) {
      out[k] = mergeObj(cv, iv, mode);
    } else if (Array.isArray(iv)) {
      if (mode === "overwrite" || blank(cv)) out[k] = iv;
      else {
        const have = new Set((cv as unknown[]).map((x) => itemKey(k, x)));
        out[k] = [...(cv as unknown[]), ...iv.filter((x) => !have.has(itemKey(k, x)))];
      }
    } else {
      out[k] = mode === "overwrite" || blank(cv) ? iv : cv;
    }
  }
  return out;
}

function mergeSection(section: Section, cur: unknown, inc: unknown, mode: MergeMode): unknown {
  const merged = mergeObj((isObj(cur) ? cur : emptySection(section)) as Obj, (isObj(inc) ? inc : {}) as Obj, mode);
  if (section === "safety" && Array.isArray(merged.allergens)) {
    // '알레르기 없음'은 다른 알레르기와 같이 있을 수 없다(있으면 알레르기가 이긴다)
    const real = (merged.allergens as string[]).filter((x) => x !== NONE);
    if (real.length) merged.allergens = real;
  }
  if (section === "pets" && Array.isArray(merged.pets) && merged.pets.length) merged.none = false;
  return merged;
}

/**
 * 내 사람의 기록(existing)에 받은 기록(incoming)을 합친다. 받은 기록에 있는 항목만 건드리고 나머지 항목은 그대로.
 * changed: 값이 달라진 항목(저장할 것)
 */
export function mergeCards(existing: PartialCard, incoming: PartialCard, mode: MergeMode): { card: PartialCard; changed: Section[] } {
  const card: PartialCard = { ...existing };
  const changed: Section[] = [];
  for (const [section, value] of Object.entries(incoming)) {
    if (!isSection(section) || isEmptySection(section, value as never)) continue;
    const next = sanitizeSection(section, mergeSection(section, (existing as Obj)[section], value, mode));
    if (JSON.stringify(next) !== JSON.stringify((existing as Obj)[section] ?? null)) changed.push(section);
    (card as Obj)[section] = next;
  }
  return { card, changed };
}

/** 유지와 덮어쓰기의 결과가 다른가(= 사람에게 '유지할까요, 덮어쓸까요'를 물어야 하나) */
export function mergeDiffers(existing: PartialCard, incoming: PartialCard): boolean {
  return JSON.stringify(mergeCards(existing, incoming, "keep").card) !== JSON.stringify(mergeCards(existing, incoming, "overwrite").card);
}

/** 보낼 기록: 고른 항목 중 적어 둔 것만(깨끗이 정리해서) */
export function pickSections(card: PartialCard, sections: readonly Section[]): PartialCard {
  const out: PartialCard = {};
  for (const section of sections) {
    const value = (card as Obj)[section];
    if (value == null) continue;
    const clean = sanitizeSection(section, value);
    if (!isEmptySection(section, clean as never)) (out as Obj)[section] = clean;
  }
  return out;
}
