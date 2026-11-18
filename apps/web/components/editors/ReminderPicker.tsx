"use client";

import { REMINDER_OFFSETS, type Locale, type ReminderOffset } from "@readme/core";
import { CircleOption, useT } from "./shared";

/** 생일·기념일을 언제 알릴지(2주 전·1주일 전·3일 전·당일) 고르기. 설정과 온보딩이 같이 쓴다 */
export function ReminderPicker({ value, onChange, locale }: { value: ReminderOffset[]; onChange: (v: ReminderOffset[]) => void; locale: Locale }) {
  const t = useT(locale);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[16px] font-bold">{t("remind.when")}</span>
      <div className="flex flex-wrap gap-2 pt-1">
        {REMINDER_OFFSETS.map((o) => (
          <CircleOption
            key={o}
            label={t(`remind.${o}` as "remind.7")}
            on={value.includes(o)}
            onToggle={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : REMINDER_OFFSETS.filter((x) => x === o || value.includes(x)))}
            textClass="whitespace-nowrap"
          />
        ))}
      </div>
    </div>
  );
}
