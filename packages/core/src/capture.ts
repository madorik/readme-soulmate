// 말로 적기: "와이프는 바닐라라떼를 좋아해" 같은 말을 AI가 (사람, 칸, 값)으로 나누면, 여기서 그 칸에 합친다.
// 어느 칸에도 안 맞는 말은 그 사람의 메모로 간다(target "memo"). 순수 함수라 서버·테스트가 같이 쓴다.
import { ALCOHOL_KINDS, ALCOHOL_LEVELS, ALLERGENS, COLORS, DIETS, DISLIKES, METALS, MOVIE_GENRES, MUSIC_GENRES, NONE, PATTERNS, SEASONS, SPICY_LEVELS, STYLES, VIBES, type CatalogItem } from "./catalog";
import { emptySection, sanitizeSection, type CardData, type Section } from "./card";
import type { DateSpec } from "./calendar";
import type { Locale } from "./locale";

/**
 * 칸의 종류
 * - text: 글 한 줄. 이미 있으면 ", "로 이어 붙인다(사이즈 상의·하의는 바꾼다)
 * - list: 글 목록(좋아하는 음식·취미·받고 싶은 것…). 없는 것만 더한다
 * - codes: 고르는 칸(무늬·장르…). 목록에 있는 코드만, 없는 것만 더한다
 * - tags: 알레르기·안 먹는 것. 목록의 코드 + 목록에 없는 음식 이름(text)을 새 항목으로 더한다
 * - code: 하나만 고르는 칸(술을 얼마나·상품권). 바꾼다
 * - number: 수(매운맛 0–4, 신발 mm, 반지 호수). 바꾼다
 * - date: 생일. 바꾼다
 * - anniversary: 기념일(이름 + 날짜). 같은 이름이면 바꾸고 아니면 더한다
 */
export type CaptureKind = "text" | "list" | "codes" | "tags" | "code" | "number" | "date" | "anniversary";

export interface CaptureField {
  key: string;
  section: Section;
  kind: CaptureKind;
  label: Record<Locale, string>;
  catalog?: CatalogItem[];
  range?: [number, number];
  /** text인데 이어 붙이지 않고 바꾸는 칸 */
  replace?: boolean;
}

const f = (key: string, kind: CaptureKind, ko: string, en: string, extra: Partial<CaptureField> = {}): CaptureField => ({
  key,
  section: key.split(".")[0] as Section,
  kind,
  label: { ko, en },
  ...extra,
});

