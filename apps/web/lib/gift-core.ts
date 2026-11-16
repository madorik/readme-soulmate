// 선물 추천 중 서버 키와 상관없는 것: 기록 → 힌트 줄, AI 요청 몸·응답 풀기, 기록만으로 고르기(AI가 없거나 실패할 때), 쿠팡 파트너스 서명·응답 풀기.
// 서버 전용 표시가 없어 시험에서 바로 불러 쓴다. 쿠팡은 한국 쇼핑몰이라 찾을 말·힌트는 늘 한국어로, 이유(reason)만 화면 언어로.
import { createHash, createHmac } from "node:crypto";
import { ALCOHOL_KINDS, ALLERGENS, COLORS, DIETS, DISLIKES, METALS, MOVIE_GENRES, MUSIC_GENRES, PATTERNS, STYLES, VIBES, labelOf, realCodes, type Locale, type PartialCard } from "@readme/core";

export interface GiftIdea {
  /** 쿠팡 찾을 말(한국어). 예: 캠핑 머그컵 */
  keyword: string;
  /** 왜 어울리는지 짧게. 예: 캠핑 좋아해서 */
  reason: string;
}

export interface GiftContext {
  /** 내가 부르는 말(아내, 아빠) */
  call: string;
  /** 이 사람이 든 폴더 이름(가족, 회사…) */
  folders: string[];
  /** 챙길 날 */
  occasion: { kind: "birthday" | "anniversary"; label: string } | null;
  age: number | null;
}

export interface GiftProfile {
  /** "취미: 캠핑, 등산" 같은 줄 */
  hints: string[];
  /** 해주고 싶은 선물(적어 둔 것) */
  wishes: string[];
  /** 사양하는 것·알레르기·못 먹는 것 */
  avoid: string[];
  giftCard: "yes" | "no" | null;
}

export const IDEA_COUNT = 4;

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const ko = (list: Parameters<typeof labelOf>[0], codes: readonly string[] | undefined) => realCodes(codes).map((c) => labelOf(list, c, "ko"));

/** 기록에서 선물 고를 때 쓸 것만 뽑는다(사이즈·날짜·메모는 보내지 않는다) */
export function giftProfile(card: PartialCard): GiftProfile {
  const { gifts: g, favorites: f, taste: t, culture: c, life: l, safety: s } = card;
  const line = (label: string, values: (string | undefined | null)[]) => {
    const v = values.map((x) => clean(x, 80)).filter(Boolean);
    return v.length ? `${label}: ${v.join(", ")}` : "";
  };
  const noDrink = t?.alcohol?.level === "none";
  const hints = [
    line("취미", l?.hobbies ?? []),
    line("좋아하는 브랜드", g?.brands ?? []),
    line("좋아하는 향", [f?.scent]),
    line("좋아하는 꽃", [f?.flowers]),
    line("좋아하는 색", ko(COLORS, f?.colors)),
    line("좋아하는 무늬", ko(PATTERNS, f?.patterns)),
    line("옷 스타일", ko(STYLES, f?.styles)),
    line("액세서리 색", ko(METALS, f?.metals)),
    line("좋아하는 분위기", ko(VIBES, f?.vibes)),
    line("좋아하는 장소", f?.places ?? []),
    line("최애 연예인·가수", [f?.idol]),
    line("좋아하는 캐릭터", [f?.character]),
    line("응원하는 팀", [f?.team]),
    line("좋아하는 동물", [f?.animal]),
    line("좋아하는 음식", t?.likes ?? []),
    line("좋아하는 디저트·간식", [t?.dessert]),
    line("자주 마시는 음료", [t?.drinks]),
    noDrink ? "" : line("좋아하는 술", ko(ALCOHOL_KINDS, t?.alcohol?.kinds)),
    line("식단", ko(DIETS, s?.diets)),
    line("좋아하는 책·작가", [c?.book]),
    line("음악", [...ko(MUSIC_GENRES, c?.musicGenres), c?.song]),
    line("영화", [...ko(MOVIE_GENRES, c?.movieGenres), c?.movie]),
    line("드라마", [c?.drama]),
    line("즐겨 보는 것", [c?.shows]),
    line("가 보고 싶은 곳", [l?.travel]),
  ].filter(Boolean);
  const avoid = [
    ...(g?.skip ?? []).map((x) => clean(x, 60)),
    ...ko(ALLERGENS, s?.allergens).map((x) => `${x}(알레르기)`),
    ...ko(DISLIKES, s?.dislikes),
    ...(noDrink ? ["술"] : []),
  ].filter(Boolean);
  return { hints, wishes: (g?.wishlist ?? []).map((w) => clean(w.title, 60)).filter(Boolean), avoid, giftCard: g?.giftCard ?? null };
}

/** 같은 기록·같은 날이면 같은 값: 지난번에 고른 걸 다시 쓴다(기록이 그대로 남지 않게 해시로) */
export function giftBasis(profile: GiftProfile, ctx: GiftContext, locale: Locale): string {
  // v: 고르는 지침이 바뀌면 올려서 지난번 것을 다시 고르게
  return createHash("sha256").update(JSON.stringify({ v: 2, profile, ctx, locale })).digest("hex");
}

