import "server-only";
import type { Locale, YMD } from "@readme/core";
import { aiConfigured } from "./ai";
import { open, seal } from "./crypto";
import { displayName, folderName, listFolders, type Person, type Session } from "./data";
import { asSystem } from "./db";
import { makeT } from "./i18n";
import {
  COUPANG_SEARCH_PATH,
  IDEA_COUNT,
  coupangAuthorization,
  coupangSearchQuery,
  coupangSearchUrl,
  giftBasis,
  giftProfile,
  ideasRequest,
  normalizeKeyword,
  parseCoupangSearch,
  parseIdeas,
  ruleIdeas,
  sanitizeIdeas,
  type CoupangProduct,
  type CoupangResult,
  type GiftContext,
  type GiftIdea,
} from "./gift-core";

// 선물 추천: 사람 기록 → 찾을 말 네 개(AI, 없으면 기록만으로) → 쿠팡 파트너스 상품 검색.
// 키(COUPANG_ACCESS_KEY·COUPANG_SECRET_KEY)가 없으면 기능을 숨긴다. COUPANG_SUB_ID(채널), COUPANG_HOURLY_LIMIT(기본 20), COUPANG_BASE_URL(시험용 가짜 서버).
// 쿠팡 API는 호출 한도를 넘으면 계정이 막힐 수 있어서: 같은 찾을 말은 하루 동안 DB에 둔 결과를 다시 쓰고, 지난 한 시간 호출이 한도에 닿으면 부르지 않고 쿠팡 검색 링크만 준다.

export type { CoupangProduct, GiftIdea };

export interface GiftPick extends GiftIdea {
  products: CoupangProduct[];
  /** 더 보기: 쿠팡 검색 화면 */
  more: string;
}

export function giftPicksConfigured(): boolean {
  return !!(process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY);
}

const IDEAS_FRESH_DAYS = 14;
const SEARCH_FRESH_HOURS = 24;
const RETRY_MINUTES = 10;
const PRODUCTS_PER_IDEA = 6;

