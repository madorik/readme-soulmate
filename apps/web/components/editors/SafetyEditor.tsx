"use client";

import { ALLERGENS, ALLERGEN_ORDER, DIETS, DISLIKES, DISLIKE_ORDER, NONE, NONE_LABEL, ordered, type Locale, type SafetyData } from "@readme/core";
import { useState } from "react";
import { CircleOption, SectionHeading, TextField, toggleWithNone, useT } from "./shared";

/** 알레르기(빨간 동그라미)와 안 먹는 것(남색 동그라미). 온보딩·내 리드미·요청 답하기에서 같이 쓴다 */
export function SafetyEditor({
  value,
  onChange,
  locale,
  large = false,
  showNote = true,
}: {
  value: SafetyData;
  onChange: (v: SafetyData) => void;
  locale: Locale;
  large?: boolean;
  showNote?: boolean;
}) {
  const t = useT(locale);
  const allergens = ordered(ALLERGENS, ALLERGEN_ORDER[locale]);
  const dislikes = ordered(DISLIKES, DISLIKE_ORDER[locale]);
  const hiddenPicked = allergens.rest.some((i) => value.allergens.includes(i.code)) || dislikes.rest.some((i) => value.dislikes.includes(i.code)) || value.diets.length > 0;
  const [more, setMore] = useState(hiddenPicked);

  const toggle = (key: "allergens" | "dislikes" | "diets", code: string) => {
    onChange({ ...value, [key]: toggleWithNone(value[key], code) });
  };
  // 첫 칸 '없음'(알레르기 없음 · 안 먹는 것 없음 · 식단 없음)
  const none = (key: "allergens" | "dislikes" | "diets") => (
    <CircleOption label={NONE_LABEL[locale]} color="ink" on={value[key].includes(NONE)} onToggle={() => toggle(key, NONE)} large={large} />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <SectionHeading tone="red">
          {t("safety.allergens")}
        </SectionHeading>
        <div className="flex flex-wrap gap-2 pt-1">
          {none("allergens")}
          {[...allergens.first, ...(more ? allergens.rest : [])].map((i) => (
            <CircleOption key={i.code} label={i.label[locale]} color="warn" on={value.allergens.includes(i.code)} onToggle={() => toggle("allergens", i.code)} large={large} />
          ))}
          <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className={`chip !bg-transparent font-bold text-muted !shadow-[inset_0_0_0_1.5px_var(--color-edge)] ${large ? "!min-h-12 text-[16.5px]" : ""}`}>
            {more ? t("safety.less") : t("safety.more")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <SectionHeading>{t("safety.dislikes")}</SectionHeading>
        <div className="flex flex-wrap gap-2 pt-1">
          {none("dislikes")}
          {[...dislikes.first, ...(more ? dislikes.rest : [])].map((i) => (
            <CircleOption key={i.code} label={i.label[locale]} color="ink" on={value.dislikes.includes(i.code)} onToggle={() => toggle("dislikes", i.code)} large={large} />
          ))}
        </div>
      </div>

      {more ? (
        <div className="flex flex-col gap-1.5">
          <SectionHeading>{t("safety.diets")}</SectionHeading>
          <div className="flex flex-wrap gap-2 pt-1">
            {none("diets")}
            {DIETS.map((i) => (
              <CircleOption key={i.code} label={i.label[locale]} color="ink" on={value.diets.includes(i.code)} onToggle={() => toggle("diets", i.code)} large={large} />
            ))}
          </div>
        </div>
      ) : null}

      {showNote ? (
        <TextField label={t("safety.note")} value={value.allergyNote} onChange={(v) => onChange({ ...value, allergyNote: v })} placeholder={t("safety.notePlaceholder")} multiline />
      ) : null}
    </div>
  );
}
