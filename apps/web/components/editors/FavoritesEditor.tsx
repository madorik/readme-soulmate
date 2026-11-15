"use client";

import { METALS, PATTERNS, STYLES, NONE, NONE_LABEL, type CatalogItem, type FavoritesData, type Locale } from "@readme/core";
import { ColorPicker } from "./ColorPicker";
import { CircleOption, SectionHeading, TextField, toggleWithNone, useT } from "./shared";

type CodeKey = "patterns" | "styles" | "metals";
type TextKey = "idol" | "character" | "team" | "animal";

/** 좋아하는 것들: 스타일(좋아하는 색 포함) · 최애(사람·캐릭터·팀·동물). 영화·드라마·음악은 '문화생활' 항목으로 옮겼다 */
export function FavoritesEditor({ value, onChange, locale }: { value: FavoritesData; onChange: (v: FavoritesData) => void; locale: Locale }) {
  const t = useT(locale);
  const toggle = (key: CodeKey, code: string) => {
    onChange({ ...value, [key]: toggleWithNone(value[key] ?? [], code) });
  };
  const chips = (key: CodeKey, label: string, list: CatalogItem[]) => (
    <div className="flex flex-col gap-1">
      <span className="text-[13.5px] font-bold">{label}</span>
      <div className="flex flex-wrap gap-2 pt-1">
        <CircleOption label={NONE_LABEL[locale]} on={(value[key] ?? []).includes(NONE)} color="ink" onToggle={() => toggle(key, NONE)} textClass="!text-[15px] whitespace-nowrap" />
        {list.map((i) => (
          <CircleOption key={i.code} label={i.label[locale]} on={(value[key] ?? []).includes(i.code)} color="ink" onToggle={() => toggle(key, i.code)} textClass="!text-[15px] whitespace-nowrap" />
        ))}
      </div>
    </div>
  );
  const field = (key: TextKey) => (
    <TextField label={t(`fav.${key}` as "fav.idol")} value={value[key] ?? ""} onChange={(v) => onChange({ ...value, [key]: v })} placeholder={t(`fav.${key}Placeholder` as "fav.idolPlaceholder")} />
  );
  const group = (title: string, children: React.ReactNode) => (
    <section className="flex flex-col gap-4">
      <div className="border-b border-rule pb-1.5">
        <SectionHeading>{title}</SectionHeading>
      </div>
      {children}
    </section>
  );

  return (
    <div className="flex flex-col gap-9">
      {group(
        t("fav.style"),
        <>
          <ColorPicker value={value.colors ?? []} onChange={(colors) => onChange({ ...value, colors })} locale={locale} />
          {chips("patterns", t("fav.patterns"), PATTERNS)}
          {chips("styles", t("fav.styles"), STYLES)}
          {chips("metals", t("fav.metals"), METALS)}
        </>,
      )}
      {group(
        t("fav.people"),
        <>
          {field("idol")}
          {field("character")}
          {field("team")}
          {field("animal")}
        </>,
      )}
    </div>
  );
}