export const CAPTURE_FIELDS: CaptureField[] = [
  f("safety.allergens", "tags", "알레르기", "Allergies", { catalog: ALLERGENS }),
  f("safety.dislikes", "tags", "안 먹어요", "Won't eat", { catalog: DISLIKES }),
  f("safety.diets", "codes", "식단", "Diet", { catalog: DIETS }),
  f("safety.allergyNote", "text", "꼭 알려 둘 말", "Good to know"),
  f("taste.likes", "list", "좋아하는 음식", "Favorite foods"),
  f("taste.spicy", "number", "매운맛", "Spice", { range: [0, 4] }),
  f("taste.dessert", "text", "디저트·간식", "Desserts & snacks"),
  f("taste.drinks", "text", "요즘 마시는 것", "Drinking lately"),
  f("taste.alcoholLevel", "code", "술", "Alcohol", { catalog: ALCOHOL_LEVELS }),
  f("taste.alcoholKinds", "codes", "좋아하는 술", "Favorite drinks", { catalog: ALCOHOL_KINDS }),
  f("sizes.top", "text", "상의", "Top", { replace: true }),
  f("sizes.bottom", "text", "하의", "Bottom", { replace: true }),
  f("sizes.shoe", "number", "신발(mm)", "Shoe (mm)", { range: [180, 330] }),
  f("sizes.ring", "number", "반지(호)", "Ring size", { range: [1, 30] }),
  f("gifts.wishlist", "list", "해주고 싶은 선물", "Gift ideas"),
  f("gifts.skip", "list", "사양하는 것", "Please skip"),
  f("gifts.brands", "list", "좋아하는 브랜드", "Favorite brands"),
  f("gifts.giftCard", "code", "상품권", "Gift cards", { catalog: [{ code: "yes", label: { ko: "좋아요", en: "Yes" } }, { code: "no", label: { ko: "싫어요", en: "No" } }] }),
  f("favorites.scent", "text", "향", "Scent"),
  f("favorites.flowers", "text", "꽃", "Flowers"),
  f("favorites.colors", "codes", "좋아하는 색", "Colors", { catalog: COLORS }),
  f("favorites.patterns", "codes", "무늬", "Patterns", { catalog: PATTERNS }),
  f("favorites.styles", "codes", "옷 스타일", "Style", { catalog: STYLES }),
  f("favorites.metals", "codes", "액세서리 색", "Metals", { catalog: METALS }),
  f("favorites.vibes", "codes", "좋아하는 분위기", "Vibe", { catalog: VIBES }),
  f("favorites.places", "list", "좋아하는 장소", "Favorite places"),
  f("favorites.idol", "text", "최애 연예인·가수", "Favorite star"),
  f("favorites.character", "text", "좋아하는 캐릭터", "Favorite character"),
  f("favorites.team", "text", "응원하는 팀", "Team"),
  f("favorites.animal", "text", "좋아하는 동물", "Favorite animal"),
  f("culture.movieGenres", "codes", "영화 장르", "Movie genres", { catalog: MOVIE_GENRES }),
  f("culture.musicGenres", "codes", "음악 장르", "Music genres", { catalog: MUSIC_GENRES }),
  f("culture.movie", "text", "인생 영화", "Favorite movie"),
  f("culture.drama", "text", "드라마", "Drama"),
  f("culture.shows", "text", "TV·예능·유튜브", "Shows"),
  f("culture.song", "text", "노래", "Song"),
  f("culture.book", "text", "책", "Book"),
  f("life.hobbies", "list", "취미", "Hobbies"),
  f("life.seasons", "codes", "좋아하는 계절", "Seasons", { catalog: SEASONS }),
  f("life.travel", "text", "가 보고 싶은 곳", "Dream trip"),
  f("dates.birthday", "date", "생일", "Birthday"),
  f("dates.anniversary", "anniversary", "기념일", "Anniversary"),
];

export const CAPTURE_TARGETS = [...CAPTURE_FIELDS.map((x) => x.key), "memo"] as const;

export function captureField(key: string): CaptureField | null {
  return CAPTURE_FIELDS.find((x) => x.key === key) ?? null;
}

/**
 * 무엇을 할지
 * - add: 새로 알게 된 것(기본). 글은 이어 붙이고 목록은 없는 것만 더한다
 * - replace: 바뀐 것·고친 것. 그 칸을 새 값으로 바꾼다
 * - remove: 아니라거나 지워 달라는 것. 맞는 것만 빼고, 값이 없으면 그 칸을 비운다
 */
export type CaptureOp = "add" | "replace" | "remove";