const INSTRUCTIONS = `You suggest gift ideas for one person. The user will shop on Coupang (a Korean online store), so each idea is a search query.
Input:
- CALL: what the user calls this person (e.g. 아내, 아빠, or a name)
- GROUPS: the user's folders this person is in (e.g. 가족, 회사, 친구들)
- OCCASION: birthday or an anniversary name, if any
- AGE: if known
- WISHES: gifts the user already wants to give this person
- HINTS: what the user knows about this person's tastes
- AVOID: things they don't want, allergies, foods they dislike
- GIFT_CARD: whether they like gift cards (yes, no, unknown)
Return exactly ${IDEA_COUNT} ideas, each a different kind of gift, best first.
keyword: a Korean Coupang search query for one concrete product sold online, 2 to 4 words (e.g. "캠핑 머그컵", "조말론 디퓨저", "튤립 꽃다발", "등산 양말"). Build it from the recorded brands, tastes and wishes. Use at most one wish: the first wish that is a thing sold online goes first; skip experiences like classes, trips or meals. No people words, names, sizes, prices, or words like 고급, 추천, 인기. Never a vague query like "선물세트" alone.
reason: why it fits, in LANGUAGE, warm and very short. Name the actual hint value, not its category ("이솝 좋아해서", not "좋아하는 브랜드라서"; "튤립 좋아해서", not "좋아하는 꽃이라서"). Korean: at most 12 characters, casual spoken style, usually "<value> 좋아해서" (e.g. "캠핑 좋아해서", "우디 향 좋아해서"); the wish idea is "해주고 싶었던 선물"; an occasion pick is like "생신 선물로". English: at most 24 characters (e.g. "Loves camping"). Every reason is different. Never mention allergies or things to avoid.
Never suggest anything in AVOID or containing it, food with their allergens, alcohol if AVOID has 술, or gift cards unless GIFT_CARD is yes. Keep it modest for coworkers (회사). If HINTS are few, use CALL, AGE and OCCASION for safe, thoughtful picks.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["keyword", "reason"],
        properties: { keyword: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
} as const;

function occasionText(ctx: GiftContext): string {
  if (!ctx.occasion) return "none";
  return ctx.occasion.kind === "birthday" ? "생일" : ctx.occasion.label || "기념일";
}

/** OpenAI Responses API 몸 */
export function ideasRequest(profile: GiftProfile, ctx: GiftContext, locale: Locale, model: string) {
  const input = [
    `LANGUAGE: ${locale}`,
    `CALL: ${clean(ctx.call, 40) || "unknown"}`,
    `GROUPS: ${ctx.folders.map((x) => clean(x, 30)).join(", ") || "none"}`,
    `OCCASION: ${occasionText(ctx)}`,
    `AGE: ${ctx.age ?? "unknown"}`,
    `WISHES: ${profile.wishes.join(" | ") || "none"}`,
    `HINTS:\n${profile.hints.map((h) => `- ${h}`).join("\n") || "none"}`,
    `AVOID: ${profile.avoid.join(", ") || "none"}`,
    `GIFT_CARD: ${profile.giftCard ?? "unknown"}`,
  ].join("\n");
  return {
    model,
    reasoning: { effort: "low" },
    instructions: INSTRUCTIONS,
    input,
    text: { format: { type: "json_schema", name: "gift_ideas", strict: true, schema: SCHEMA } },
  };
}

function outputText(body: unknown): string {
  const out = (body as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] })?.output ?? [];
  for (const item of out) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text" && typeof c.text === "string") return c.text;
  }
  return "";
}

/** 찾을 말: 띄어쓰기 하나로, 40자까지 */
export function normalizeKeyword(k: unknown): string {
  return clean(k, 40);
}

/** 겹치거나 빈 것, 사양하는 것이 든 것을 빼고 몇 개까지 */
export function sanitizeIdeas(raw: unknown, avoid: string[] = [], max = IDEA_COUNT): GiftIdea[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const banned = avoid.map((a) => a.replace(/\(.*\)$/, "").replace(/\s+/g, "")).filter((a) => a.length >= 2);
  const out: GiftIdea[] = [];
  for (const r of list) {
    const keyword = normalizeKeyword((r as GiftIdea)?.keyword);
    const reason = clean((r as GiftIdea)?.reason, 30);
    const key = keyword.replace(/\s+/g, "");
    if (!keyword || !reason || seen.has(key) || banned.some((b) => key.includes(b))) continue;
    seen.add(key);
    out.push({ keyword, reason });
    if (out.length >= max) break;
  }
  return out;
}

export function parseIdeas(body: unknown, avoid: string[] = []): GiftIdea[] {
  try {
    return sanitizeIdeas((JSON.parse(outputText(body) || "{}") as { ideas?: unknown }).ideas, avoid);
  } catch {
    return [];
  }
}

/** AI 없이 기록만으로: 해주고 싶은 선물(첫 번째만) → 취미 → 향·꽃 → 좋아하는 것들 → 챙길 날 선물 */
export function ruleIdeas(card: PartialCard, ctx: GiftContext, locale: Locale): GiftIdea[] {
  const { gifts: g, favorites: f, taste: t, life: l, culture: c } = card;
  const first = (s: string | undefined) => clean((s ?? "").split(/[,，·/]/)[0], 20);
  const likes = (v: string) => (locale === "ko" ? `${v} 좋아해서` : `Loves ${v}`);
  const out: GiftIdea[] = [];
  const add = (keyword: string, reason: string) => {
    if (keyword.trim()) out.push({ keyword, reason });
  };
  const wish = g?.wishlist?.[0]?.title;
  if (wish) add(wish, locale === "ko" ? "해주고 싶었던 선물" : "On your gift list");
  for (const h of l?.hobbies ?? []) add(`${first(h)} 용품`, likes(first(h)));
  const scent = first(f?.scent).replace(/\s*향$/, "");
  if (scent) add(`${scent} 향수`, likes(locale === "ko" ? `${scent} 향` : `${scent} scents`));
  const flower = first(f?.flowers);
  if (flower) add(`${flower} 꽃다발`, likes(flower));
  for (const b of g?.brands ?? []) add(first(b), likes(first(b)));
  for (const v of [f?.character, f?.idol, f?.team]) if (first(v ?? "")) add(`${first(v ?? "")} 굿즈`, likes(first(v ?? "")));
  const dessert = first(t?.dessert);
  if (dessert) add(dessert, likes(dessert));
  const book = first(c?.book);
  if (book) add(book, likes(book));
  const occasion = ctx.occasion?.kind === "anniversary" ? ctx.occasion.label || "기념일" : "생일";
  add([clean(ctx.call, 12), `${occasion} 선물`].filter(Boolean).join(" "), locale === "ko" ? `${occasion} 선물로` : ctx.occasion?.kind === "anniversary" ? "For your anniversary" : "For the birthday");
  return sanitizeIdeas(out, giftProfile(card).avoid);
}

// ── 쿠팡 파트너스 ──────────────────────────────────────────────

export const COUPANG_SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search";

export interface CoupangProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  /** 파트너스 링크(link.coupang.com) */
  url: string;
  rocket: boolean;
}

export interface CoupangResult {
  /** 같은 찾을 말의 쿠팡 검색 화면(파트너스 링크) */
  landingUrl: string | null;
  products: CoupangProduct[];
}

/** yyMMdd'T'HHmmss'Z' (UTC) */
export function coupangSignedDate(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(now.getUTCFullYear() % 100)}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

/** HMAC-SHA256(signed-date + method + path + query) 를 hex로. query는 '?' 없이, 실제로 보내는 그대로 */
export function coupangAuthorization(method: string, path: string, query: string, accessKey: string, secretKey: string, now: Date): string {
  const signedDate = coupangSignedDate(now);
  const signature = createHmac("sha256", secretKey).update(`${signedDate}${method}${path}${query}`).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

export function coupangSearchQuery(keyword: string, limit: number, subId?: string): string {
  const q = [`keyword=${encodeURIComponent(keyword)}`, `limit=${limit}`, "imageSize=300x300"];
  if (subId) q.push(`subId=${encodeURIComponent(subId)}`);
  return q.join("&");
}

/** 쿠팡 주소만 받는다(https, coupang.com·coupangcdn.com). 시험용 가짜 서버는 extraHost로 */
export function coupangUrl(v: unknown, extraHost?: string): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase();
    const ours = /(^|\.)coupang\.com$|(^|\.)coupangcdn\.com$/.test(host) && u.protocol === "https:";
    return ours || (extraHost && u.host === extraHost) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** 상품 검색 응답: { rCode: "0", data: { landingUrl, productData: [...] } } */
export function parseCoupangSearch(body: unknown, extraHost?: string): CoupangResult | null {
  const b = body as { rCode?: unknown; data?: { landingUrl?: unknown; productData?: unknown } } | null;
  if (!b || String(b.rCode) !== "0" || !b.data) return null;
  const list = Array.isArray(b.data.productData) ? b.data.productData : [];
  const products: CoupangProduct[] = [];
  for (const raw of list) {
    const r = raw as Record<string, unknown>;
    const url = coupangUrl(r.productUrl, extraHost);
    const image = coupangUrl(r.productImage, extraHost);
    const name = clean(r.productName, 120);
    const price = Number(r.productPrice);
    if (!url || !image || !name || !Number.isFinite(price) || price <= 0) continue;
    products.push({ id: String(r.productId ?? url), name, price: Math.round(price), image, url, rocket: r.isRocket === true });
  }
  return { landingUrl: coupangUrl(b.data.landingUrl, extraHost), products };
}

/** API가 막혔을 때: 쿠팡 검색 화면(파트너스 링크 아님) */
export function coupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
}
