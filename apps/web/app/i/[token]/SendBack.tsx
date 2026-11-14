"use client";

import type { Locale } from "@readme/core";
import { useState } from "react";
import { useT } from "@/components/editors/shared";
import { DrawnCheck } from "@/components/marks";

/** "내 리드미도 보내기" — 처음부터 켜 둔다(가까운 사이는 보통 서로 주고받는다) */
export function SendBack({ locale, name }: { locale: Locale; name: string }) {
  const t = useT(locale);
  const [on, setOn] = useState(true);
  return (
    <>
      <input type="hidden" name="sendBack" value={on ? "1" : "0"} />
      <button type="button" aria-pressed={on} onClick={() => setOn(!on)} className="flex items-start gap-3.5 text-left">
        <DrawnCheck on={on} />
        <span className="flex flex-col gap-[3px]">
          <span className="text-[15.5px] font-bold">{t("accept.sendBack", { name })}</span>
          <span className="text-[13px] leading-[1.5] text-muted">{t("accept.sendBackSub")}</span>
        </span>
      </button>
    </>
  );
}
