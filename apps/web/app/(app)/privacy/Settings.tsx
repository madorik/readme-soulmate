"use client";

import type { Locale, ReminderOffset } from "@readme/core";
import { useState } from "react";
import { setPreference } from "@/app/actions/account";
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
        {native ? null : <span className="text-[12.5px] text-muted">{t("privacy.lockUnavailable")}</span>}
      </div>
      <button disabled={!native && !enabled} aria-label={t("privacy.lock")} aria-pressed={enabled} className="flex h-11 w-14 shrink-0 items-center justify-end disabled:opacity-40">
        <SwitchLook on={enabled} />
      </button>
    </form>
  );
}

/** 알림 받기: 끄면 푸시와 기기 로컬 알림(생일·기념일, 요청 답장, 공유 수락)을 모두 멈춘다 */
export function PushSetting({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const t = useT(locale);
  return (
    <form action={setPreference} className="flex min-h-16 items-center gap-3 border-t border-rule">
      <input type="hidden" name="key" value="push_enabled" />
      <input type="hidden" name="value" value={enabled ? "0" : "1"} />
      <span className="flex-1 text-[15.5px] font-bold">{t("privacy.push")}</span>
      <button aria-label={t("privacy.push")} aria-pressed={enabled} className="flex h-11 w-14 shrink-0 items-center justify-end">
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
