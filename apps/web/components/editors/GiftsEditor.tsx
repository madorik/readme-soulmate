"use client";

import { type GiftsData, type Locale } from "@readme/core";
import { useState } from "react";
import { Icon } from "../marks";
import { CircleOption, SectionHeading, TextField, joinList, splitList, useT } from "./shared";

/**
 * 선물: 상품권 · 해주고 싶은 선물(다른 사람 기록, '나중에 사 줘야지') 또는 받고 싶은 것(내 리드미) · 사양하는 것 · 브랜드.
 * 향·꽃은 취향 항목으로 옮겼다
 */
export function GiftsEditor({ value, onChange, locale, forOther = false }: { value: GiftsData; onChange: (v: GiftsData) => void; locale: Locale; forOther?: boolean }) {
  const t = useT(locale);
  const [skip, setSkip] = useState(joinList(value.skip));
  const [brands, setBrands] = useState(joinList(value.brands ?? []));
  const setWish = (i: number, patch: Partial<GiftsData["wishlist"][number]>) =>
    onChange({ ...value, wishlist: value.wishlist.map((w, j) => (j === i ? { ...w, ...patch } : w)) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <SectionHeading>{t("gift.giftCard")}</SectionHeading>
        <div className="flex flex-wrap gap-2 pt-1">
          <CircleOption label={t("gift.giftCardYes")} on={value.giftCard === "yes"} onToggle={() => onChange({ ...value, giftCard: value.giftCard === "yes" ? null : "yes" })} />
          <CircleOption label={t("gift.giftCardNo")} color="ink" on={value.giftCard === "no"} onToggle={() => onChange({ ...value, giftCard: value.giftCard === "no" ? null : "no" })} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SectionHeading>{forOther ? t("gift.ideas") : t("gift.wishlist")}</SectionHeading>
        {value.wishlist.map((w, i) => (
          <div key={i} className="flex flex-col gap-2 border-t border-rule pt-3">
            <div className="flex items-center gap-2">
              <input value={w.title} onChange={(e) => setWish(i, { title: e.target.value })} placeholder={forOther ? t("gift.ideaTitle") : t("gift.wishTitle")} aria-label={forOther ? t("gift.ideaTitle") : t("gift.wishTitle")} className="field" />
              <button type="button" aria-label={t("common.delete")} onClick={() => onChange({ ...value, wishlist: value.wishlist.filter((_, j) => j !== i) })} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
                <Icon name="close" size={20} />
              </button>
            </div>
            <input value={w.url} onChange={(e) => setWish(i, { url: e.target.value })} placeholder="https://" aria-label={t("gift.wishUrl")} inputMode="url" className="field text-[14px]" />
          </div>
        ))}
        {value.wishlist.length < 10 ? (
          <button type="button" onClick={() => onChange({ ...value, wishlist: [...value.wishlist, { title: "", url: "" }] })} className="pill self-start">
            <Icon name="plus" size={17} />
            {forOther ? t("gift.addIdea") : t("gift.addWish")}
          </button>
        ) : null}
      </div>
      <TextField
        label={t("gift.skip")}
        value={skip}
        onChange={(v) => {
          setSkip(v);
          onChange({ ...value, skip: splitList(v) });
        }}
        placeholder={t("gift.skipPlaceholder")}
      />
      <TextField
        label={t("gift.brands")}
        value={brands}
        onChange={(v) => {
          setBrands(v);
          onChange({ ...value, brands: splitList(v) });
        }}
        placeholder={t("gift.brandsPlaceholder")}
      />
    </div>
  );
}
