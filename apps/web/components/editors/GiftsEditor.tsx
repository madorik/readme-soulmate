"use client";

import { COLORS, type GiftsData, type Locale } from "@readme/core";
import { useState } from "react";
import { Circled, Icon } from "../marks";
import { CircleOption, SectionHeading, TextField, joinList, splitList, useT } from "./shared";

export function GiftsEditor({ value, onChange, locale }: { value: GiftsData; onChange: (v: GiftsData) => void; locale: Locale }) {
  const t = useT(locale);
  const [loves, setLoves] = useState(joinList(value.loves));
  const [skip, setSkip] = useState(joinList(value.skip));
  const [brands, setBrands] = useState(joinList(value.brands ?? []));
  const toggleColor = (code: string) => {
    const has = value.colors.includes(code);
    if (!has && value.colors.length >= 5) return;
    onChange({ ...value, colors: has ? value.colors.filter((c) => c !== code) : [...value.colors, code] });
  };
  const setWish = (i: number, patch: Partial<GiftsData["wishlist"][number]>) =>
    onChange({ ...value, wishlist: value.wishlist.map((w, j) => (j === i ? { ...w, ...patch } : w)) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SectionHeading right={`${value.colors.length}/5`}>{t("gift.colors")}</SectionHeading>
        <div className="flex flex-wrap gap-x-1 gap-y-1">
          {COLORS.map((c) => {
            const on = value.colors.includes(c.code);
            return (
              <button key={c.code} type="button" aria-pressed={on} aria-label={c.label[locale]} onClick={() => toggleColor(c.code)} className="flex h-11 w-11 items-center justify-center">
                <Circled on={on} pad={[7, 7]} width={2.4}>
                  <span className="block h-[26px] w-[26px] rounded-full" style={{ background: c.hex, boxShadow: "inset 0 0 0 1.5px rgba(29,33,37,0.16)" }} />
                </Circled>
              </button>
            );
          })}
        </div>
      </div>
      <TextField
        label={t("gift.loves")}
        value={loves}
        onChange={(v) => {
          setLoves(v);
          onChange({ ...value, loves: splitList(v) });
        }}
        placeholder={t("gift.lovesPlaceholder")}
      />
      <TextField label={t("gift.scent")} value={value.scent} onChange={(scent) => onChange({ ...value, scent })} placeholder={t("gift.scentPlaceholder")} />
      <TextField label={t("gift.flowers")} value={value.flowers} onChange={(flowers) => onChange({ ...value, flowers })} placeholder={t("gift.flowersPlaceholder")} />
      <div className="flex flex-col gap-1.5">
        <SectionHeading>{t("gift.giftCard")}</SectionHeading>
        <div className="flex gap-6 border-t border-rule pt-1.5">
          <CircleOption label={t("gift.giftCardYes")} on={value.giftCard === "yes"} onToggle={() => onChange({ ...value, giftCard: value.giftCard === "yes" ? null : "yes" })} />
          <CircleOption label={t("gift.giftCardNo")} color="ink" on={value.giftCard === "no"} onToggle={() => onChange({ ...value, giftCard: value.giftCard === "no" ? null : "no" })} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <SectionHeading>{t("gift.wishlist")}</SectionHeading>
        {value.wishlist.map((w, i) => (
          <div key={i} className="flex flex-col gap-2 border-t border-rule pt-3">
            <div className="flex items-center gap-2">
              <input value={w.title} onChange={(e) => setWish(i, { title: e.target.value })} placeholder={t("gift.wishTitle")} aria-label={t("gift.wishTitle")} className="field" />
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
            {t("gift.addWish")}
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
