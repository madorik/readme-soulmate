import { translate } from "@readme/core";
import { headers } from "next/headers";
import { NativeBridge } from "@/components/native";
import { ResumeRefresh } from "@/components/ResumeRefresh";
import { SwipeTabs } from "@/components/SwipeTabs";
import { listPeople, requireSession, todayFor } from "@/lib/data";
import { eventsFor } from "@/lib/events";
import { pushConfigured } from "@/lib/push";
import { localReminders } from "@/lib/reminders";

// 로그인 + 온보딩까지 마친 사람만. 앱이면 생일 알림 예약·앱 잠금을 붙인다
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const { locale } = s.profile;
  // 앱 웹뷰(UA에 ReadmeApp)일 때만 알림 예약용 사람 목록을 읽는다: 웹 브라우저는 쓰지 않는 값이라 읽지 않는다
  const nativeUa = /ReadmeApp/.test((await headers()).get("user-agent") ?? "");
  // 설정에서 알림을 끄면 기기 로컬 알림도 예약하지 않는다(이미 예약된 것은 NativeBridge가 지운다)
  const reminders = nativeUa && s.profile.pushEnabled ? localReminders(eventsFor(await listPeople(s), todayFor(s.profile)), s.profile.reminderOffsets, locale) : [];
  return (
    <main className="screen !pb-0 overflow-x-clip">
      {children}
      <SwipeTabs />
      <ResumeRefresh />
      <NativeBridge
        locale={locale}
        appLock={s.profile.appLock}
        reminders={reminders}
        pushEnabled={pushConfigured() && s.profile.pushEnabled}
        nativeUa={nativeUa}
        labels={{ title: translate(locale, "lock.title"), appName: translate(locale, "app.name"), unlock: translate(locale, "lock.unlock") }}
      />
    </main>
  );
}