/** AI가 돌려주는 값(쓰는 칸만 채운다) */
export interface CaptureValue {
  text?: string | null;
  codes?: string[] | null;
  number?: number | null;
  date?: DateSpec | null;
  label?: string | null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const squash = (a: string) => a.toLowerCase().replace(/\s+/g, "");
/** 지울 때: 같거나 한쪽이 다른 쪽을 품으면 같은 것으로 본다("수국" ↔ "카네이션보다 수국") */
const matches = (a: string, b: string) => {
  const x = squash(a);
  const y = squash(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};

/** 칸의 실제 저장 위치(술 두 칸은 taste.alcohol 안에 있다) */
function getRaw(data: Record<string, unknown>, key: string): unknown {
  const name = key.split(".")[1]!;
  if (name === "alcoholLevel") return (data.alcohol as { level: unknown } | undefined)?.level ?? null;
  if (name === "alcoholKinds") return (data.alcohol as { kinds: unknown } | undefined)?.kinds ?? [];
  return data[name];
}

function setRaw(data: Record<string, unknown>, key: string, value: unknown): void {
  const name = key.split(".")[1]!;
  if (name === "alcoholLevel" || name === "alcoholKinds") {
    const alcohol = { level: null, kinds: [], ...((data.alcohol as object) ?? {}) } as Record<string, unknown>;
    alcohol[name === "alcoholLevel" ? "level" : "kinds"] = value;
    data.alcohol = alcohol;
    return;
  }
  data[name] = value;
}

/**
 * 한 칸에 값 합치기(더하기·바꾸기·지우기). 바뀐 항목 전체를 돌려주고, 바뀐 게 없거나 값이 맞지 않으면 null.
 * 결과는 sanitizeSection을 거쳐 저장 모양과 같다
 */
export function mergeCapture<S extends Section>(field: CaptureField, current: CardData[S] | null | undefined, value: CaptureValue, op: CaptureOp = "add"): CardData[S] | null {
  const section = field.section as S;
  const base = structuredClone(current ?? emptySection(section)) as unknown as Record<string, unknown>;
  const before = JSON.stringify(sanitizeSection(section, base));
  const text = (value.text ?? "").replace(/\s+/g, " ").trim();
  const codes = (value.codes ?? []).filter((c) => !!field.catalog?.some((x) => x.code === c));
  if (op === "remove") {
    if (!removeFrom(field, base, text, codes, value)) return null;
    const out = sanitizeSection(section, base);
    return JSON.stringify(out) === before ? null : out;
  }
  const replace = op === "replace";

  switch (field.kind) {
    case "text": {
      if (!text) return null;
      const old = String(getRaw(base, field.key) ?? "").trim();
      const parts = old ? old.split(/\s*,\s*/) : [];
      setRaw(base, field.key, replace || field.replace || !old ? text : parts.some((p) => same(p, text)) ? old : `${old}, ${text}`);
      break;
    }
    case "list": {
      if (!text) return null;
      const items = text.split(/\s*,\s*/).filter(Boolean);
      if (field.key === "gifts.wishlist") {
        const old = (base.wishlist as { title: string; url: string }[]) ?? [];
        // 바꿀 때도 같은 이름의 링크는 남긴다
        const list = replace ? [] : old.slice();
        for (const title of items) if (!list.some((w) => same(w.title, title))) list.push(old.find((w) => same(w.title, title)) ?? { title, url: "" });
        base.wishlist = list;
      } else {
        const list = replace ? [] : ((getRaw(base, field.key) as string[]) ?? []).slice();
        for (const x of items) if (!list.some((y) => same(x, y))) list.push(x);
        setRaw(base, field.key, list);
      }
      break;
    }
    case "codes": {
      if (!codes.length) return null;
      const list = replace ? [] : ((getRaw(base, field.key) as string[]) ?? []).filter((c) => c !== NONE);
      for (const c of codes) if (!list.includes(c)) list.push(c);
      setRaw(base, field.key, list);
      break;
    }
    case "tags": {
      const add = [...codes, ...text.split(/\s*,\s*/).filter(Boolean)];
      if (!add.length) return null;
      const list = replace ? [] : ((getRaw(base, field.key) as string[]) ?? []).filter((c) => c !== NONE);
      for (const x of add) if (!list.some((y) => same(x, y))) list.push(x);
      setRaw(base, field.key, list); // 목록에 있는 이름은 sanitizeSection이 코드로 바꾸고 겹친 것을 지운다
      break;
    }
    case "code": {
      const code = codes[0] ?? (field.catalog?.some((x) => x.code === text) ? text : "");
      if (!code) return null;
      setRaw(base, field.key, code);
      break;
    }
    case "number": {
      const n = value.number;
      const [min, max] = field.range ?? [-Infinity, Infinity];
      if (typeof n !== "number" || !Number.isFinite(n)) return null;
      const r = Math.round(n);
      if (r < min || r > max) return null;
      setRaw(base, field.key, r);
      break;
    }
    case "date": {
      if (!value.date) return null;
      base.birthday = value.date;
      break;
    }
    case "anniversary": {
      const label = (value.label ?? "").trim();
      if (!value.date || !label) return null;
      const list = ((base.anniversaries as { label: string; spec: DateSpec }[]) ?? []).filter((a) => !same(a.label, label));
      list.push({ label, spec: value.date });
      base.anniversaries = list;
      break;
    }
  }
  const out = sanitizeSection(section, base);
  return JSON.stringify(out) === before ? null : out;
}

/** 지우기: 맞는 것만 빼고(값이 없으면 그 칸을 비운다), 뺄 게 있었는지 */
function removeFrom(field: CaptureField, base: Record<string, unknown>, text: string, codes: string[], value: CaptureValue): boolean {
  switch (field.kind) {
    case "text": {
      const old = String(getRaw(base, field.key) ?? "").trim();
      if (!old) return false;
      const parts = old.split(/\s*,\s*/);
      const keep = text ? parts.filter((p) => !matches(p, text)) : [];
      if (keep.length === parts.length) return false;
      setRaw(base, field.key, keep.join(", "));
      return true;
    }
    case "list": {
      const items = text.split(/\s*,\s*/).filter(Boolean);
      const hit = (x: string) => !items.length || items.some((y) => matches(x, y));
      if (field.key === "gifts.wishlist") {
        const list = (base.wishlist as { title: string; url: string }[]) ?? [];
        base.wishlist = list.filter((w) => !hit(w.title));
        return (base.wishlist as unknown[]).length !== list.length;
      }
      const list = (getRaw(base, field.key) as string[]) ?? [];
      const keep = list.filter((x) => !hit(x));
      setRaw(base, field.key, keep);
      return keep.length !== list.length;
    }
    case "codes": {
      // 목록에 없는 말로만 지워 달라면(예: 없는 알레르기) 지울 것이 없다
      if (!codes.length && (value.codes?.length || text)) return false;
      const list = (getRaw(base, field.key) as string[]) ?? [];
      const keep = codes.length ? list.filter((c) => !codes.includes(c)) : [];
      setRaw(base, field.key, keep);
      return keep.length !== list.length;
    }
    case "tags": {
      const items = [...codes, ...text.split(/\s*,\s*/).filter(Boolean)];
      if (!items.length && value.codes?.length) return false; // 목록에 없는 코드로만 지워 달라면 지울 것이 없다
      const list = (getRaw(base, field.key) as string[]) ?? [];
      const name = (x: string) => field.catalog?.find((i) => i.code === x)?.label ?? null;
      const hit = (x: string) => !items.length || items.some((y) => x === y || matches(x, y) || (!!name(x) && (matches(name(x)!.ko, y) || matches(name(x)!.en, y))));
      const keep = list.filter((x) => !hit(x));
      setRaw(base, field.key, keep);
      return keep.length !== list.length;
    }
    case "code":
    case "number":
      if (getRaw(base, field.key) == null) return false;
      setRaw(base, field.key, null);
      return true;
    case "date":
      if (!base.birthday) return false;
      base.birthday = null;
      return true;
    case "anniversary": {
      const label = (value.label ?? text).trim();
      const d = value.date;
      if (!label && !d) return false;
      const list = (base.anniversaries as { label: string; spec: DateSpec }[]) ?? [];
      base.anniversaries = list.filter((a) => !(label ? matches(a.label, label) : a.spec.month === d!.month && a.spec.day === d!.day));
      return (base.anniversaries as unknown[]).length !== list.length;
    }
  }
}

/** 화면에 보일 값 한 줄("바닐라라떼", "땅콩, 새우", "270") */
export function describeCapture(field: CaptureField, value: CaptureValue, locale: Locale): string {
  const codeLabel = (c: string) => field.catalog?.find((x) => x.code === c)?.label[locale] ?? c;
  switch (field.kind) {
    case "codes":
      return (value.codes ?? []).map(codeLabel).join(", ");
    case "tags":
      return [...(value.codes ?? []).filter((c) => field.catalog?.some((x) => x.code === c)).map(codeLabel), ...(value.text ?? "").split(/\s*,\s*/).filter(Boolean)].join(", ");
    case "code":
      return codeLabel(value.codes?.[0] ?? value.text ?? "");
    case "number":
      if (value.number == null) return "";
      if (field.key === "taste.spicy") return SPICY_LEVELS[Math.round(value.number)]?.[locale] ?? String(value.number);
      return String(value.number);
    case "date":
    case "anniversary": {
      const d = value.date;
      if (!d) return "";
      const md = locale === "ko" ? `${d.calendar === "lunar" ? "음력 " : ""}${d.month}월 ${d.day}일` : `${d.calendar === "lunar" ? "Lunar " : ""}${d.month}/${d.day}`;
      return field.kind === "anniversary" ? `${value.label ?? ""} ${md}`.trim() : md;
    }
    default:
      return (value.text ?? "").trim();
  }
}
