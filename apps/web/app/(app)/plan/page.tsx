import { redirect } from "next/navigation";

// 같이 고르기는 '사람들' 화면 안의 고르기로 옮겼다. 예전 주소로 오면 고르기 모드로 보낸다
export default async function Plan({ searchParams }: { searchParams: Promise<{ with?: string; me?: string }> }) {
  const sp = await searchParams;
  const q = new URLSearchParams({ pick: "1" });
  if (sp.with) q.set("with", sp.with);
  if (sp.me) q.set("me", sp.me);
  redirect(`/people?${q.toString()}`);
}
