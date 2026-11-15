import { diffDays, type YMD } from "./calendar";
import { METALS, MOVIE_GENRES, MUSIC_GENRES, NONE, NONE_LABEL, PATTERNS, SEASONS, STYLES, type CatalogItem } from "./catalog";
import { emptySection, type CardData, type CultureData, type FavoritesData } from "./card";
import type { Label, Locale } from "./locale";

// 오늘의 질문: 하루 한 문항으로 리드미를 조금씩 채운다. 답은 카드의 한 칸에 바로 들어간다.

export interface QuestionOption {
  value: string;
  label: Label;
}

export interface DailyQuestion {
  id: "drinks" | "flowers" | "scent" | "giftCard" | "spicy" | "season" | "musicGenre" | "movieGenre" | "pattern" | "metal" | "style";
  prompt: Label;
  options: QuestionOption[];
}

/** 좋아하는 것들 질문: 답은 그 칸(배열)에 코드로 더한다. 음악·영화는 문화생활, 계절은 생활과 여행 칸으로 */
const FAVORITE_QUESTION_KEY = {
  pattern: "patterns",
  metal: "metals",
  style: "styles",
} as const satisfies Partial<Record<DailyQuestion["id"], keyof FavoritesData>>;
const CULTURE_QUESTION_KEY = {
  musicGenre: "musicGenres",
  movieGenre: "movieGenres",
} as const satisfies Partial<Record<DailyQuestion["id"], keyof CultureData>>;

/** 첫 칸 '없음'. 고르는 칸이면 코드(none), 글 칸이면 글자(없음)로 저장한다 */
const NONE_OPTION: QuestionOption = { value: NONE, label: NONE_LABEL };

function fromCatalog(list: CatalogItem[], codes: string[]): QuestionOption[] {
  return [NONE_OPTION, ...codes.map((c) => list.find((i) => i.code === c)).filter((i): i is CatalogItem => !!i).map((i) => ({ value: i.code, label: i.label }))];
}

export const QUESTIONS: DailyQuestion[] = [
  {
    id: "drinks",
    prompt: { ko: "요즘 제일 자주 마시는 건?", en: "What do you drink most these days?" },
    options: [
      NONE_OPTION,
      { value: "아메리카노", label: { ko: "아메리카노", en: "Americano" } },
      { value: "라떼", label: { ko: "라떼", en: "Latte" } },
      { value: "차", label: { ko: "차", en: "Tea" } },
      { value: "탄산수", label: { ko: "탄산수", en: "Sparkling water" } },
    ],
  },
  {
    id: "flowers",
    prompt: { ko: "꽃을 받는다면?", en: "If someone gave you flowers?" },
    options: [
      NONE_OPTION,
      { value: "튤립", label: { ko: "튤립", en: "Tulips" } },
      { value: "수국", label: { ko: "수국", en: "Hydrangeas" } },
      { value: "장미", label: { ko: "장미", en: "Roses" } },
    ],
  },
  {
    id: "scent",
    prompt: { ko: "좋아하는 향은?", en: "Which scent do you like?" },
    options: [
      NONE_OPTION,
      { value: "우디", label: { ko: "우디", en: "Woody" } },
      { value: "플로럴", label: { ko: "플로럴", en: "Floral" } },
      { value: "시트러스", label: { ko: "시트러스", en: "Citrus" } },
      { value: "향 없는 게 좋아요", label: { ko: "향 없는 게 좋아요", en: "Unscented" } },
    ],
  },
  {
    id: "giftCard",
    prompt: { ko: "선물로 상품권은 어때요?", en: "How do you feel about gift cards?" },
    options: [
      { value: "yes", label: { ko: "좋아요", en: "Love them" } },
      { value: "no", label: { ko: "별로예요", en: "Rather not" } },
    ],
  },
  {
    id: "spicy",
    prompt: { ko: "매운 음식은 어디까지?", en: "How spicy can you go?" },
    options: [
      { value: "0", label: { ko: "못 먹어요", en: "None" } },
      { value: "2", label: { ko: "보통", en: "Medium" } },
      { value: "3", label: { ko: "좋아요", en: "Hot" } },
      { value: "4", label: { ko: "아주 매워도", en: "Very hot" } },
    ],
  },
  { id: "season", prompt: { ko: "제일 좋아하는 계절은?", en: "Your favorite season?" }, options: fromCatalog(SEASONS, ["spring", "summer", "autumn", "winter"]) },
  { id: "musicGenre", prompt: { ko: "요즘 즐겨 듣는 음악은?", en: "What music are you into?" }, options: fromCatalog(MUSIC_GENRES, ["ballad", "kpop", "hiphop", "indie", "trot"]) },
  { id: "movieGenre", prompt: { ko: "영화를 고른다면?", en: "Pick a movie genre" }, options: fromCatalog(MOVIE_GENRES, ["romance", "comedy", "action", "thriller", "animation"]) },
  { id: "pattern", prompt: { ko: "옷이나 소품, 어떤 무늬가 좋아요?", en: "Which pattern do you like?" }, options: fromCatalog(PATTERNS, ["solid", "stripe", "check", "floral"]) },
  { id: "metal", prompt: { ko: "액세서리는 어떤 색?", en: "Jewelry: which metal?" }, options: fromCatalog(METALS, ["gold", "silver", "rosegold"]) },
  { id: "style", prompt: { ko: "평소 옷 스타일은?", en: "Your everyday style?" }, options: fromCatalog(STYLES, ["minimal", "casual", "classic", "street"]) },
];