function hourlyLimit(): number {
  const n = Number(process.env.COUPANG_HOURLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

function coupangBase(): { base: string; extraHost?: string } {
  const custom = process.env.COUPANG_BASE_URL?.replace(/\/+$/, "");
  if (!custom) return { base: "https://api-gateway.coupang.com" };
  return { base: custom, extraHost: new URL(custom).host };
}

/** 이 사람을 위한 상황: 부르는 말, 든 폴더(한국어 이름), 챙길 날, 나이(태어난 해를 알면) */
export async function giftContext(s: Session, p: Person, occasion: GiftContext["occasion"], today: YMD): Promise<GiftContext> {
  const folders = await s.tx((q) => listFolders(q, s.user.id));
  const ko = makeT("ko");
  const year = p.card.dates?.birthday?.year;
  return {
    call: displayName(p),
    folders: folders.filter((f) => p.folderIds.includes(f.id)).map((f) => folderName(f, ko)),
    occasion,
    age: year && year > 1900 && year <= today.y ? today.y - year : null,
  };
}

async function askIdeas(ctx: GiftContext, p: Person, locale: Locale): Promise<GiftIdea[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return [];
  const profile = giftProfile(p.card);
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(ideasRequest(profile, ctx, locale, process.env.OPENAI_MODEL || "gpt-6-luna")),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`ai_http_${res.status}`);
  return parseIdeas(await res.json(), profile.avoid);
}

/** 찾을 말: 기록·날이 그대로면 지난번 것(14일), 아니면 새로 고른다. AI가 없거나 실패하면 기록만으로(저장하지 않는다) */
export async function giftIdeas(s: Session, p: Person, ctx: GiftContext, locale: Locale): Promise<GiftIdea[]> {
  const profile = giftProfile(p.card);
  const basis = giftBasis(profile, ctx, locale);
  const scope = `gift-ideas:${s.user.id}:${p.contactId}`;
  const row = await s.tx((q) =>
    q.one<{ basis: string; payload: unknown; fresh: boolean }>(
      `select basis, payload, created_at > now() - make_interval(days => $3) as fresh from gift_ideas where user_id = $1 and contact_id = $2`,
      [s.user.id, p.contactId, IDEAS_FRESH_DAYS],
    ),
  );
  if (row && row.basis === basis && row.fresh) {
    const kept = sanitizeIdeas(open(row.payload, scope), profile.avoid);
    if (kept.length) return kept;
  }
  const rules = () => ruleIdeas(p.card, ctx, locale);
  if (!aiConfigured()) return rules();
  let ideas: GiftIdea[] = [];
  try {
    ideas = await askIdeas(ctx, p, locale);
  } catch (e) {
    console.warn("gift ideas failed", e instanceof Error ? e.message : e);
  }
  if (!ideas.length) return rules();
  await s.tx((q) =>
    q(
      `insert into gift_ideas (user_id, contact_id, basis, payload) values ($1, $2, $3, $4)
       on conflict (user_id, contact_id) do update set basis = excluded.basis, payload = excluded.payload, created_at = now()`,
      [s.user.id, p.contactId, basis, JSON.stringify(seal(ideas, scope))],
    ),
  );
  return ideas;
}

function readCached(payload: unknown): CoupangResult | null {
  const r = payload as CoupangResult | null;
  return r && Array.isArray(r.products) ? r : null;
}

/** 쿠팡 상품 검색(하루 동안 다시 쓰기 + 시간당 한도). 못 받으면 지난 결과나 null */
export async function coupangSearch(raw: string): Promise<CoupangResult | null> {
  const keyword = normalizeKeyword(raw);
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!keyword || !accessKey || !secretKey) return null;

  const got = await asSystem(async (q) => {
    const row = await q.one<{ payload: unknown; ok: boolean; fresh: boolean; recent: boolean }>(
      `select payload, ok, fetched_at > now() - make_interval(hours => $2) as fresh, fetched_at > now() - make_interval(mins => $3) as recent
       from coupang_searches where keyword = $1`,
      [keyword, SEARCH_FRESH_HOURS, RETRY_MINUTES],
    );
    const cached = readCached(row?.payload);
    if (row && ((row.ok && row.fresh) || (!row.ok && row.recent))) return { cached, claim: false };
    // 한도 세기는 한 번에 한 요청만(같은 순간 여러 화면이 불러도 넘지 않게). 쿠팡이 429로 막았으면 한 시간 쉰다
    await q("select pg_advisory_xact_lock(hashtext('coupang_calls'))");
    const busy = await q.one<{ n: number; limited: boolean }>(
      "select count(*)::int as n, coalesce(bool_or(limited), false) as limited from coupang_calls where at > now() - interval '1 hour'",
    );
    if (!busy || busy.limited || busy.n >= hourlyLimit()) return { cached, claim: false };
    await q("delete from coupang_calls where at < now() - interval '1 day'");
    await q("delete from coupang_searches where fetched_at < now() - interval '7 days'");
    await q("insert into coupang_calls default values");
    await q(
      `insert into coupang_searches (keyword, ok, fetched_at) values ($1, false, now())
       on conflict (keyword) do update set ok = false, fetched_at = now()`,
      [keyword],
    );
    return { cached, claim: true };
  });
  if (!got.claim) return got.cached;

  const { base, extraHost } = coupangBase();
  const query = coupangSearchQuery(keyword, PRODUCTS_PER_IDEA, process.env.COUPANG_SUB_ID || undefined);
  let result: CoupangResult | null = null;
  let limited = false;
  try {
    const res = await fetch(`${base}${COUPANG_SEARCH_PATH}?${query}`, {
      headers: { authorization: coupangAuthorization("GET", COUPANG_SEARCH_PATH, query, accessKey, secretKey, new Date()), "content-type": "application/json;charset=UTF-8" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (res.status === 429) limited = true;
    else if (res.ok) result = parseCoupangSearch(await res.json(), extraHost);
    if (!result) console.warn("coupang search failed", res.status);
  } catch (e) {
    console.warn("coupang search failed", e instanceof Error ? e.message : e);
  }
  await asSystem(async (q) => {
    if (result) await q("update coupang_searches set payload = $2, ok = true, fetched_at = now() where keyword = $1", [keyword, JSON.stringify(result)]);
    if (limited) await q("insert into coupang_calls (limited) values (true)");
  });
  return result ?? got.cached;
}

/** 찾을 말 몇 개와 그 상품들 */
export async function giftPicks(s: Session, p: Person, ctx: GiftContext, max = IDEA_COUNT): Promise<GiftPick[]> {
  const ideas = (await giftIdeas(s, p, ctx, s.profile.locale)).slice(0, max);
  const found = await Promise.all(ideas.map((i) => coupangSearch(i.keyword).catch(() => null)));
  return ideas.map((i, n) => ({ ...i, products: found[n]?.products.slice(0, PRODUCTS_PER_IDEA) ?? [], more: found[n]?.landingUrl ?? coupangSearchUrl(i.keyword) }));
}
