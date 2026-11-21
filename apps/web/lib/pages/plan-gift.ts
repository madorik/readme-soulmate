import "server-only";
import { redirect } from "next/navigation";
import { requireSession, todayFor, unreadAnswers } from "@/lib/data";
import { giftPicksOn } from "@/lib/gifts";
import { pickBack, resolvePick } from "@/lib/plan";
import type { PlanGiftData } from "./plan-gift.data";
import type { PageInput } from "./routes";

/** 같이 고르기 > 선물 고르기: 고른 사람들(없으면 고르기로 돌려보낸다) */
export async function loadPlanGift({ searchParams }: PageInput): Promise<PlanGiftData> {
  const s = await requireSession();
  const today = todayFor(s.profile);
  const pick = await resolvePick(s, searchParams);
  if (!pick.people.length) redirect(pickBack(pick.query, "gift"));
  const answered = new Set((await s.tx((q) => unreadAnswers(q, s.user.id))).map((a) => a.contactId));
  return { locale: s.profile.locale, today, people: pick.people, back: pickBack(pick.query, "gift"), picksOn: giftPicksOn(), answeredIds: pick.people.map((p) => p.contactId).filter((id) => answered.has(id)) };
}
