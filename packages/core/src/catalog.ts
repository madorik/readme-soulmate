import type { Label, Locale } from "./locale";

// 카드에 고르는 항목 사전. 데이터에는 코드만 저장하고, 화면에서 보는 사람 언어로 이름을 붙인다.
// 그래서 한국어로 쓴 카드를 영어 사용자가 열어도 영어로 보인다.

export interface CatalogItem {
  code: string;
  label: Label;
}

function item(code: string, ko: string, en: string): CatalogItem {
  return { code, label: { ko, en } };
}

/**
 * 알레르기. 한국 식약처 알레르기 표시 대상과 미국 주요 9종을 합쳤다.
 * 화면에는 언어별 "자주 고르는" 순서(ALLERGEN_ORDER)로 앞의 몇 개만 먼저 보이고 나머지는 "그 밖에"로 펼친다.
 */
export const ALLERGENS: CatalogItem[] = [
  item("shrimp", "새우", "Shrimp"),
  item("crab", "게", "Crab"),
  item("peanut", "땅콩", "Peanut"),
  item("milk", "우유", "Milk"),
  item("egg", "달걀", "Egg"),
  item("wheat", "밀", "Wheat"),
  item("soy", "대두", "Soy"),
  item("peach", "복숭아", "Peach"),
  item("tree_nut", "견과류", "Tree nuts"),
  item("walnut", "호두", "Walnut"),
  item("pine_nut", "잣", "Pine nut"),
  item("buckwheat", "메밀", "Buckwheat"),
  item("shellfish", "조개류", "Shellfish"),
  item("fish", "생선", "Fish"),
  item("mackerel", "고등어", "Mackerel"),
  item("squid", "오징어", "Squid"),
  item("sesame", "참깨", "Sesame"),
  item("tomato", "토마토", "Tomato"),
  item("pork", "돼지고기", "Pork"),
  item("beef", "쇠고기", "Beef"),
  item("chicken", "닭고기", "Chicken"),
  item("sulfite", "아황산류", "Sulfites"),
];

export const ALLERGEN_ORDER: Record<Locale, string[]> = {
  ko: ["shrimp", "crab", "peanut", "milk", "egg", "wheat", "peach"],
  en: ["peanut", "tree_nut", "milk", "egg", "shellfish", "wheat", "sesame"],
};

/** 못 먹거나 싫어하는 것 */
export const DISLIKES: CatalogItem[] = [
  item("cilantro", "고수", "Cilantro"),
  item("cucumber", "오이", "Cucumber"),
  item("raw", "날것", "Raw fish"),
  item("offal", "내장", "Offal"),
  item("eggplant", "가지", "Eggplant"),
  item("oyster", "굴", "Oysters"),
  item("lamb", "양고기", "Lamb"),
  item("mint_choco", "민트초코", "Mint chocolate"),
  item("mushroom", "버섯", "Mushrooms"),
  item("olive", "올리브", "Olives"),
  item("raw_onion", "생양파", "Raw onion"),
  item("seafood", "해산물", "Seafood"),
];

export const DISLIKE_ORDER: Record<Locale, string[]> = {
  ko: ["cilantro", "cucumber", "raw", "offal", "eggplant", "oyster", "lamb", "mint_choco"],
  en: ["cilantro", "mushroom", "olive", "raw", "seafood", "eggplant", "lamb", "raw_onion"],
};

/** 식단 */
export const DIETS: CatalogItem[] = [
  item("vegetarian", "채식", "Vegetarian"),
  item("vegan", "비건", "Vegan"),
  item("halal", "할랄", "Halal"),
  item("kosher", "코셔", "Kosher"),
  item("gluten_free", "글루텐 프리", "Gluten-free"),
  item("no_alcohol", "술 안 마셔요", "No alcohol"),
];

/** 술: 얼마나 마시는지 */
export const ALCOHOL_LEVELS: CatalogItem[] = [
  item("none", "안 마셔요", "Doesn't drink"),
  item("little", "한두 잔", "A glass or two"),
  item("some", "분위기 맞춰", "Socially"),
  item("lots", "잘 마셔요", "Enjoys a drink"),
];

/** 술: 좋아하는 종류 */
export const ALCOHOL_KINDS: CatalogItem[] = [
  item("soju", "소주", "Soju"),
  item("beer", "맥주", "Beer"),
  item("wine", "와인", "Wine"),
  item("makgeolli", "막걸리", "Makgeolli"),
  item("whisky", "위스키", "Whisky"),
  item("highball", "하이볼", "Highball"),
  item("cocktail", "칵테일", "Cocktails"),
  item("sake", "사케", "Sake"),
];

/** 좋아하는 것들: 무늬 */
export const PATTERNS: CatalogItem[] = [
  item("solid", "무지", "Solid"),
  item("stripe", "스트라이프", "Stripes"),
  item("check", "체크", "Check"),
  item("dot", "도트", "Polka dots"),
  item("floral", "플라워", "Floral"),
  item("animal", "애니멀", "Animal print"),
];

