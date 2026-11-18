import Link from "next/link";
import { cancelInvite } from "@/app/actions/request";
import { AppLockSetting, PendingButton, PushSetting, ReminderSetting } from "@/app/(app)/privacy/Settings";
import { TabBar } from "@/components/chrome";
import { DeleteAccount } from "@/components/DeleteAccount";
import { LanguageSetting } from "@/components/LanguageSetting";
import { Icon } from "@/components/marks";
import { TossLegalRows, TossReminderSwitch } from "@/components/shell/TossSettings";
import type { PrivacyData } from "@/lib/pages/types";
import { SHELL } from "@/lib/shell";
import { makeT } from "@/lib/t";

export function PrivacyView({ locale, isAnonymous, invites, localeChoice, appLock, pushEnabled, reminderOffsets, ai, tossReminder }: PrivacyData) {
  const t = makeT(locale);

  return (
    <>
      <h1 className="headline px-6 pt-3 text-[28px]">{t("privacy.title")}</h1>
      {isAnonymous ? (
        <div className="mx-6 mt-3 flex items-center gap-3 rounded-2xl bg-fill px-4 py-3">
          <span className="flex-1 text-[13.5px] leading-[1.5]">{t("privacy.demo")}</span>
          <a href="/login?next=/home" className="flex min-h-11 shrink-0 items-center text-[14px] font-bold underline underline-offset-4">
            {t("privacy.signIn")}
          </a>
        </div>
      ) : null}

      {/* 아직 아무도 안 연 물어보기 링크는 있을 때만(퍼지면 아무나 답할 수 있으니 취소할 곳) */}
      {invites.length ? (
        <>
          <h2 className="section-title px-6 pt-5">{t("privacy.links")}</h2>
          <ul className="mx-6 mt-2 flex flex-col">
            {invites.map((i) => (
              <li key={i.id} className="flex min-h-[56px] items-center gap-3 border-t border-rule">
                <span className="min-w-0 flex-1 text-[15.5px] font-bold">{t("privacy.linkRequest", { name: i.recipientName })}</span>
                <form action={cancelInvite}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="back" value="/privacy" />
                  <PendingButton className="flex min-h-11 items-center pl-3 pr-1 text-[14px] font-bold text-red">{t("privacy.linkCancel")}</PendingButton>
                </form>
              </li>
            ))}
            <li className="border-t border-rule" />
          </ul>
        </>
      ) : null}

      <h2 className="section-title px-6 pt-8">{t("privacy.appSettings")}</h2>
      <div className="mx-6 mt-2 flex flex-col">
        <LanguageSetting choice={localeChoice} back="/privacy" t={t} className="border-t border-rule" />
        {/* 토스 미니앱에는 앱 잠금이 없고, 알림은 토스 알림 동의로 켠다(TossReminderSwitch) */}
        {SHELL === "toss" ? null : <AppLockSetting locale={locale} enabled={appLock} />}
        {SHELL === "toss" ? <TossReminderSwitch locale={locale} reminder={tossReminder} /> : <PushSetting locale={locale} enabled={pushEnabled} />}
        {/* 알림을 끄면 언제 알릴지는 숨긴다 */}
        {(SHELL === "toss" ? tossReminder?.on : pushEnabled) ? (
          <div id="reminders" className="border-t border-rule py-4">
            <ReminderSetting locale={locale} offsets={reminderOffsets} />
          </div>
        ) : null}
        {/* 소개 화면은 앱(웹) 것이라 토스 미니앱에는 없다 */}
        {SHELL === "toss" ? null : (
          <Link href="/home?tour=1" className="flex min-h-16 items-center gap-3 border-t border-rule">
            <span className="flex-1 text-[15.5px] font-bold">{t("privacy.replayIntro")}</span>
            <Icon name="chevron" size={18} className="shrink-0 text-muted" />
          </Link>
        )}
      </div>

      <TossLegalRows locale={locale} />

      {/* 계정 삭제는 설정 맨 아래(로그아웃은 홈 오른쪽 위 내 얼굴 메뉴) */}
      <h2 className="section-title px-6 pt-8">{t("profile.account")}</h2>
      {/* 토스 미니앱 출시를 멈춰서(2026-11-18) '토스에서 쓰기'(TossLinkCode)는 숨겨 둔다. 다시 하면 이 자리에 넣는다 */}
      <div className="mx-6 mt-2 border-y border-rule py-1.5">
        {/* 내 기록 내려받기는 우리 서버 세션이 필요해 토스 미니앱에는 없다 */}
        {SHELL === "toss" ? null : (
          <a href="/api/export" download="remember-you.json" className="flex min-h-12 items-center gap-3 border-b border-rule text-[15.5px] font-bold">
            <span className="flex-1">{t("privacy.exportData")}</span>
            <Icon name="up" size={18} className="shrink-0 rotate-180 text-muted" />
          </a>
        )}
        <DeleteAccount locale={locale} />
      </div>

      <div className="h-8" />
      <TabBar active="privacy" t={t} voice={ai} />
    </>
  );
}
