"use client";

import { METALS, MOVIE_GENRES, MUSIC_GENRES, PATTERNS, SEASONS, STYLES, type CatalogItem, type FavoritesData, type Locale } from "@readme/core";
import { CircleOption, SectionHeading, TextField, useT } from "./shared";

type CodeKey = "patterns" | "styles" | "metals" | "movieGenres" | "musicGenres" | "seasons";
type TextKey = "idol" | "character" | "team" | "movie" | "drama" | "shows" | "song" | "dessert" | "travel" | "animal" | "book";

/** 좋아하는 것들: 스타일 · 좋아하는 사람·캐릭터 · 영화·드라마 · 음악 · 일상 */
export function FavoritesEditor({ value, onChange, locale }: { value: FavoritesData; onChange: (v: FavoritesData) => void; locale: Locale }) {
  const t = useT(locale);
  const toggle = (key: CodeKey, code: string) => {
    const list = value[key] ?? [];
    onChange({ ...value, [key]: list.includes(code) ? list.filter((x) => x !== code) : [...list, code] });
  };
  const chips = (key: CodeKey, label: string, list: CatalogItem[]) => (
    <div className="flex flex-col gap-1">
      <span className="text-[13.5px] font-bold">{label}</span>
      <div className="flex flex-wrap gap-2 pt-1">
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
        </>,
      )}
      {group(
        t("fav.watch"),
        <>
          {chips("movieGenres", t("fav.movieGenres"), MOVIE_GENRES)}
          {field("movie")}
          {field("drama")}
          {field("shows")}
        </>,
      )}
      {group(
        t("fav.listen"),
        <>
          {chips("musicGenres", t("fav.musicGenres"), MUSIC_GENRES)}
          {field("song")}
        </>,
      )}
      {group(
        t("fav.life"),
        <>
          {chips("seasons", t("fav.seasons"), SEASONS)}
          {field("dessert")}
          {field("travel")}
          {field("animal")}
          {field("book")}
        </>,
      )}
    </div>
  );
}
