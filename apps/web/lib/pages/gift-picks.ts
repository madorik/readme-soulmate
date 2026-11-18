import "server-only";
import type { YMD } from "@readme/core";
import type { Person, Session } from "@/lib/data";
import { coupangSearchUrl, isGenericBasis, type GiftContext } from "@/lib/gift-core";
import { giftCardUrl, giftContext, giftLinkPicks, giftNotes, giftPicks, giftPicksConfigured } from "@/lib/gifts";
import { isTossRequest } from "@/lib/shell-server";
import { makeT } from "@/lib/t";
import { track } from "@/lib/track";
import type { GiftPicksData } from "./gift-picks.data";

/**
 * 이런 선물은 어때요: 이 사람 기록 전체와 메모로 고른 선물(화면은 components/GiftPicksView). 하나도 못 고르면 null.
 * max: 상품 방식에서 찾을 말 몇 개까지. skip: 다시 고르기로 넘어온 '지난번에 보인 것'.
 * card: 주면 고른 선물로 가족에게 보낼 카드 주소를 만든다(부르는 말·챙길 날 한 줄)
 */
/** 토스 미니앱에서는 바깥 광고(쿠팡 파트너스) 링크를 쓰지 않는다: 같은 상품·찾을 말의 쿠팡 일반 검색으로 */
function withoutAffiliate(data: GiftPicksData | null): GiftPicksData | null {
  if (!data) return data;
  if (data.kind === "links") {
    return { ...data, bands: data.bands.map((b) => ({ ...b, items: b.items.map((i) => ({ ...i, url: coupangSearchUrl(i.title) })) })) };
  }
  return { ...data, picks: data.picks.map((p) => ({ ...p, more: coupangSearchUrl(p.keyword), products: p.products.map((x) => ({ ...x, url: coupangSearchUrl(x.name) })) })) };
}

export async function loadGiftPicks(
  s: Session,
  person: Person,
  opts: { occasion: GiftContext["occasion"]; today: YMD; max?: number; skip?: string[]; card?: { name: string; event: string } },
): Promise<GiftPicksData | null> {
  const data = await pickGifts(s, person, opts);
  return (await isTossRequest()) ? withoutAffiliate(data) : data;
}

async function pickGifts(
  s: Session,
  person: Person,
  { occasion, today, max, skip = [], card }: { occasion: GiftContext["occasion"]; today: YMD; max?: number; skip?: string[]; card?: { name: string; event: string } },
): Promise<GiftPicksData | null> {
  const { locale } = s.profile;
  const t = makeT(locale);
  const [ctx, notes] = await Promise.all([giftContext(s, person, occasion, today), giftNotes(s, person)]);
  if (!giftPicksConfigured()) {
    const { bands, initial, note } = await giftLinkPicks(s, person, ctx, notes, skip);
    if (!bands.length) return null;
    const shown = bands.flatMap((b) => b.items.map((i) => i.id));
    const next = [...new Set([...skip, ...shown])].slice(-60).join(",");
    const share = card ? { url: await giftCardUrl(s.user.id, { locale, name: card.name, event: card.event, ids: shown }), text: t("picks.shareText", { name: card.name }) } : null;
    track("gift_picks_view", { userId: s.user.id, source: card ? "reminder" : "plan" });
    if (skip.length) track("gift_reroll", { userId: s.user.id });
    return {
      kind: "links",
      bands: bands.map((b) => ({ band: b.band, items: b.items.map((i) => ({ id: i.id, title: i.q, reason: i.reason, url: i.url, image: i.image, basis: i.basis.filter((w) => !isGenericBasis(w, ctx)) })) })),
      initial,
      note,
      next,
      share,
      source: card ? "reminder" : "plan",
    };
  }
  const picks = await giftPicks(s, person, ctx, notes, max);
  if (!picks.length) return null;
  return { kind: "products", picks };
}
