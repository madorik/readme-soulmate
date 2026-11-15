import {
  ALCOHOL_KINDS,
  ALCOHOL_LEVELS,
  ALLERGENS,
  COLORS,
  DIETS,
  DISLIKES,
  METALS,
  MOVIE_GENRES,
  MUSIC_GENRES,
  NONE,
  PATTERNS,
  SEASONS,
  SPICY_LEVELS,
  STYLES,
  describeRing,
  describeShoe,
  describeTop,
  isEmptySection,
  labelOf,
  realCodes,
  type CatalogItem,
  type Locale,
  type PartialCard,
  type Section,
  type YMD,
} from "@readme/core";
import type { T } from "@/lib/i18n";
import { ChiliMeter } from "./Chili";
import { ColorDot } from "./ColorDot";
import { DateTiles } from "./DateTiles";
import { Icon, MarkerCircle } from "./marks";

function Row({ label, children, center = false }: { label: string; children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`flex gap-3 py-[7px] ${center ? "items-center" : ""}`}>
      <span className={`w-[88px] shrink-0 text-[13.5px] text-muted ${center ? "" : "pt-[2px]"}`}>{label}</span>
      <span className="min-w-0 flex-1 text-[15px] font-medium leading-[1.5]">{children}</span>
    </div>
  );
}

