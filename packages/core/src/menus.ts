import { ALCOHOL_LEVELS, ALLERGENS, DIETS, DISLIKES, SPICY_LEVELS, labelOf, realCodes } from "./catalog";
import type { PartialCard, Section } from "./card";
import { translate } from "./i18n";
import type { Label, Locale } from "./locale";

// 같이 고르기 > 메뉴 고르기: 고른 사람들의 리드미(알레르기·식단·안 먹는 것·매운맛·좋아하는 음식)로 메뉴를 거른다.
// 메뉴마다 "흔히 들어가는 재료"만 적었다. 가게마다 다르니 화면에는 "주문할 때 말하기"를 같이 보여 준다.

export interface MenuItem {
  code: string;
  label: Label;
  /** 좋아하는 음식과 맞춰 볼 낱말(소문자) */
  keywords: string[];
  /** 흔히 들어가는 알레르기 재료(ALLERGENS 코드) */
  contains: string[];
  /** 안 먹는 것과 겹치는 성질(DISLIKES 코드) */
  traits: string[];
  /** 보통 맵기 0~4 */
  spicy: number;
  /** 채식으로 시킬 수 있는지 */
  veg?: "vegan" | "vegetarian";
}

function menu(code: string, ko: string, en: string, keywords: string[], contains: string[], traits: string[], spicy: number, veg?: MenuItem["veg"]): MenuItem {
  return { code, label: { ko, en }, keywords: keywords.map((k) => k.toLowerCase()), contains, traits, spicy, ...(veg ? { veg } : {}) };
}

export const MENUS: MenuItem[] = [
  menu("beef_bbq", "소고기 구이", "Korean beef BBQ", ["소고기", "한우", "갈비", "고기", "beef", "galbi", "bbq"], ["beef", "soy", "sesame"], [], 0),
  menu("pork_bbq", "삼겹살", "Pork belly BBQ", ["삼겹살", "고기", "돼지", "pork belly", "bbq"], ["pork", "soy", "sesame"], [], 1),
  menu("shabu", "샤브샤브", "Shabu-shabu", ["샤브", "shabu"], ["beef", "wheat", "egg", "soy"], ["mushroom"], 1),
  menu("baeksuk", "백숙·닭한마리", "Chicken soup", ["백숙", "닭한마리", "삼계탕", "chicken soup"], ["chicken"], [], 0),
  menu("bibimbap", "비빔밥·한식 백반", "Bibimbap & Korean set meal", ["비빔밥", "백반", "한식", "bibimbap", "korean"], ["egg", "soy", "sesame"], [], 2, "vegetarian"),
  menu("korean_course", "한정식", "Korean course meal", ["한정식", "한식", "korean"], ["soy", "sesame", "wheat", "fish", "beef"], [], 1),
  menu("sushi", "회·초밥", "Sushi & sashimi", ["회", "초밥", "스시", "사시미", "연어", "sushi", "sashimi", "salmon"], ["fish", "soy", "wheat"], ["raw", "seafood"], 0),
  menu("tonkatsu", "돈가스", "Tonkatsu", ["돈가스", "돈까스", "카츠", "tonkatsu", "katsu"], ["pork", "wheat", "egg", "soy"], [], 0),
  menu("ramen", "라멘", "Ramen", ["라멘", "ramen"], ["pork", "wheat", "egg", "soy", "sesame"], [], 1),
  menu("dumplings", "만두·칼국수", "Dumplings & noodle soup", ["만두", "칼국수", "dumpling"], ["wheat", "pork", "soy", "egg"], [], 0),
  menu("naengmyeon", "냉면", "Cold noodles", ["냉면", "naengmyeon", "cold noodle"], ["buckwheat", "wheat", "beef", "egg"], ["cucumber"], 1),
  menu("pasta", "파스타", "Pasta", ["파스타", "이탈리안", "pasta", "italian"], ["wheat", "milk", "egg"], [], 0, "vegetarian"),
  menu("pizza", "피자", "Pizza", ["피자", "pizza"], ["wheat", "milk", "tomato"], [], 0, "vegetarian"),
  menu("steak", "스테이크", "Steak", ["스테이크", "steak"], ["beef", "milk"], [], 0),
  menu("burger", "버거", "Burgers", ["버거", "햄버거", "burger"], ["beef", "wheat", "egg", "milk", "sesame", "tomato"], [], 0),
  menu("brunch", "브런치", "Brunch", ["브런치", "샌드위치", "brunch", "sandwich"], ["egg", "milk", "wheat"], [], 0, "vegetarian"),
  menu("salad", "샐러드·포케", "Salad & poke", ["샐러드", "포케", "salad", "poke"], ["soy", "sesame"], [], 0, "vegan"),
  menu("curry", "인도 커리", "Indian curry", ["커리", "카레", "인도", "curry", "indian"], ["milk", "wheat", "chicken"], ["cilantro"], 2, "vegetarian"),
  menu("pho", "쌀국수", "Pho", ["쌀국수", "베트남", "pho", "vietnamese"], ["beef", "fish"], ["cilantro", "raw_onion"], 1),
  menu("fried_chicken", "치킨", "Fried chicken", ["치킨", "fried chicken"], ["chicken", "wheat", "soy"], [], 1),
  menu("jokbal", "족발·보쌈", "Jokbal & bossam", ["족발", "보쌈", "jokbal", "bossam"], ["pork", "soy", "shrimp"], [], 1),
  menu("gukbap", "국밥", "Gukbap", ["국밥", "gukbap"], ["pork", "shrimp"], [], 1),
  menu("chinese", "짜장·짬뽕", "Korean-Chinese", ["짜장", "짬뽕", "탕수육", "중식", "chinese"], ["wheat", "soy", "pork", "shrimp", "squid"], ["seafood"], 2),
  menu("tacos", "타코·멕시칸", "Tacos & Mexican", ["타코", "멕시칸", "부리또", "taco", "mexican", "burrito"], ["wheat", "beef", "milk", "tomato"], ["cilantro", "raw_onion"], 2),
  menu("gopchang", "곱창·막창", "Grilled tripe", ["곱창", "막창", "대창", "gopchang", "tripe"], ["beef", "soy"], ["offal"], 2),
  menu("lamb", "양꼬치", "Lamb skewers", ["양꼬치", "양고기", "lamb"], [], ["lamb", "cilantro"], 2),
  menu("dakgalbi", "닭갈비", "Dakgalbi", ["닭갈비", "dakgalbi"], ["chicken", "soy", "wheat"], [], 3),
  menu("tteokbokki", "떡볶이·분식", "Tteokbokki & snacks", ["떡볶이", "분식", "김밥", "tteokbokki"], ["wheat", "soy", "fish", "egg"], [], 3),
  menu("sundubu", "순두부찌개", "Soft tofu stew", ["순두부", "찌개", "tofu stew"], ["soy", "shellfish", "egg"], ["seafood"], 3),
  menu("seafood_stew", "해물찜·해물탕", "Spicy seafood stew", ["해물", "아귀찜", "seafood"], ["shrimp", "crab", "shellfish", "squid", "fish"], ["seafood", "oyster"], 3),
  menu("malatang", "마라탕·훠궈", "Mala hot pot", ["마라", "마라탕", "훠궈", "mala", "hot pot"], ["wheat", "soy", "peanut", "sesame", "beef"], ["cilantro", "lamb", "mushroom"], 4),
];

