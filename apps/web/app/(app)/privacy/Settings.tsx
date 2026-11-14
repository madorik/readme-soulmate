"use client";

import type { Locale, ReminderOffset } from "@readme/core";
import { useState } from "react";
import { deleteAccount, setPreference } from "@/app/actions/account";
import { saveOffsets } from "@/app/actions/card";
import { ReminderPicker } from "@/components/editors/DatesEditor";
import { useT } from "@/components/editors/shared";
import { SwitchLook } from "@/components/marks";
import { useIsNative } from "@/components/native";

export function AppLockSetting({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const t = useT(locale);
  const native = useIsNative();
  return (
    <form action={setPreference} className="flex min-h-16 items-center gap-3 border-t border-rule">
      <input type="hidden" name="key" value="app_lock" />
      <input type="hidden" name="value" value={enabled ? "0" : "1"} />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15.5px] font-bold">{t("privacy.lock")}</span>
        <span className="text-[12.5px] text-muted">{native ? t("privacy.lockSub") : t("privacy.lockUnavailable")}</span>
      </div>
      <button disabled={!native && !enabled} aria-label={t("privacy.lock")} aria-pressed={enabled} className="flex h-11 w-14 shrink-0 items-center justify-end disabled:opacity-40">
        <SwitchLook on={enabled} />
      </button>
    </form>
  );
}

export function ReminderSetting({ locale, offsets }: { locale: Locale; offsets: ReminderOffset[] }) {
  const t = useT(locale);
  const [value, setValue] = useState(offsets);
  const dirty = value.join() !== offsets.join();
  return (
    <form action={saveOffsets} className="flex flex-col gap-2">
      <input type="hidden" name="offsets" value={JSON.stringify(value)} />
      <ReminderPicker value={value} onChange={setValue} locale={locale} />
      {dirty ? <button className="btn-primary !h-11 !text-[14.5px]">{t("common.save")}</button> : null}
    </form>
  );
}

export function DeleteAccount({ locale }: { locale: Locale }) {
  const t = useT(locale);
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <button type="button" onClick={() => setAsk(true)} className="flex min-h-11 items-center text-[14px] font-bold text-red">
        {t("privacy.delete")}
      </button>
    );
  }
  return (
    <form action={deleteAccount} role="alertdialog" aria-label={t("privacy.delete")} className="mt-2 flex w-full flex-col gap-3 rounded-[14px] p-4 shadow-[inset_0_0_0_1.5px_var(--color-red)]">
      <input type="hidden" name="confirm" value="1" />
      <p className="text-[14px] leading-[1.55]">{t("privacy.deleteConfirm")}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAsk(false)} className="btn-soft">
          {t("common.cancel")}
        </button>
        <button className="btn-soft !bg-red !text-white !shadow-none">{t("privacy.deleteYes")}</button>
      </div>
    </form>
  );
}
