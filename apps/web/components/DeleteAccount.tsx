"use client";

import type { Locale } from "@readme/core";
import { useState } from "react";
import { deleteAccount } from "@/app/actions/account";
import { useT } from "@/components/editors/shared";

/** 계정 삭제: 한 번 더 묻고 지운다(프로필 화면 맨 아래) */
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
