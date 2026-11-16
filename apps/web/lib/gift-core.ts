// 선물 추천 중 서버 키와 상관없는 것: 기록 전체 + 메모 → 힌트 줄, AI 요청 몸·응답 풀기, 기록만으로 고르기(AI가 없거나 실패할 때), 쿠팡 파트너스 서명·응답 풀기,
// 쿠팡 API 키가 없을 때 쓰는 찾을 말 목록(gift-catalog)에서 고르기(가격대마다 둘).
// 서버 전용 표시가 없어 시험에서 바로 불러 쓴다. 쿠팡은 한국 쇼핑몰이라 찾을 말·힌트는 늘 한국어로, 이유(reason)만 화면 언어로.
import { createHash, createHmac } from "node:crypto";
import { ALCOHOL_KINDS, ALLERGENS, COLORS, DIETS, DISLIKES, METALS, MOVIE_GENRES, MUSIC_GENRES, PATTERNS, SEASONS, STYLES, VIBES, josa, labelOf, realCodes, type Locale, type PartialCard } from "@readme/core";
import { PRICE_BANDS, type CatalogGift, type PriceBand } from "./gift-catalog";

export interface GiftIdea {
  /** 쿠팡 찾을 말(한국어). 예: 캠핑 머그컵 */
  keyword: string;
  /** 주고 싶어지게 포장한 한 문장. 예: 주말마다 산에 오르시는 아빠, 무릎 부담을 덜어 드려요 */
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
  /** 내 메모(최근 것부터). 예: 작년 생일에 지갑 선물함 */
  notes: string[];
}

export const IDEA_COUNT = 4;

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const ko = (list: Parameters<typeof labelOf>[0], codes: readonly string[] | undefined) => realCodes(codes).map((c) => labelOf(list, c, "ko"));

/** 사이즈 줄(상의 95, 신발 260mm …) */
function sizeLine(card: PartialCard): string {
  const z = card.sizes;
  const v = [z?.top ? `상의 ${z.top}` : "", z?.bottom ? `하의 ${z.bottom}` : "", z?.shoe ? `신발 ${z.shoe}mm` : "", z?.ring ? `반지 ${z.ring}호` : ""].filter(Boolean);
  return v.length ? `사이즈(체형 참고): ${v.join(", ")}` : "";
}

/** 기록 전체와 메모를 선물 고를 때 쓰는 줄로(메모는 최근 20개, 하나에 200자까지) */
export function giftProfile(card: PartialCard, notes: string[] = []): GiftProfile {
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
    line("좋아하는 계절", ko(SEASONS, l?.seasons)),
    line("가 보고 싶은 곳", [l?.travel]),
    sizeLine(card),
  ].filter(Boolean);
  const avoid = [
    ...(g?.skip ?? []).map((x) => clean(x, 60)),
    ...ko(ALLERGENS, s?.allergens).map((x) => `${x}(알레르기)`),
    ...(s?.allergyNote ? [`${clean(s.allergyNote, 60)}(알레르기)`] : []),
    ...ko(DISLIKES, s?.dislikes),
    ...(noDrink ? ["술"] : []),
  ].filter(Boolean);
  return {
    hints,
    wishes: (g?.wishlist ?? []).map((w) => clean(w.title, 60)).filter(Boolean),
    avoid,
    giftCard: g?.giftCard ?? null,
    notes: notes.map((n) => clean(n, 200)).filter(Boolean).slice(0, 20),
  };
}

/** 같은 기록·같은 날이면 같은 값: 지난번에 고른 걸 다시 쓴다(기록이 그대로 남지 않게 해시로) */
export function giftBasis(profile: GiftProfile, ctx: GiftContext, locale: Locale): string {
  // v: 고르는 지침이 바뀌면 올려서 지난번 것을 다시 고르게
  return createHash("sha256").update(JSON.stringify({ v: 6, profile, ctx, locale })).digest("hex");
}

