import { isValidSpec, type DateSpec } from "./calendar";
import { ALCOHOL_KINDS, ALCOHOL_LEVELS, ALLERGENS, COLORS, DIETS, DISLIKES, METALS, MOVIE_GENRES, MUSIC_GENRES, NONE, PATTERNS, SEASONS, STYLES, codesOf, type Relation } from "./catalog";

// 리드미(카드)는 항목(section) 여덟 개로 나눠 저장한다. 공유도 항목 단위로 허락한다.

export const SECTIONS = ["safety", "taste", "sizes", "gifts", "favorites", "culture", "life", "dates"] as const;
export type Section = (typeof SECTIONS)[number];

/** 내가 고치고 공유를 고를 때 보이는 순서: 챙길 날 → 건강(알레르기) → 자주 쓰는 입맛 → 선물 힌트 → 사이즈 → 있으면 좋은 것(좋아하는 것들 · 문화생활 · 생활과 여행) */
export const SECTIONS_BY_IMPORTANCE = ["dates", "safety", "taste", "gifts", "sizes", "favorites", "culture", "life"] as const satisfies readonly Section[];

/** 관계별로 처음 보여 줄 항목. DB accept_share의 '받으면서 내 것도 보내기' 기본값과 같다 */
export function defaultShareSections(relation: Relation | null): Section[] {
  if (relation === "partner") return [...SECTIONS];
  if (relation === "friend") return ["safety", "taste", "gifts", "favorites", "culture", "life", "dates"];
  return ["safety", "taste", "sizes", "favorites", "culture", "life", "dates"];
}

/** 서버 키로 암호화해서 저장하는 항목 */
export const SENSITIVE_SECTIONS: readonly Section[] = ["safety", "sizes", "dates"];

export function isSection(v: unknown): v is Section {
  return typeof v === "string" && (SECTIONS as readonly string[]).includes(v);
}

export interface SafetyData {
  allergens: string[];
  allergyNote: string;
  dislikes: string[];
  diets: string[];
}

export interface AlcoholData {
  /** none | little | some | lots (ALCOHOL_LEVELS) */
  level: string | null;
  kinds: string[];
}

export interface TasteData {
  likes: string[];
  spicy: number | null;
  /** 좋아하는 디저트·간식(예전 생활과 여행) */
  dessert: string;
  drinks: string;
  alcohol: AlcoholData;
}

export interface SizesData {
  top: string;
  bottom: string;
  shoe: number | null;
  ring: number | null;
}

export interface WishItem {
  title: string;
  url: string;
}

export interface GiftsData {
  scent: string;
  flowers: string;
  giftCard: "yes" | "no" | null;
  wishlist: WishItem[];
  skip: string[];
  /** 좋아하는 브랜드 */
  brands: string[];
}

/** 좋아하는 것들: 고르는 칸은 코드, 적는 칸은 글 */
export interface FavoritesData {
  /** 좋아하는 색(COLORS 코드, 다섯 개까지). 예전엔 선물 칸에 있었다 */
  colors: string[];
  patterns: string[];
  styles: string[];
  metals: string[];
  /** 최애 연예인·가수 */
  idol: string;
  character: string;
  /** 응원하는 팀 */
  team: string;
  /** 좋아하는 동물(예전 생활과 여행) */
  animal: string;
}

/** 문화생활: 영화·드라마·TV·음악(예전 좋아하는 것들)과 책(예전 생활과 여행) */
export interface CultureData {
  movieGenres: string[];
  /** 인생 영화 */
  movie: string;
  drama: string;
  /** 즐겨 보는 TV·예능·유튜브 */
  shows: string;
  musicGenres: string[];
  song: string;
  /** 좋아하는 책·작가 */
  book: string;
}

/** 생활과 여행: 취미 · 계절 · 가 보고 싶은 곳 */
export interface LifeData {
  /** 취미(예전 선물의 '좋아하는 것·취미'). 예: 등산, 캠핑 */
  hobbies: string[];
  seasons: string[];
  /** 가 보고 싶은 곳 */
  travel: string;
}

export interface Anniversary {
  label: string;
  spec: DateSpec;
}

export interface DatesData {
  birthday: DateSpec | null;
  anniversaries: Anniversary[];
}

export interface CardData {
  safety: SafetyData;
  taste: TasteData;
  sizes: SizesData;
  gifts: GiftsData;
  favorites: FavoritesData;
  culture: CultureData;
  life: LifeData;
  dates: DatesData;
}

export type PartialCard = Partial<CardData>;

