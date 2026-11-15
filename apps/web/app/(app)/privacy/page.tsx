import { cancelInvite } from "@/app/actions/request";
import { TabBar } from "@/components/chrome";
import { LanguageSetting } from "@/components/LanguageSetting";
import { listOpenInvites, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { AppLockSetting, PushSetting, ReminderSetting } from "./Settings";
import { aiConfigured } from "@/lib/ai";

export default async function Privacy() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const invites = await s.tx((q) => listOpenInvites(q));

  return (
    <>
      <h1 className="headline px-6 pt-3 text-[28px]">{t("privacy.title")}</h1>
      {s.user.isAnonymous ? (
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
                  <button className="flex min-h-11 items-center pl-3 pr-1 text-[14px] font-bold text-red">{t("privacy.linkCancel")}</button>
                </form>
              </li>
            ))}
            <li className="border-t border-rule" />
          </ul>
        </>
      ) : null}

      <h2 className="section-title px-6 pt-8">{t("privacy.appSettings")}</h2>
      <div className="mx-6 mt-2 flex flex-col">
        <LanguageSetting choice={s.profile.localeChoice} back="/privacy" t={t} className="border-t border-rule" />
        <AppLockSetting locale={locale} enabled={s.profile.appLock} />
        <PushSetting locale={locale} enabled={s.profile.pushEnabled} />
        {/* 알림을 끄면 언제 알릴지는 숨긴다 */}
        {s.profile.pushEnabled ? (
          <div id="reminders" className="border-t border-rule py-4">
            <ReminderSetting locale={locale} offsets={s.profile.reminderOffsets} />
          </div>
        ) : null}
      </div>

      <div className="h-8" />
      <TabBar active="privacy" t={t} voice={aiConfigured()} />
    </>
  );
}