const PITCH = `reason: a short, warm pitch in LANGUAGE that makes the user want to give this gift, written like a thoughtful friend's tip. Tie what you know about this person to what kind of this gift suits them and why:
- their tastes, hobbies, wishes and notes (e.g. 주말마다 산에 오른다, 요즘 허리가 아프다)
- their body from the 사이즈 line in HINTS (a big frame or tall → roomy, sturdy; petite → light, compact) and their age (older → comfortable, supportive, easy to use; younger → stylish, trendy)
- the price band when there is one (1만원대 → a light, thoughtful touch; 10만원대 → a well-made piece that lasts)
The link opens a search page, so it helps to say which kind to pick (e.g. 등받이가 높은, 가볍게 접히는, 넉넉한 사이즈의, 은은한).
One sentence; Korean 25 to 45 characters with a polite ending (…예요, …해요, …드려요, …골라 보세요); English up to 90 characters. Call the person by CALL when it reads naturally (아빠, 아내, a name). Never write sizes or numbers about their body. No quotes or emoji.
Good: "키 큰 아빠도 등까지 편히 기대는 넉넉한 캠핑 의자로 골라 보세요", "주말마다 산에 오르시는 아빠, 가벼운 스틱이면 무릎 부담을 덜어 드려요", "우디 향을 좋아하는 아내에게, 은은하게 오래가는 향이 잘 어울려요", "요즘 허리가 아프다던 엄마, 등을 감싸는 안마 쿠션이면 소파에서도 편히 쉬세요", "트로트를 즐겨 들으시니, 버튼 하나로 켜지는 큰 글씨 라디오가 딱이에요".
Bad (just repeats a hint): "캠핑 좋아해서", "우디 향 좋아해서", "취미라서", "생일 선물로".
Every reason is different. Never mention allergies or things to avoid.`;

