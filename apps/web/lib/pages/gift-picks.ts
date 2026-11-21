import "server-only";
import type { YMD } from "@readme/core";
import type { Person, Session } from "@/lib/data";
import { isGenericBasis, type GiftContext } from "@/lib/gift-core";
import { giftContext, giftLinkPicks, giftNotes, giftPicks, giftPicksConfigured } from "@/lib/gifts";
import { track } from "@/lib/track";
import type { GiftPicksData } from "./gift-picks.data";

/**
 * 이런 선물은 어때요: 이 사람 기록 전체와 메모로 고른 선물(화면은 components/GiftPicksView). 하나도 못 고르면 null.
 * max: 상품 방식에서 찾을 말 몇 개까지. skip: 다시 고르기로 넘어온 '지난번에 보인 것'.
 * source: 어느 화면에서 여는지(이용 기록용, 기본 plan)
 */
export async function loadGiftPicks(
  s: Session,
  person: Person,
  opts: { occasion: GiftContext["occasion"]; today: YMD; max?: number; skip?: string[]; source?: "reminder" | "plan" },
): Promise<GiftPicksData | null> {
  const { occasion, today, max, skip = [], source = "plan" } = opts;
  const [ctx, notes] = await Promise.all([giftContext(s, person, occasion, today), giftNotes(s, person)]);
  if (!giftPicksConfigured()) {
    const { bands, initial, note } = await giftLinkPicks(s, person, ctx, notes, skip);
    if (!bands.length) return null;
    const shown = bands.flatMap((b) => b.items.map((i) => i.id));
    const next = [...new Set([...skip, ...shown])].slice(-60).join(",");
    track("gift_picks_view", { userId: s.user.id, source });
    if (skip.length) track("gift_reroll", { userId: s.user.id });
    return {
      kind: "links",
      bands: bands.map((b) => ({ band: b.band, items: b.items.map((i) => ({ id: i.id, title: i.q, reason: i.reason, url: i.url, image: i.image, basis: i.basis.filter((w) => !isGenericBasis(w, ctx)), badge: i.badge })) })),
      initial,
      note,
      next,
      source,
    };
  }
  const picks = await giftPicks(s, person, ctx, notes, max);
  if (!picks.length) return null;
  return { kind: "products", picks };
}
