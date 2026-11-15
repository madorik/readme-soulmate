import { NativeBridge } from "@/components/native";
import { SwipeTabs } from "@/components/SwipeTabs";
import { listPeople, requireSession, todayFor } from "@/lib/data";
import { eventsFor } from "@/lib/events";
import { pushConfigured } from "@/lib/push";
import { localReminders } from "@/lib/reminders";

// 로그인 + 온보딩까지 마친 사람만. 앱이면 생일 알림 예약·앱 잠금을 붙인다
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const people = await listPeople(s);
  // 설정에서 알림을 끄면 기기 로컬 알림도 예약하지 않는다(이미 예약된 것은 NativeBridge가 지운다)
  const reminders = s.profile.pushEnabled ? localReminders(eventsFor(people, todayFor(s.profile)), s.profile.reminderOffsets, s.profile.locale) : [];
  return (
    <main className="screen !pb-0">
      {children}
      <SwipeTabs />
      <NativeBridge locale={s.profile.locale} appLock={s.profile.appLock} reminders={reminders} pushEnabled={pushConfigured() && s.profile.pushEnabled} />
    </main>
  );
}
