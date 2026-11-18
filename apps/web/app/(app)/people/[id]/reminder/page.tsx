import { PersonReminderView } from "@/components/pages/PersonReminderView";
import { startPersonReminder } from "@/lib/pages/person-reminder";
import { firstParams } from "@/lib/pages/routes";

// 선물 힌트: 선물 고르기는 기다리지 않는다(화면을 먼저 그리고 Suspense로 채운다)
export default async function Reminder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [p, sp] = await Promise.all([params, searchParams]);
  return <PersonReminderView {...await startPersonReminder({ params: p, searchParams: firstParams(sp) })} />;
}
