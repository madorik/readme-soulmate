import { RELATIONS, SECTIONS } from "@readme/core";
import { setPreference } from "@/app/actions/account";
import { cancelInvite, setGrant, setGrantSections } from "@/app/actions/share";
import { Avatar } from "@/components/Avatar";
import { TabBar } from "@/components/chrome";
import { LanguageSetting } from "@/components/LanguageSetting";
import { SwitchLook } from "@/components/marks";
import { listOpenInvites, listShares, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { AppLockSetting, ReminderSetting } from "./Settings";

export default async function Privacy() {
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const [shares, invites] = await Promise.all([s.tx((q) => listShares(q, s.user.id)), s.tx((q) => listOpenInvites(q))]);
  const active = shares.filter((x) => !x.revoked).length;
  const relationLabel = (code: string | null) => RELATIONS.find((r) => r.code === code)?.label[locale] ?? "";

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
      <h2 className="section-title px-6 pt-5">{t("privacy.shareSettings")}</h2>
      <div className="flex flex-col gap-1 px-6 pt-2">
        <span className="text-[15.5px] font-bold">{t("privacy.count", { n: active })}</span>
      </div>

      <ul className="mx-6 mt-3 flex flex-col">
        {shares.map((x) => {
          const name = x.name || "?";
          const scope = x.revoked
            ? t("privacy.cutDone")
            : x.sections.length === SECTIONS.length
              ? t("privacy.all")
              : x.sections.map((sec) => t(`section.${sec}` as "section.safety")).join(t("common.and"));
          return (
            <li key={x.viewerId} className="border-t border-rule">
              <div className={`flex min-h-[62px] items-center gap-3 ${x.revoked ? "opacity-50" : ""}`}>
                <Avatar config={x.avatar} size={40} label={t("avatar.of", { name })} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15.5px] font-bold">
                    {name} <span className="font-medium text-muted">{relationLabel(x.relation)}</span>
                  </span>
                  <span className="truncate text-[12.5px] text-muted">{scope}</span>
                </div>
                <form action={setGrant}>
                  <input type="hidden" name="viewerId" value={x.viewerId} />
                  <input type="hidden" name="cut" value={x.revoked ? "0" : "1"} />
                  <button className={`flex min-h-11 items-center pl-3 pr-1 text-[14px] font-bold ${x.revoked ? "" : "text-red"}`}>{x.revoked ? t("privacy.restore") : t("privacy.cut")}</button>
                </form>
              </div>
              {!x.revoked ? (
                <details className="pb-2">
                  <summary className="cursor-pointer list-none pb-1 text-[12.5px] font-bold text-muted underline underline-offset-4">{t("share.what")}</summary>
                  <form action={setGrantSections} className="flex flex-col gap-1 pt-1">
                    <input type="hidden" name="viewerId" value={x.viewerId} />
                    {SECTIONS.map((sec) => (
                      <label key={sec} className="flex min-h-10 items-center gap-2.5 text-[14px] font-semibold">
                        <input type="checkbox" name="sections" value={sec} defaultChecked={x.sections.includes(sec)} className="h-5 w-5 accent-[var(--color-ink)]" />
                        {t(`section.${sec}` as "section.safety")}
                      </label>
                    ))}
                    <button className="btn-primary !h-11 !text-[14.5px]">{t("common.save")}</button>
                  </form>
                </details>
              ) : null}
            </li>
          );
        })}
        <li className="border-t border-rule" />
      </ul>

      {/* 보낸 링크는 있을 때만 */}
      {invites.length ? (
        <>
          <h2 className="px-6 pb-1.5 pt-5 text-[13px] font-bold text-muted">{t("privacy.links")}</h2>
          <ul className="mx-6 flex flex-col">
            {invites.map((i) => (
              <li key={i.id} className="flex min-h-[56px] items-center gap-3 border-t border-rule">
                <span className="min-w-0 flex-1 text-[15.5px] font-bold">
                  {i.kind === "share" ? t("privacy.linkShare", { relation: relationLabel(i.relation) || t("app.name") }) : t("privacy.linkRequest", { name: i.recipientName })}
                </span>
                <form action={cancelInvite}>
                  <input type="hidden" name="id" value={i.id} />
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
        <form action={setPreference} className="flex min-h-16 items-center gap-3 border-t border-rule">
          <input type="hidden" name="key" value="notify_views" />
          <input type="hidden" name="value" value={s.profile.notifyViews ? "0" : "1"} />
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15.5px] font-bold">{t("privacy.views")}</span>
            <span className="text-[12.5px] text-muted">{t("privacy.viewsSub")}</span>
          </div>
          <button aria-label={t("privacy.views")} aria-pressed={s.profile.notifyViews} className="flex h-11 w-14 shrink-0 items-center justify-end">
            <SwitchLook on={s.profile.notifyViews} />
          </button>
        </form>
        <div id="reminders" className="border-t border-rule py-4">
          <ReminderSetting locale={locale} offsets={s.profile.reminderOffsets} />
        </div>
      </div>

      <div className="h-8" />
      <TabBar active="privacy" t={t} />
    </>
  );
}