/** 이미 답이 있는 질문 */
export function isAnswered(card: Partial<CardData>, id: DailyQuestion["id"]): boolean {
  switch (id) {
    case "drinks":
      return !!card.taste?.drinks;
    case "flowers":
      return !!card.favorites?.flowers;
    case "scent":
      return !!card.favorites?.scent;
    case "giftCard":
      return card.gifts?.giftCard != null;
    case "spicy":
      return card.taste?.spicy != null;
    case "season":
      return !!card.life?.seasons.length;
    case "musicGenre":
    case "movieGenre":
      return !!card.culture?.[CULTURE_QUESTION_KEY[id]]?.length;
    default:
      return !!card.favorites?.[FAVORITE_QUESTION_KEY[id]]?.length;
  }
}

/** 날짜마다 돌아가며 고르되, 이미 답한 건 건너뛴다. 모두 답했으면 null */
export function questionFor(today: YMD, card: Partial<CardData>): DailyQuestion | null {
  const open = QUESTIONS.filter((q) => !isAnswered(card, q.id));
  if (!open.length) return null;
  const index = Math.abs(diffDays({ y: 2026, m: 1, d: 1 }, today)) % open.length;
  return open[index] ?? null;
}

/** 답을 카드 칸에 넣은 결과(바뀐 항목만) */
export function applyAnswer(card: Partial<CardData>, id: DailyQuestion["id"], value: string, locale: Locale = "ko"): Partial<CardData> {
  const v = value.trim().slice(0, 60);
  const text = v === NONE ? NONE_LABEL[locale] : v;
  const add = (list: string[]) => (v === NONE ? [NONE] : list.includes(v) ? list.filter((x) => x !== NONE) : [...list.filter((x) => x !== NONE), v]);
  switch (id) {
    case "drinks":
      return { taste: { ...emptySection("taste"), ...card.taste, drinks: text } };
    case "spicy": {
      const n = Number(v);
      return { taste: { ...emptySection("taste"), ...card.taste, spicy: Number.isInteger(n) && n >= 0 && n <= 4 ? n : null } };
    }
    case "flowers":
    case "scent":
      return { favorites: { ...emptySection("favorites"), ...card.favorites, [id]: text } };
    case "giftCard": {
      const base = { ...emptySection("gifts"), ...card.gifts };
      return { gifts: { ...base, giftCard: v === "yes" ? "yes" : v === "no" ? "no" : null } };
    }
    case "season": {
      const base = { ...emptySection("life"), ...card.life };
      return { life: { ...base, seasons: add(base.seasons) } };
    }
    case "musicGenre":
    case "movieGenre": {
      const key = CULTURE_QUESTION_KEY[id];
      const base = { ...emptySection("culture"), ...card.culture };
      return { culture: { ...base, [key]: add(base[key] ?? []) } };
    }
    default: {
      const key = FAVORITE_QUESTION_KEY[id];
      const base = { ...emptySection("favorites"), ...card.favorites };
      return { favorites: { ...base, [key]: add(base[key] ?? []) } };
    }
  }
}
