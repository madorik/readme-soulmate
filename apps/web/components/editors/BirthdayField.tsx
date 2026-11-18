"use client";

import type { DateSpec, Locale } from "@readme/core";
import { useState } from "react";
import { DateSpecPicker } from "./DatesEditor";
import { useT } from "./shared";

/** 폼에 얹는 생일 칸(선택): 월·일을 다 고르면 birthday로 같이 보낸다. 비워 두면 null */
export function BirthdayField({ locale }: { locale: Locale }) {
  const t = useT(locale);
  const [spec, setSpec] = useState<DateSpec | null>(null);
  return (
    <div className="flex flex-col gap-2 px-6 pt-6">
      <input type="hidden" name="birthday" value={JSON.stringify(spec)} />
      <span className="text-[15px] font-bold">{t("dates.birthday")}</span>
      <DateSpecPicker value={spec} onChange={setSpec} locale={locale} year="birth" />
    </div>
  );
}