/** 사람 기록 한 항목에 기억해 둔 것. 적어 둔 게 없으면 null(빈 항목은 제목 줄만 보인다) */
export function SectionBody({ section, card, today, locale, t }: { section: Section; card: PartialCard; today: YMD; locale: Locale; t: T }): React.ReactNode {
  if (isEmptySection(section, card[section])) return null;
  const and = t("common.and");
  const codes = (list: CatalogItem[], c: string[]) => c.map((x) => labelOf(list, x, locale)).join(and);

  switch (section) {
    case "dates":
      return <DateTiles dates={card.dates} today={today} locale={locale} t={t} className="mt-1" />;

    case "safety": {
      const s = card.safety!;
      const allergens = realCodes(s.allergens);
      return (
        <>
          {allergens.length ? (
            <div className="flex flex-wrap items-baseline gap-x-[24px] gap-y-3 pb-2.5 pl-2.5 pt-2.5">
              {allergens.map((c) => (
                <span key={c} className="relative text-[22px] font-bold tracking-[-0.03em] text-red">
                  {labelOf(ALLERGENS, c, locale)}
                  <MarkerCircle color="warn" pad={[11, 6]} width={2} />
                </span>
              ))}
              <span className="text-[14px] font-medium text-red">{t("person.allergy")}</span>
            </div>
          ) : null}
          {s.allergens.includes(NONE) ? <Row label={t("safety.allergens")}>{labelOf(ALLERGENS, NONE, locale)}</Row> : null}
          {s.dislikes.length ? <Row label={t("person.wontEat")}>{codes(DISLIKES, s.dislikes)}</Row> : null}
          {s.diets.length ? <Row label={t("person.diet")}>{codes(DIETS, s.diets)}</Row> : null}
          {s.allergyNote ? <p className="py-[7px] text-[15px] leading-[1.6]">“{s.allergyNote}”</p> : null}
        </>
      );
    }

    case "taste": {
      const x = card.taste!;
      const a = x.alcohol;
      return (
        <>
          {x.likes.length ? <Row label={t("person.likes")}>{x.likes.join(and)}</Row> : null}
          {x.spicy != null ? (
            <Row label={t("person.spicy")} center>
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <ChiliMeter level={x.spicy} size={18} />
                {SPICY_LEVELS[x.spicy]?.[locale]}
              </span>
            </Row>
          ) : null}
          {x.dessert ? <Row label={t("fav.dessert")}>{x.dessert}</Row> : null}
          {x.drinks ? <Row label={t("person.drinks")}>{x.drinks}</Row> : null}
          {a?.level || a?.kinds.length ? (
            <Row label={t("person.alcohol")}>
              {[a.level ? labelOf(ALCOHOL_LEVELS, a.level, locale) : "", codes(ALCOHOL_KINDS, a.kinds)].filter(Boolean).join(" · ")}
            </Row>
          ) : null}
        </>
      );
    }

    case "sizes": {
      const z = card.sizes!;
      const top = describeTop(z.top, locale);
      const shoe = describeShoe(z.shoe, locale);
      const ring = describeRing(z.ring, locale);
      const cells = [
        top ? { label: t("size.top"), ...top } : null,
        z.bottom ? { label: t("size.bottom"), value: z.bottom, unit: t("size.bottomUnit"), hint: null } : null,
        shoe ? { label: t("size.shoe"), ...shoe } : null,
        ring ? { label: t("size.ring"), ...ring } : null,
      ].filter((c) => c !== null);
      return (
        <div className="flex flex-wrap gap-2 pb-1 pt-1.5">
          {cells.map((c) => (
            <div key={c.label} className="flex min-w-[100px] flex-col gap-1 rounded-2xl bg-fill px-3.5 py-2.5">
              <span className="text-[12px] font-medium text-muted">{c.label}</span>
              <span className="flex items-baseline gap-1">
                <span className="num text-[26px] font-light leading-none">{c.value}</span>
                <span className="text-[12.5px] font-medium">{c.unit}</span>
              </span>
              {c.hint ? <span className="text-[11.5px] text-ink-2">{c.hint}</span> : null}
            </div>
          ))}
        </div>
      );
    }

    case "gifts": {
      const g = card.gifts!;
      return (
        <>
          {g.wishlist.length ? (
            <Row label={t("gift.wishlist")}>
              <span className="flex flex-col">
                {g.wishlist.map((w, i) =>
                  w.url ? (
                    <a key={i} href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-11 items-center justify-between gap-2">
                      {w.title}
                      <Icon name="external" size={16} className="shrink-0 text-muted" />
                    </a>
                  ) : (
                    <span key={i}>{w.title}</span>
                  ),
                )}
              </span>
            </Row>
          ) : null}
          {g.flowers ? <Row label={t("gift.flowers")}>{g.flowers}</Row> : null}
          {g.scent ? <Row label={t("gift.scent")}>{g.scent}</Row> : null}
          {g.brands?.length ? <Row label={t("gift.brands")}>{g.brands.join(and)}</Row> : null}
          {g.giftCard ? <Row label={t("gift.giftCard")}>{t(g.giftCard === "yes" ? "gift.giftCardYes" : "gift.giftCardNo")}</Row> : null}
          {g.skip.length ? (
            <Row label={t("gift.skip")}>
              <span className="text-muted line-through decoration-red decoration-2">{g.skip.join(and)}</span>
            </Row>
          ) : null}
        </>
      );
    }

    case "favorites": {
      const f = card.favorites!;
      return (
        <>
          {f.colors?.length ? (
            <Row label={t("gift.colors")} center>
              <span className="flex flex-wrap gap-x-3 gap-y-1.5">
                {f.colors.map((code) => {
                  const c = COLORS.find((x) => x.code === code);
                  return (
                    <span key={code} className="flex items-center gap-1.5">
                      <ColorDot hex={c?.hex ?? "#FFFFFF"} size={18} />
                      {c?.label[locale] ?? code}
                    </span>
                  );
                })}
              </span>
            </Row>
          ) : null}
          {f.idol ? <Row label={t("fav.idol")}>{f.idol}</Row> : null}
          {f.character ? <Row label={t("fav.character")}>{f.character}</Row> : null}
          {f.team ? <Row label={t("fav.team")}>{f.team}</Row> : null}
          {f.animal ? <Row label={t("fav.animal")}>{f.animal}</Row> : null}
          {f.patterns.length ? <Row label={t("fav.patterns")}>{codes(PATTERNS, f.patterns)}</Row> : null}
          {f.styles.length ? <Row label={t("fav.styles")}>{codes(STYLES, f.styles)}</Row> : null}
          {f.metals.length ? <Row label={t("fav.metals")}>{codes(METALS, f.metals)}</Row> : null}
        </>
      );
    }

    case "culture": {
      const c = card.culture!;
      return (
        <>
          {c.movie ? <Row label={t("fav.movie")}>{c.movie}</Row> : null}
          {c.movieGenres.length ? <Row label={t("fav.movieGenres")}>{codes(MOVIE_GENRES, c.movieGenres)}</Row> : null}
          {c.drama ? <Row label={t("fav.drama")}>{c.drama}</Row> : null}
          {c.shows ? <Row label={t("fav.shows")}>{c.shows}</Row> : null}
          {c.song ? <Row label={t("fav.song")}>{c.song}</Row> : null}
          {c.musicGenres.length ? <Row label={t("fav.musicGenres")}>{codes(MUSIC_GENRES, c.musicGenres)}</Row> : null}
          {c.book ? <Row label={t("fav.book")}>{c.book}</Row> : null}
        </>
      );
    }

    case "life": {
      const l = card.life!;
      return (
        <>
          {l.hobbies.length ? <Row label={t("life.hobbies")}>{l.hobbies.join(and)}</Row> : null}
          {l.seasons.length ? <Row label={t("fav.seasons")}>{codes(SEASONS, l.seasons)}</Row> : null}
          {l.travel ? <Row label={t("fav.travel")}>{l.travel}</Row> : null}
        </>
      );
    }
  }
}