/** 같이 먹는 사람 한 명: 볼 수 있는 항목만 쓴다 */
export interface Diner {
  key: string;
  name: string;
  card: PartialCard;
  sections: readonly Section[];
}

function part<S extends Section>(d: Diner, s: S): PartialCard[S] | undefined {
  return d.sections.includes(s) ? d.card[s] : undefined;
}

export interface WhoCode {
  code: string;
  who: string[];
}

/** 고른 사람들을 한데 모은 요약 */
export interface MealBrief {
  allergens: WhoCode[];
  dislikes: WhoCode[];
  diets: WhoCode[];
  /** 가장 순한 사람 기준 매운맛과 그 사람들 */
  spicy: { level: number; who: string[] } | null;
  likes: { who: string; items: string[] }[];
  alcohol: { who: string; level: string; kinds: string[] }[];
}

function collect(list: WhoCode[], code: string, who: string) {
  const hit = list.find((x) => x.code === code);
  if (hit) {
    if (!hit.who.includes(who)) hit.who.push(who);
  } else list.push({ code, who: [who] });
}

export function mealBrief(diners: Diner[]): MealBrief {
  const brief: MealBrief = { allergens: [], dislikes: [], diets: [], spicy: null, likes: [], alcohol: [] };
  for (const d of diners) {
    const safety = part(d, "safety");
    const taste = part(d, "taste");
    // '없음'은 거를 것이 없다는 뜻이라 모으지 않는다
    for (const c of realCodes(safety?.allergens)) collect(brief.allergens, c, d.name);
    for (const c of realCodes(safety?.dislikes)) collect(brief.dislikes, c, d.name);
    for (const c of realCodes(safety?.diets)) collect(brief.diets, c, d.name);
    if (taste?.spicy != null) {
      if (!brief.spicy || taste.spicy < brief.spicy.level) brief.spicy = { level: taste.spicy, who: [d.name] };
      else if (taste.spicy === brief.spicy.level) brief.spicy.who.push(d.name);
    }
    if (taste?.likes.length) brief.likes.push({ who: d.name, items: taste.likes });
    if (taste?.alcohol?.level) brief.alcohol.push({ who: d.name, level: taste.alcohol.level, kinds: taste.alcohol.kinds });
  }
  return brief;
}

export type MenuReason = { kind: "allergy" | "diet" | "dislike" | "spicy"; code: string; who: string[] };

