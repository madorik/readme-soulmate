import { redirect } from "next/navigation";

// 공유하기는 메뉴 고르기·선물 고르기 화면 안으로 옮겼다. 예전 주소로 오면 메뉴 고르기로 보낸다
export default async function PlanShare({ searchParams }: { searchParams: Promise<{ with?: string; me?: string }> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.with) q.set("with", sp.with);
  if (sp.me) q.set("me", sp.me);
  redirect(`/plan/menu?${q.toString()}`);
}
