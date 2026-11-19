import type { Locale } from "@readme/core";
import { useState } from "react";
import { SwitchLook } from "@/components/marks";
import { Icon } from "@/components/marks";
import { api } from "../api";
import { askNotificationAgreement } from "../bridge";
import { useNav } from "../nav";

// 설정의 토스 전용 줄(앱 설정과 같은 모양): 생일·기념일 알림(토스 알림 동의), 약관·처리방침·문의

const SUPPORT_EMAIL = "watalabs.help@gmail.com";

/** 앱의 '알림 받기' 자리. 켤 때만 토스 알림 동의를 묻는다(들어오자마자 묻지 않는다). 템플릿 승인 전에는 없다 */
export function TossReminderSwitch({ reminder }: { locale: Locale; reminder: { template: string; on: boolean } | null }) {
  const { bump } = useNav();
  const [busy, setBusy] = useState(false);
  if (!reminder) return null;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const on = !reminder.on;
    if (!on || (await askNotificationAgreement(reminder.template))) {
      await api("reminder", { json: { on } }).catch(() => null);
      bump();
    }
    setBusy(false);
  };
  return (
    <div className="flex min-h-16 items-center gap-3 border-t border-rule">
      <span className="flex-1 text-[19px]">생일·기념일 알림</span>
      <button type="button" onClick={() => void toggle()} disabled={busy} aria-label="생일·기념일 알림" aria-pressed={reminder.on} className="flex h-11 w-14 shrink-0 items-center justify-end">
        <SwitchLook on={reminder.on} />
      </button>
    </div>
  );
}

export function TossLegalRows(_: { locale: Locale }) {
  const { navigate } = useNav();
  const row = (label: string, path: string) => (
    <button type="button" onClick={() => navigate(path)} className="flex min-h-14 w-full items-center justify-between border-t border-rule text-left text-[19px]">
      {label}
      <Icon name="chevron" size={17} className="text-muted" />
    </button>
  );
  return (
    <div className="mx-6 mt-8 flex flex-col">
      {row("개인정보 처리방침", "/legal/privacy")}
      {row("이용약관", "/legal/terms")}
      <div className="flex min-h-14 items-center justify-between gap-3 border-y border-rule">
        <span className="text-[19px]">문의</span>
        <span className="select-all text-[14px] text-ink-2">{SUPPORT_EMAIL}</span>
      </div>
    </div>
  );
}