export function emptySection<S extends Section>(section: S): CardData[S] {
  const empty: CardData = {
    safety: { allergens: [], allergyNote: "", dislikes: [], diets: [] },
    taste: { likes: [], spicy: null, dessert: "", drinks: "", alcohol: { level: null, kinds: [] } },
    sizes: { top: "", bottom: "", shoe: null, ring: null },
    gifts: { scent: "", flowers: "", giftCard: null, wishlist: [], skip: [], brands: [] },
    favorites: {
      colors: [],
      patterns: [],
      styles: [],
      metals: [],
      idol: "",
      character: "",
      team: "",
      animal: "",
    },
    culture: { movieGenres: [], movie: "", drama: "", shows: "", musicGenres: [], song: "", book: "" },
    life: { hobbies: [], seasons: [], travel: "" },
    dates: { birthday: null, anniversaries: [] },
  };
  return structuredClone(empty[section]);
}

export function emptyCard(): CardData {
  return {
    safety: emptySection("safety"),
    taste: emptySection("taste"),
    sizes: emptySection("sizes"),
    gifts: emptySection("gifts"),
    favorites: emptySection("favorites"),
    culture: emptySection("culture"),
    life: emptySection("life"),
    dates: emptySection("dates"),
  };
}

const TEXT_MAX = 120;
const NOTE_MAX = 400;
const LIST_MAX = 20;

function text(v: unknown, max = TEXT_MAX): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function textList(v: unknown, maxItems = LIST_MAX): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n、，]/) : [];
  const out: string[] = [];
  for (const item of raw) {
    const s = text(item, 60);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function codeList(v: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((c): c is string => typeof c === "string" && allowed.has(c)))];
}

/** '없음'도 받는 칸. 없음만 있으면 ["none"], 다른 것과 섞이면 다른 것만 */
function noneableList(v: unknown, allowed: Set<string>): string[] {
  const all = codeList(v, new Set([...allowed, NONE]));
  const real = all.filter((c) => c !== NONE);
  return real.length ? real : all.includes(NONE) ? [NONE] : [];
}

