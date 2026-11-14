"use client";

import { ALCOHOL_KINDS, ALCOHOL_LEVELS, SPICY_LEVELS, type AlcoholData, type Locale, type TasteData } from "@readme/core";
import { useState } from "react";
import { CircleOption, SectionHeading, TextField, joinList, splitList, useT } from "./shared";

export function SpicyScale({ value, onChange, locale, large = false }: { value: number | null; onChange: (v: number | null) => void; locale: Locale; large?: boolean }) {
  const t = useT(locale);
  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading right={value != null ? SPICY_LEVELS[value]?.[locale] : undefined}>{t("taste.spicy")}</SectionHeading>
      <div className="grid grid-cols-5 border-t border-rule pt-1.5">
        {SPICY_LEVELS.map((label, i) => (
          <CircleOption
            key={i}
            label={String(i)}
            on={value === i}
            onToggle={() => onChange(value === i ? null : i)}
            large={large}
            textClass="num !text-[24px]"
          />
        ))}
      </div>
      <div className="flex justify-between text-[12.5px] text-muted">
        <span>{t("taste.spicyMin")}</span>
        <span>{t("taste.spicyMax")}</span>
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
      <div className="grid grid-cols-4 border-t border-rule pt-1.5">
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
          <div className="grid grid-cols-4">
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
      <TextField label={t("taste.drinks")} value={value.drinks} onChange={(drinks) => onChange({ ...value, drinks })} placeholder={t("taste.drinksPlaceholder")} />
      <AlcoholPicker value={value.alcohol ?? { level: null, kinds: [] }} onChange={(alcohol) => onChange({ ...value, alcohol })} locale={locale} />
    </div>
  );
}