const INSTRUCTIONS = `You suggest gift ideas for one person. The user will shop on Coupang (a Korean online store), so each idea is a search query.
Input:
- CALL: what the user calls this person (e.g. 아내, 아빠, or a name)
- GROUPS: the user's folders this person is in (e.g. 가족, 회사, 친구들)
- OCCASION: birthday or an anniversary name, if any
- AGE: if known
- WISHES: gifts written down for this person: either what the user wants to give or what the person said they want, so refer to them neutrally (e.g. "적어 둔 캠핑 의자"), never as "원하셨으니"
- HINTS: what the user knows about this person's tastes
- AVOID: things they don't want, allergies, foods they dislike
- GIFT_CARD: whether they like gift cards (yes, no, unknown)
- NOTES: the user's own notes about this person, newest first. Read them closely: a gift already given (e.g. "작년 생일에 지갑 선물함") must not be suggested again, not even the same kind; worries or wants in notes (e.g. "요즘 허리가 아프대", "캠핑 시작했대") are strong hints.
Return exactly ${IDEA_COUNT} ideas, each a different kind of gift, best first.
keyword: a Korean Coupang search query for one concrete product sold online, 2 to 4 words (e.g. "캠핑 머그컵", "조말론 디퓨저", "튤립 꽃다발", "등산 양말"). Build it from the recorded brands, tastes and wishes. Use at most one wish: the first wish that is a thing sold online goes first; skip experiences like classes, trips or meals. No people words, names, sizes, prices, or words like 고급, 추천, 인기. Sizes are only for judging style or gender, never put them in the query. Never a vague query like "선물세트" alone.
${PITCH}
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
    `NOTES:\n${profile.notes.map((n) => `- ${n}`).join("\n") || "none"}`,
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
    const reason = clean((r as GiftIdea)?.reason, 120);
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

/** AI 없이 고를 때의 이유 문장(포장한 틀): 해주고 싶던 선물 · 좋아하는 것 · 챙길 날 */
export function pitch(kind: "wish" | "likes" | "occasion", ctx: GiftContext, locale: Locale, value = ""): string {
  const call = clean(ctx.call, 12);
  const occasion = ctx.occasion?.kind === "anniversary" ? ctx.occasion.label || "기념일" : "생일";
  if (locale !== "ko") {
    if (kind === "wish") return "The very gift you noted you wanted to give";
    if (kind === "likes") return `A gift that fits their love of ${value}`;
    return ctx.occasion?.kind === "anniversary" ? "A warm way to mark your anniversary" : "A warm way to say happy birthday";
  }
  const who = call || "그 사람";
  if (kind === "wish") return `${josa(who, "에게")} 해 주고 싶다고 적어 둔 바로 그 선물이에요`;
  if (kind === "likes") return `${josa(value, "을")} 좋아하는 ${josa(who, "에게")} 잘 어울리는 선물이에요`;
  return `${who}의 ${occasion}, 마음을 전하기 좋은 선물이에요`;
}

/** AI 없이 기록만으로: 해주고 싶은 선물(첫 번째만) → 취미 → 향·꽃 → 좋아하는 것들 → 챙길 날 선물 */
export function ruleIdeas(card: PartialCard, ctx: GiftContext, locale: Locale): GiftIdea[] {
  const { gifts: g, favorites: f, taste: t, life: l, culture: c } = card;
  const first = (s: string | undefined) => clean((s ?? "").split(/[,，·/]/)[0], 20);
  const likes = (v: string) => pitch("likes", ctx, locale, v);
  const out: GiftIdea[] = [];
  const add = (keyword: string, reason: string) => {
    if (keyword.trim()) out.push({ keyword, reason });
  };
  const wish = g?.wishlist?.[0]?.title;
  if (wish) add(wish, pitch("wish", ctx, locale));
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
  add([clean(ctx.call, 12), `${occasion} 선물`].filter(Boolean).join(" "), pitch("occasion", ctx, locale));
  return sanitizeIdeas(out, giftProfile(card).avoid);
}

// ── 찾을 말 목록에서 고르기(쿠팡 API 키가 없을 때) ──────────────────

export const PICKS_PER_BAND = 2;

export interface CatalogPick {
  id: string;
  reason: string;
}

export interface BandPicks {
  band: PriceBand;
  items: (CatalogGift & { reason: string })[];
}

const GENERIC_WORDS = new Set(["선물세트", "세트", "선물", "키트"]);

/** 찾을 말의 중심 낱말(마지막 낱말): 가죽 지갑 → 지갑, 핸드크림 선물세트 → 핸드크림, 14K 귀걸이 → 귀걸이 */
export function headWord(q: string): string {
  const words = q.split(/\s+/).filter((w) => w && !GENERIC_WORDS.has(w) && !/\d/.test(w));
  return words[words.length - 1] ?? q;
}

/** 메모가 '준 선물' 이야기인지 */
const GAVE = /선물|줬|주었|드렸|드림|사\s?줌|사\s?줬|사\s?드렸|받았/;

/** 고를 수 있는 것: 든 알레르기·나이(알면, 앞뒤 3살 여유)·사양하는 것·안 마시면 술·메모에 이미 준 것을 뺀다 */
export function eligibleCatalog(catalog: CatalogGift[], card: PartialCard, ctx: GiftContext, notes: string[] = []): CatalogGift[] {
  const allergies = new Set(realCodes(card.safety?.allergens));
  const skip = (card.gifts?.skip ?? []).map((x) => x.replace(/\s+/g, "")).filter((x) => x.length >= 2);
  const noDrink = card.taste?.alcohol?.level === "none";
  const given = notes.filter((n) => GAVE.test(n)).map((n) => n.replace(/\s+/g, ""));
  return catalog.filter((x) => {
    const q = x.q.replace(/\s+/g, "");
    const head = headWord(x.q);
    if (x.allergens.some((a) => allergies.has(a))) return false;
    if (ctx.age != null && (ctx.age < x.ages[0] - 3 || ctx.age > x.ages[1] + 3)) return false;
    if (skip.some((w) => q.includes(w) || w.includes(head))) return false;
    if (noDrink && x.tags.includes("술")) return false;
    if (given.some((n) => n.includes(head))) return false;
    return true;
  });
}

const CLOSE = /아내|남편|와이프|여자\s?친구|남자\s?친구|여친|남친|애인|자기/;
const ELDERS = /엄마|아빠|어머니|아버지|어머님|아버님|부모님|할머니|할아버지|장모|장인|시어머니|시아버지/;

/** 처음 열어 둘 가격대: 회사 1만원대, 연인·배우자·부모님·가족 5만원대, 그 밖에는 3만원대 */
export function defaultBand(ctx: GiftContext): PriceBand {
  if (ctx.folders.includes("회사")) return "1";
  if (ctx.folders.includes("연인") || ctx.folders.includes("가족") || CLOSE.test(ctx.call) || ELDERS.test(ctx.call)) return "5";
  return "3";
}

const BAND_WORDS: Record<PriceBand, string> = { "1": "₩10,000s", "3": "₩30,000s", "5": "₩50,000s", "10": "₩100,000s" };

const CATALOG_INSTRUCTIONS = `You pick gifts for one person from a fixed list (CATALOG) of Coupang searches, grouped by price band (${PRICE_BANDS.map((b) => `${b} = about ${BAND_WORDS[b]}`).join(", ")}).
Input:
- CALL: what the user calls this person (e.g. 아내, 아빠, or a name)
- GROUPS: the user's folders this person is in (e.g. 가족, 회사, 친구들)
- OCCASION: birthday or an anniversary name, if any
- AGE: if known
- WISHES: gifts written down for this person: either what the user wants to give or what the person said they want, so refer to them neutrally (e.g. "적어 둔 캠핑 의자"), never as "원하셨으니"
- HINTS: everything the user recorded about this person (tastes, hobbies, sizes for judging style or gender)
- AVOID: things they don't want, allergies, foods they dislike
- GIFT_CARD: whether they like gift cards
- NOTES: the user's own notes about this person, newest first. A gift already given (e.g. "작년 생일에 지갑 선물함") must not be picked again, not even the same kind. Worries or wants in notes (e.g. "요즘 허리가 아프대", "캠핑 시작했대") are strong hints.
- CATALOG: one item per line: id | search | band | ages | tags
Pick exactly ${PICKS_PER_BAND} items from each band (${PRICE_BANDS.length * PICKS_PER_BAND} in total), best first within a band. Prefer items that match their wishes, hobbies, tastes and notes; fill the rest with safe picks that suit their age, the relationship (CALL, GROUPS) and the occasion. Never pick anything in AVOID or something the notes say was already given.
${PITCH}`;

/** 목록에서 고르기 AI 요청 몸(고를 수 있는 것만 보여 주고, id는 그 안에서만) */
export function catalogRequest(profile: GiftProfile, ctx: GiftContext, locale: Locale, model: string, eligible: CatalogGift[]) {
  const base = ideasRequest(profile, ctx, locale, model);
  const lines = eligible.map((x) => `${x.id} | ${x.q} | ${x.band} | ${x.ages[0]}-${x.ages[1]} | ${x.tags.join(",")}`);
  return {
    ...base,
    instructions: CATALOG_INSTRUCTIONS,
    input: `${base.input}\nCATALOG:\n${lines.join("\n")}`,
    text: {
      format: {
        type: "json_schema",
        name: "gift_picks",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["picks"],
          properties: {
            picks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "reason"],
                properties: { id: { type: "string", enum: eligible.map((x) => x.id) }, reason: { type: "string" } },
              },
            },
          },
        },
      },
    },
  };
}

/** 고를 수 있는 것 안에서, 겹치지 않게, 가격대마다 둘까지 */
export function sanitizeCatalogPicks(raw: unknown, eligible: CatalogGift[]): CatalogPick[] {
  const byId = new Map(eligible.map((x) => [x.id, x]));
  const count = new Map<PriceBand, number>();
  const out: CatalogPick[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    const id = typeof (r as CatalogPick)?.id === "string" ? (r as CatalogPick).id : "";
    const reason = clean((r as CatalogPick)?.reason, 120);
    const item = byId.get(id);
    if (!item || !reason || out.some((p) => p.id === id)) continue;
    const n = count.get(item.band) ?? 0;
    if (n >= PICKS_PER_BAND) continue;
    count.set(item.band, n + 1);
    out.push({ id, reason });
  }
  return out;
}

export function parseCatalogPicks(body: unknown, eligible: CatalogGift[]): CatalogPick[] {
  try {
    return sanitizeCatalogPicks((JSON.parse(outputText(body) || "{}") as { picks?: unknown }).picks, eligible);
  } catch {
    return [];
  }
}

/** 이유로 쓰지 않는 맞춤 말(취향이 아니라 상황) */
const CONTEXT_TAGS = new Set(["부모님", "회사", "출근", "실용", "장마", "손주", "정장", "집", "겨울", "건강", "휴식", "취미"]);

/** AI 없이: 기록·해주고 싶은 선물·메모에 든 말과 맞는 것부터, 가격대마다 둘 */
export function ruleCatalogPicks(card: PartialCard, ctx: GiftContext, locale: Locale, eligible: CatalogGift[], notes: string[] = []): CatalogPick[] {
  const profile = giftProfile(card, notes);
  const corpus = [...profile.hints, ...profile.wishes, ...profile.notes].join(" ").replace(/\s+/g, "");
  const wishes = profile.wishes.map((w) => w.replace(/\s+/g, ""));
  const scored = eligible.map((x, i) => {
    const wish = wishes.some((w) => w.includes(headWord(x.q)));
    const hits = x.tags.filter((tag) => corpus.includes(tag));
    const taste = hits.find((tag) => !CONTEXT_TAGS.has(tag));
    const inAge = ctx.age != null && ctx.age >= x.ages[0] && ctx.age <= x.ages[1];
    const score = (wish ? 10 : 0) + hits.length * 3 + (inAge ? 1 : 0);
    const reason = wish ? pitch("wish", ctx, locale) : taste ? pitch("likes", ctx, locale, taste) : pitch("occasion", ctx, locale);
    return { x, i, score, reason };
  });
  const out: CatalogPick[] = [];
  for (const band of PRICE_BANDS) {
    scored
      .filter((s) => s.x.band === band)
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, PICKS_PER_BAND)
      .forEach((s) => out.push({ id: s.x.id, reason: s.reason }));
  }
  return out;
}

/** AI가 고른 것에 모자란 가격대를 기록만으로 고른 것으로 채워 가격대별로 묶는다 */
export function bandPicks(ai: CatalogPick[], rules: CatalogPick[], eligible: CatalogGift[]): BandPicks[] {
  const byId = new Map(eligible.map((x) => [x.id, x]));
  return PRICE_BANDS.map((band) => {
    const items: BandPicks["items"] = [];
    for (const p of [...ai, ...rules]) {
      const x = byId.get(p.id);
      if (!x || x.band !== band || items.some((i) => i.id === x.id) || items.length >= PICKS_PER_BAND) continue;
      items.push({ ...x, reason: p.reason });
    }
    return { band, items };
  }).filter((b) => b.items.length);
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
