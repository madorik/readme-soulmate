"use client";

import type { Locale, ReminderOffset } from "@readme/core";
import { useOptimistic, useState } from "react";
import { useFormStatus } from "react-dom";
import { setPreference } from "@/app/actions/account";
import { saveOffsets } from "@/app/actions/card";
import { ReminderPicker } from "@/components/editors/ReminderPicker";
import { useT } from "@/components/editors/shared";
import { SwitchLook } from "@/components/marks";
import { useIsNative } from "@/components/native";

/** 서버 액션이 도는 동안 흐리게 하고 누르지 못하게 하는 단추(폼 안에서). 움직임 줄이기를 켜면 깜빡이지 않는다 */
export function PendingButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-busy={pending} className={`${className} disabled:opacity-50 motion-safe:disabled:animate-pulse`}>
      {children}
    </button>
  );
}

/** 켜고 끄는 스위치 줄: 누르는 즉시 켠 모습(useOptimistic)으로 바꾸고, 저장이 실패하면 원래대로 돌리면서 오류를 보여 준다 */
function SwitchRow({ locale, prefKey, enabled, label, note, disabled = false }: { locale: Locale; prefKey: string; enabled: boolean; label: string; note?: React.ReactNode; disabled?: boolean }) {
  const t = useT(locale);
  const [on, setOn] = useOptimistic(enabled);
  const [failed, setFailed] = useState(false);
  return (
    <form
      action={async (fd) => {
        setFailed(false);
        setOn(!enabled);
        try {
          await setPreference(fd);
        } catch {
          setFailed(true);
        }
      }}
      className="flex min-h-16 flex-col justify-center border-t-[1.5px] border-dashed border-rule"
    >
      <input type="hidden" name="key" value={prefKey} />
      <input type="hidden" name="value" value={enabled ? "0" : "1"} />
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-0.5 pl-1">
          <span className="text-[21px]">{label}</span>
          {note}
        </div>
        <SwitchButton label={label} on={on} disabled={disabled} />
      </div>
      {failed ? (
        <p role="alert" className="pb-2 pl-1 text-[16px] text-red">
          {t("common.error")}
        </p>
      ) : null}
    </form>
  );
}

function SwitchButton({ label, on, disabled }: { label: string; on: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={disabled || pending} aria-label={label} aria-pressed={on} aria-busy={pending} className={`flex h-11 w-16 shrink-0 items-center justify-end disabled:opacity-40 ${pending ? "motion-safe:animate-pulse" : ""}`}>
      <SwitchLook on={on} />
    </button>
  );
}

export function AppLockSetting({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const t = useT(locale);
  const native = useIsNative();
  return (
    <SwitchRow
      locale={locale}
      prefKey="app_lock"
      enabled={enabled}
      label={t("privacy.lock")}
      note={native ? null : <span className="text-[15px] text-muted">{t("privacy.lockUnavailable")}</span>}
      disabled={!native && !enabled}
    />
  );
}

/** 알림 받기: 끄면 푸시와 기기 로컬 알림(생일·기념일, 요청 답장, 공유 수락)을 모두 멈춘다 */
export function PushSetting({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const t = useT(locale);
  return <SwitchRow locale={locale} prefKey="push_enabled" enabled={enabled} label={t("privacy.push")} />;
}

export function ReminderSetting({ locale, offsets }: { locale: Locale; offsets: ReminderOffset[] }) {
  const t = useT(locale);
  const [value, setValue] = useState(offsets);
  const [failed, setFailed] = useState(false);
  const dirty = value.join() !== offsets.join();
  return (
    <form
      action={async (fd) => {
        setFailed(false);
        try {
          await saveOffsets(fd);
        } catch {
          setFailed(true);
        }
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="offsets" value={JSON.stringify(value)} />
      <ReminderPicker value={value} onChange={setValue} locale={locale} />
      {failed ? (
        <p role="alert" className="text-[16px] text-red">
          {t("common.error")}
        </p>
      ) : null}
      {dirty ? <PendingButton className="btn-primary !h-11 !text-[18px]">{t("common.save")}</PendingButton> : null}
    </form>
  );
}
