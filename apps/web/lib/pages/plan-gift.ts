import "server-only";
import { redirect } from "next/navigation";
import { requireSession, todayFor } from "@/lib/data";
import { eventsFor } from "@/lib/events";
import { giftPicksOn } from "@/lib/gifts";
import { pickBack, resolvePick } from "@/lib/plan";
import type { GiftPicksData } from "./gift-picks.data";
import { loadGiftPicks } from "./gift-picks";
import type { PlanGiftData } from "./plan-gift.data";
import type { PageInput } from "./routes";

/** 같이 고르기 > 선물 고르기: 고른 사람들(없으면 고르기로 돌려보낸다) */
export async function loadPlanGift({ searchParams }: PageInput): Promise<PlanGiftData> {
  const s = await requireSession();
  const today = todayFor(s.profile);
  const pick = await resolvePick(s, searchParams);
  if (!pick.people.length) redirect(pickBack(pick.query, "gift"));
  return { locale: s.profile.locale, today, people: pick.people, back: pickBack(pick.query, "gift"), picksOn: giftPicksOn() };
}

/** 토스 미니앱: 화면을 한 번에 그리므로 사람마다 고른 선물(웹은 Suspense로 나중에 채우는 것)까지 기다려 넣는다 */
export async function loadPlanGiftAll(input: PageInput): Promise<PlanGiftData & { picksBy: Record<string, GiftPicksData | null> }> {
  const data = await loadPlanGift(input);
  const picksBy: Record<string, GiftPicksData | null> = {};
  if (data.picksOn) {
    const s = await requireSession();
    await Promise.all(
      data.people.map(async (p) => {
        const next = eventsFor([p], data.today)[0];
        picksBy[p.contactId] = await loadGiftPicks(s, p, { occasion: next ? { kind: next.kind, label: next.label ?? "" } : null, today: data.today, max: 2 });
      }),
    );
  }
  return { ...data, picksBy };
}