/** 좋아하는 것들: 옷 스타일 */
export const STYLES: CatalogItem[] = [
  item("minimal", "미니멀", "Minimal"),
  item("casual", "캐주얼", "Casual"),
  item("classic", "클래식", "Classic"),
  item("street", "스트릿", "Street"),
  item("lovely", "러블리", "Lovely"),
];

/** 좋아하는 것들: 액세서리 색 */
export const METALS: CatalogItem[] = [
  item("gold", "골드", "Gold"),
  item("silver", "실버", "Silver"),
  item("rosegold", "로즈골드", "Rose gold"),
];

/** 좋아하는 것들: 영화 장르 */
export const MOVIE_GENRES: CatalogItem[] = [
  item("romance", "로맨스", "Romance"),
  item("comedy", "코미디", "Comedy"),
  item("action", "액션", "Action"),
  item("thriller", "스릴러", "Thriller"),
  item("horror", "공포", "Horror"),
  item("animation", "애니메이션", "Animation"),
  item("sf", "SF·판타지", "Sci-fi & fantasy"),
  item("documentary", "다큐", "Documentary"),
];

/** 좋아하는 것들: 음악 장르 */
export const MUSIC_GENRES: CatalogItem[] = [
  item("ballad", "발라드", "Ballads"),
  item("kpop", "K팝", "K-pop"),
  item("hiphop", "힙합", "Hip-hop"),
  item("rnb", "R&B", "R&B"),
  item("indie", "인디", "Indie"),
  item("rock", "록", "Rock"),
  item("jazz", "재즈", "Jazz"),
  item("classical", "클래식", "Classical"),
  item("trot", "트로트", "Trot"),
];

/** 좋아하는 것들: 계절 */
export const SEASONS: CatalogItem[] = [
  item("spring", "봄", "Spring"),
  item("summer", "여름", "Summer"),
  item("autumn", "가을", "Fall"),
  item("winter", "겨울", "Winter"),
];

/** 매운맛 0~4 */
export const SPICY_LEVELS: Label[] = [
  { ko: "안 매운 것만", en: "No spice" },
  { ko: "살짝 매운 정도", en: "A little" },
  { ko: "보통 매운맛", en: "Medium" },
  { ko: "매운 거 좋아요", en: "Loves it hot" },
  { ko: "아주 매워도 좋아요", en: "The hotter the better" },
];

/** 좋아하는 색 */
export const COLORS: (CatalogItem & { hex: string })[] = [
  { ...item("black", "검정", "Black"), hex: "#1F1D2B" },
  { ...item("white", "흰색", "White"), hex: "#FFFFFF" },
  { ...item("cream", "크림", "Cream"), hex: "#F2E8D5" },
  { ...item("beige", "베이지", "Beige"), hex: "#D8C3A5" },
  { ...item("gray", "회색", "Gray"), hex: "#9A98A3" },
  { ...item("navy", "남색", "Navy"), hex: "#16224A" },
  { ...item("blue", "파랑", "Blue"), hex: "#2A62D9" },
  { ...item("sky", "하늘색", "Sky blue"), hex: "#9CC3F0" },
  { ...item("sage", "세이지", "Sage"), hex: "#9CB59A" },
  { ...item("green", "초록", "Green"), hex: "#1E8C5A" },
  { ...item("yellow", "노랑", "Yellow"), hex: "#FFD23F" },
  { ...item("pink", "분홍", "Pink"), hex: "#F4A7B9" },
  { ...item("red", "빨강", "Red"), hex: "#E8352C" },
  { ...item("burgundy", "버건디", "Burgundy"), hex: "#7A2234" },
  { ...item("purple", "보라", "Purple"), hex: "#7D5BA6" },
  { ...item("brown", "갈색", "Brown"), hex: "#6B3F2A" },
];

export type Relation = "partner" | "family" | "friend";
export const RELATIONS: { code: Relation; label: Label }[] = [
  { code: "partner", label: { ko: "배우자나 애인", en: "Partner" } },
  { code: "family", label: { ko: "가족", en: "Family" } },
  { code: "friend", label: { ko: "친한 친구", en: "Close friend" } },
];

export function isRelation(v: unknown): v is Relation {
  return v === "partner" || v === "family" || v === "friend";
}

export function labelOf(list: CatalogItem[], code: string, locale: Locale): string {
  return list.find((i) => i.code === code)?.label[locale] ?? code;
}

export function codesOf(list: CatalogItem[]): Set<string> {
  return new Set(list.map((i) => i.code));
}

/** 언어별 순서대로 앞에 보일 것과 나머지 */
export function ordered(list: CatalogItem[], order: string[]): { first: CatalogItem[]; rest: CatalogItem[] } {
  const first = order.map((c) => list.find((i) => i.code === c)).filter((i): i is CatalogItem => !!i);
  const rest = list.filter((i) => !order.includes(i.code));
  return { first, rest };
}
