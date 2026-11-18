import "server-only";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/data";
import { pickBack, resolvePick } from "@/lib/plan";
import type { PlanMenuData } from "./plan-menu.data";
import type { PageInput } from "./routes";

/** 같이 고르기 > 메뉴 고르기: 같이 먹는 사람들(고른 사람이 없으면 고르기로 돌려보낸다) */
export async function loadPlanMenu({ searchParams }: PageInput): Promise<PlanMenuData> {
  const s = await requireSession();
  const pick = await resolvePick(s, searchParams);
  if (!pick.people.length) redirect(pickBack(pick.query));
  return { locale: s.profile.locale, diners: pick.diners, back: pickBack(pick.query) };
}
