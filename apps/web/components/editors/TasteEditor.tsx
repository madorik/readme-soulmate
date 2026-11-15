"use client";

import { ALCOHOL_KINDS, ALCOHOL_LEVELS, SPICY_LEVELS, type AlcoholData, type Locale, type TasteData } from "@readme/core";
import { useState } from "react";
import { ChiliMeter } from "../Chili";
import { CircleOption, SectionHeading, TextField, joinList, splitList, useT } from "./shared";

/** 매운맛: 단계 이름 + 고추 다섯 개(빨간 개수가 단계). 하나만 고르고, 다시 누르면 뺀다 */
export function SpicyScale({ value, onChange, locale, large = false }: { value: number | null; onChange: (v: number | null) => void; locale: Locale; large?: boolean }) {
  const t = useT(locale);
  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading>{t("taste.spicy")}</SectionHeading>
      <div role="radiogroup" aria-label={t("taste.spicy")} className="flex flex-col gap-2 pt-1">
        {SPICY_LEVELS.map((label, i) => {
          const on = value === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? null : i)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl pl-2.5 pr-3.5 text-left transition-colors ${large ? "min-h-16" : "min-h-14"} ${
                on ? "bg-sky-soft shadow-[inset_0_0_0_2px_var(--color-sky)]" : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-rule)]"
              }`}
            >
              <span className={`rounded-full px-3 py-1.5 font-bold ${large ? "text-[16.5px]" : "text-[15px]"} ${on ? "grad" : "bg-fill"}`}>{label[locale]}</span>
              <ChiliMeter level={i} size={large ? 26 : 23} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 술: 얼마나(하나만) + 좋아하는 종류(여러 개, 안 마시면 숨김) */
export function AlcoholPicker({ value, onChange, locale }: { value: AlcoholData; onChange: (v: AlcoholData) => void; locale: Locale }) {
  const t = useT(locale);
  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading>{t("taste.alcohol")}</SectionHeading>
      <div className="flex flex-wrap gap-2 pt-1">
        {ALCOHOL_LEVELS.map((l) => (
          <CircleOption
            key={l.code}
            label={l.label[locale]}
            on={value.level === l.code}
            color="ink"
            onToggle={() => onChange(value.level === l.code ? { level: null, kinds: value.kinds } : { level: l.code, kinds: l.code === "none" ? [] : value.kinds })}
            textClass="!text-[14.5px] whitespace-nowrap"
          />
        ))}
      </div>
      {value.level && value.level !== "none" ? (
        <>
          <span className="pt-2 text-[13px] text-muted">{t("taste.alcoholKinds")}</span>
          <div className="flex flex-wrap gap-2">
            {ALCOHOL_KINDS.map((k) => (
              <CircleOption
                key={k.code}
                label={k.label[locale]}
                on={value.kinds.includes(k.code)}
                color="ink"
                onToggle={() => onChange({ ...value, kinds: value.kinds.includes(k.code) ? value.kinds.filter((x) => x !== k.code) : [...value.kinds, k.code] })}
                textClass="!text-[15px]"
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TasteEditor({ value, onChange, locale, large = false }: { value: TasteData; onChange: (v: TasteData) => void; locale: Locale; large?: boolean }) {
  const t = useT(locale);
  const [likes, setLikes] = useState(joinList(value.likes));
  return (
    <div className="flex flex-col gap-6">
      <TextField
        label={t("taste.likes")}
        value={likes}
        onChange={(v) => {
          setLikes(v);
          onChange({ ...value, likes: splitList(v) });
        }}
        placeholder={t("taste.likesPlaceholder")}
      />
      <SpicyScale value={value.spicy} onChange={(spicy) => onChange({ ...value, spicy })} locale={locale} large={large} />
      <TextField label={t("fav.dessert")} value={value.dessert ?? ""} onChange={(dessert) => onChange({ ...value, dessert })} placeholder={t("fav.dessertPlaceholder")} />
      <TextField label={t("taste.drinks")} value={value.drinks} onChange={(drinks) => onChange({ ...value, drinks })} placeholder={t("taste.drinksPlaceholder")} />
      <AlcoholPicker value={value.alcohol ?? { level: null, kinds: [] }} onChange={(alcohol) => onChange({ ...value, alcohol })} locale={locale} />
    </div>
  );
}