function intIn(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

/** http(s) 주소만 남긴다(javascript: 같은 주소로 위시리스트 링크를 심지 못하게) */
export function safeUrl(v: unknown): string {
  const s = text(v, 500);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function spec(v: unknown): DateSpec | null {
  if (!isValidSpec(v)) return null;
  const s = v as DateSpec;
  const year = typeof s.year === "number" ? { year: s.year } : {};
  return s.calendar === "lunar" ? { calendar: "lunar", month: s.month, day: s.day, leap: !!s.leap, ...year } : { calendar: "solar", month: s.month, day: s.day, ...year };
}

const ALLERGEN_CODES = codesOf(ALLERGENS);
const DISLIKE_CODES = codesOf(DISLIKES);
const DIET_CODES = codesOf(DIETS);
const COLOR_CODES = codesOf(COLORS);
const ALCOHOL_LEVEL_CODES = codesOf(ALCOHOL_LEVELS);
const ALCOHOL_KIND_CODES = codesOf(ALCOHOL_KINDS);
const FAVORITE_CODES = {
  patterns: codesOf(PATTERNS),
  styles: codesOf(STYLES),
  metals: codesOf(METALS),
};
export const FAVORITE_TEXT_KEYS = ["idol", "character", "team", "animal"] as const;
export const FAVORITE_CODE_KEYS = ["patterns", "styles", "metals"] as const;
const CULTURE_CODES = {
  movieGenres: codesOf(MOVIE_GENRES),
  musicGenres: codesOf(MUSIC_GENRES),
};
export const CULTURE_TEXT_KEYS = ["movie", "drama", "shows", "song", "book"] as const;
export const CULTURE_CODE_KEYS = ["movieGenres", "musicGenres"] as const;
const SEASON_CODES = codesOf(SEASONS);


/** 들어온 값을 항목 모양에 맞춰 정리한다. 모르는 키·코드는 버린다 */
export function sanitizeSection<S extends Section>(section: S, input: unknown): CardData[S] {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  let out: CardData[Section];
  switch (section) {
    case "safety":
      out = {
        allergens: noneableList(o.allergens, ALLERGEN_CODES),
        allergyNote: text(o.allergyNote, NOTE_MAX),
        dislikes: noneableList(o.dislikes, DISLIKE_CODES),
        diets: noneableList(o.diets, DIET_CODES),
      } satisfies SafetyData;
      break;
    case "taste": {
      const a = (o.alcohol && typeof o.alcohol === "object" ? o.alcohol : {}) as Record<string, unknown>;
      const level = typeof a.level === "string" && ALCOHOL_LEVEL_CODES.has(a.level) ? a.level : null;
      out = {
        likes: textList(o.likes),
        spicy: intIn(o.spicy, 0, 4),
        dessert: text(o.dessert),
        drinks: text(o.drinks),
        alcohol: { level, kinds: level === "none" ? [] : codeList(a.kinds, ALCOHOL_KIND_CODES) },
      } satisfies TasteData;
      break;
    }
    case "sizes":
      out = { top: text(o.top, 20), bottom: text(o.bottom, 20), shoe: intIn(o.shoe, 180, 330), ring: intIn(o.ring, 1, 30) } satisfies SizesData;
      break;
    case "gifts": {
      const wishlist = (Array.isArray(o.wishlist) ? o.wishlist : [])
        .map((w) => {
          const r = (w && typeof w === "object" ? w : {}) as Record<string, unknown>;
          return { title: text(r.title, 80), url: safeUrl(r.url) };
        })
        .filter((w) => w.title)
        .slice(0, 10);
      out = {
        scent: text(o.scent),
        flowers: text(o.flowers),
        giftCard: o.giftCard === "yes" || o.giftCard === "no" ? o.giftCard : null,
        wishlist,
        skip: textList(o.skip),
        brands: textList(o.brands, 10),
      } satisfies GiftsData;
      break;
    }
    case "favorites": {
      const f = { colors: codeList(o.colors, COLOR_CODES).slice(0, 5) } as Record<string, unknown>;
      for (const k of FAVORITE_CODE_KEYS) f[k] = noneableList(o[k], FAVORITE_CODES[k]);
      for (const k of FAVORITE_TEXT_KEYS) f[k] = text(o[k]);
      out = f as unknown as FavoritesData;
      break;
    }
    case "culture": {
      const c = {} as Record<string, unknown>;
      for (const k of CULTURE_CODE_KEYS) c[k] = noneableList(o[k], CULTURE_CODES[k]);
      for (const k of CULTURE_TEXT_KEYS) c[k] = text(o[k]);
      out = c as unknown as CultureData;
      break;
    }
    case "life":
      out = { hobbies: textList(o.hobbies), seasons: noneableList(o.seasons, SEASON_CODES), travel: text(o.travel) } satisfies LifeData;
      break;
    case "dates": {
      const anniversaries = (Array.isArray(o.anniversaries) ? o.anniversaries : [])
        .map((a) => {
          const r = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
          const s = spec(r.spec);
          return s ? { label: text(r.label, 40), spec: s } : null;
        })
        .filter((a): a is Anniversary => !!a && !!a.label)
        .slice(0, 10);
      out = { birthday: spec(o.birthday), anniversaries } satisfies DatesData;
      break;
    }
    default:
      throw new Error(`unknown section ${String(section)}`);
  }
  return out as CardData[S];
}

export function isEmptySection(section: Section, data: CardData[Section] | null | undefined): boolean {
  if (!data) return true;
  switch (section) {
    case "safety": {
      const d = data as SafetyData;
      return !d.allergens.length && !d.dislikes.length && !d.diets.length && !d.allergyNote;
    }
    case "taste": {
      const d = data as TasteData;
      return !d.likes.length && d.spicy == null && !d.dessert && !d.drinks && !d.alcohol?.level && !d.alcohol?.kinds.length;
    }
    case "sizes": {
      const d = data as SizesData;
      return !d.top && !d.bottom && d.shoe == null && d.ring == null;
    }
    case "gifts": {
      const d = data as GiftsData;
      return !d.scent && !d.flowers && d.giftCard == null && !d.wishlist.length && !d.skip.length && !d.brands?.length;
    }
    case "dates": {
      const d = data as DatesData;
      return !d.birthday && !d.anniversaries.length;
    }
    case "favorites": {
      const d = data as FavoritesData;
      return !d.colors?.length && FAVORITE_CODE_KEYS.every((k) => !d[k]?.length) && FAVORITE_TEXT_KEYS.every((k) => !d[k]);
    }
    case "culture": {
      const d = data as CultureData;
      return CULTURE_CODE_KEYS.every((k) => !d[k]?.length) && CULTURE_TEXT_KEYS.every((k) => !d[k]);
    }
    case "life": {
      const d = data as LifeData;
      return !d.hobbies.length && !d.seasons.length && !d.travel;
    }
  }
}

/** 관계별로 처음 켜 두는 항목 */
export const RELATION_PRESETS: Record<Relation, Section[]> = {
  partner: ["safety", "taste", "sizes", "gifts", "favorites", "culture", "life", "dates"],
  family: ["safety", "taste", "sizes", "favorites", "culture", "life", "dates"],
  friend: ["safety", "taste", "gifts", "favorites", "culture", "life", "dates"],
};

/** 정해진 순서로, 중복 없이 */
export function sanitizeSections(v: unknown): Section[] {
  const list = Array.isArray(v) ? v : [];
  return SECTIONS.filter((s) => list.includes(s));
}