export interface MenuVerdict {
  item: MenuItem;
  /** ok: 다 같이 먹을 수 있어요, soft: 아쉬운 메뉴(안 먹는 것·너무 매움), avoid: 피해야 해요(알레르기·식단) */
  status: "ok" | "soft" | "avoid";
  likedBy: string[];
  reasons: MenuReason[];
  /** 덜 맵게 시키면 되는 메뉴 */
  milder: boolean;
}

function dietBlocks(diet: string, item: MenuItem): boolean {
  switch (diet) {
    case "vegan":
      return item.veg !== "vegan";
    case "vegetarian":
      return !item.veg;
    case "halal":
      return item.contains.includes("pork");
    case "kosher":
      return ["pork", "shellfish", "shrimp", "crab", "squid"].some((c) => item.contains.includes(c));
    case "gluten_free":
      return item.contains.includes("wheat");
    default:
      return false;
  }
}

/** 메뉴마다: 피해야 할 이유, 아쉬운 이유, 좋아하는 사람. 다 같이 먹을 수 있고 좋아하는 사람이 많은 순서로 */
export function judgeMenus(diners: Diner[], menus: MenuItem[] = MENUS): MenuVerdict[] {
  const brief = mealBrief(diners);
  const verdicts = menus.map((item, order) => {
    const reasons: MenuReason[] = [];
    for (const a of brief.allergens) if (item.contains.includes(a.code)) reasons.push({ kind: "allergy", code: a.code, who: a.who });
    for (const d of brief.diets) if (dietBlocks(d.code, item)) reasons.push({ kind: "diet", code: d.code, who: d.who });
    for (const d of brief.dislikes) if (item.traits.includes(d.code)) reasons.push({ kind: "dislike", code: d.code, who: d.who });
    let milder = false;
    if (brief.spicy && item.spicy > brief.spicy.level) {
      if (item.spicy - brief.spicy.level >= 3) reasons.push({ kind: "spicy", code: String(brief.spicy.level), who: brief.spicy.who });
      else milder = true;
    }
    const likedBy = brief.likes.filter((l) => l.items.some((like) => item.keywords.some((k) => like.toLowerCase().includes(k)))).map((l) => l.who);
    const status: MenuVerdict["status"] = reasons.some((r) => r.kind === "allergy" || r.kind === "diet") ? "avoid" : reasons.length ? "soft" : "ok";
    return { item, status, likedBy, reasons, milder, order };
  });
  const rank = { ok: 0, soft: 1, avoid: 2 } as const;
  return verdicts
    .sort((a, b) => rank[a.status] - rank[b.status] || b.likedBy.length - a.likedBy.length || Number(a.milder) - Number(b.milder) || a.order - b.order)
    .map(({ order: _order, ...v }) => v);
}

function who(names: string[], withNames: boolean): string {
  return withNames && names.length ? `(${names.join(", ")})` : "";
}

/** 식당에 말할 것: "새우, 게는 빼 주세요(알레르기). 고수도 빼 주세요." 이름은 넣지 않는다 */
export function orderNote(brief: MealBrief, locale: Locale): string {
  const parts: string[] = [];
  if (brief.allergens.length) parts.push(translate(locale, "plan.orderAllergy", { items: brief.allergens.map((a) => labelOf(ALLERGENS, a.code, locale)).join(", ") }));
  if (brief.dislikes.length) parts.push(translate(locale, "plan.orderDislike", { items: brief.dislikes.map((a) => labelOf(DISLIKES, a.code, locale)).join(", ") }));
  if (brief.spicy && brief.spicy.level <= 1) parts.push(translate(locale, "plan.orderMild"));
  return parts.join(" ");
}

/** 같이 가는 사람(예: 예약하는 사람)에게 보낼 메모. 이름은 고를 때만 넣는다 */
export function groupMemo(brief: MealBrief, locale: Locale, withNames = false): string {
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate(locale, k, v);
  const line = (label: string, items: WhoCode[], list: { code: string; label: Label }[]) =>
    items.length ? `· ${label}: ${items.map((x) => `${labelOf(list, x.code, locale)}${who(x.who, withNames)}`).join(", ")}` : "";
  const lines = [
    t("plan.memoTitle"),
    line(t("plan.allergy"), brief.allergens, ALLERGENS),
    line(t("plan.dislike"), brief.dislikes, DISLIKES),
    line(t("plan.diet"), brief.diets, DIETS),
    brief.spicy ? `· ${t("plan.spicy")}: ${t("plan.spicyUpTo", { level: SPICY_LEVELS[brief.spicy.level]?.[locale] ?? "" })}${who(brief.spicy.who, withNames)}` : "",
    brief.alcohol.some((a) => a.level === "none")
      ? `· ${t("plan.alcohol")}: ${t("plan.someoneSober")}${who(
          brief.alcohol.filter((a) => a.level === "none").map((a) => a.who),
          withNames,
        )}`
      : "",
  ].filter(Boolean);
  return lines.length > 1 ? lines.join("\n") : `${lines[0]}\n${t("plan.memoNothing")}`;
}

export function alcoholLabel(level: string, locale: Locale): string {
  return labelOf(ALCOHOL_LEVELS, level, locale);
}
