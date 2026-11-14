"use client";

import type { Locale } from "@readme/core";
import { useActionState } from "react";
import { goToCode } from "@/app/actions/share";
import { useT } from "@/components/editors/shared";

export function CodeForm({ locale }: { locale: Locale }) {
  const t = useT(locale);
  const [state, action, pending] = useActionState(goToCode, { error: false });
  return (
    <form action={action} className="flex flex-1 flex-col gap-4 px-6 pt-6">
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-bold">{t("code.label")}</span>
        <input name="code" required maxLength={9} autoCapitalize="characters" autoComplete="off" spellCheck={false} className="field num text-center text-[30px] uppercase tracking-[0.25em]" />
      </label>
      {state.error ? (
        <p role="alert" className="text-[13.5px] text-red">
          {t("accept.notFound")}
        </p>
      ) : null}
      <button disabled={pending} className="btn-primary mt-auto">
        {t("code.submit")}
      </button>
    </form>
  );
}
