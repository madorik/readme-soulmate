import "server-only";
import { redirect } from "next/navigation";
import type { PlanData } from "./plan.data";
import type { PageInput } from "./routes";

// 같이 고르기는 '사람들' 화면 안의 고르기로 옮겼다. 예전 주소로 오면 고르기 모드로 보낸다
export async function loadPlan({ searchParams: sp }: PageInput): Promise<PlanData> {
  const q = new URLSearchParams({ pick: "1" });
  if (sp.with) q.set("with", sp.with);
  if (sp.me) q.set("me", sp.me);
  redirect(`/people?${q.toString()}`);
}
