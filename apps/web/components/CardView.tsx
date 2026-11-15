import {
  realCodes,
  NONE,
  ALCOHOL_KINDS,
  ALCOHOL_LEVELS,
  ALLERGENS,
  COLORS,
  METALS,
  MOVIE_GENRES,
  MUSIC_GENRES,
  PATTERNS,
  SEASONS,
  STYLES,
  DIETS,
  DISLIKES,
  SPICY_LEVELS,
  describeRing,
  describeShoe,
  describeTop,
  isEmptySection,
  labelOf,
  type Locale,
  type PartialCard,
  type Section,
} from "@readme/core";
import type { T } from "@/lib/i18n";
import { ChiliMeter } from "./Chili";
import { ColorDot } from "./ColorDot";
import { Icon, MarkerCircle } from "./marks";

function Row({ label, children, align = "start" }: { label: string; children: React.ReactNode; align?: "start" | "center" }) {
  return (
    <div className={`row ${align === "center" ? "items-center" : ""}`}>
      <span className={`w-[92px] shrink-0 text-[13.5px] text-muted ${align === "start" ? "pt-0.5" : ""}`}>{label}</span>
      <span className="min-w-0 flex-1 text-[15.5px] font-medium leading-[1.5]">{children}</span>
    </div>
  );
}

function SizeCell({ label, value, unit, hint, left }: { label: string; value: string; unit: string; hint: string | null; left: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 border-b border-rule py-3.5 ${left ? "border-r pr-3" : "pl-[18px]"}`}>
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="num text-[36px] font-light">{value || "–"}</span>
        <span className="text-[13.5px] font-medium">{value ? unit : ""}</span>
      </span>
      {hint ? <span className="text-[12.5px] text-ink-2">{hint}</span> : null}
    </div>
  );
}

/**
 * 리드미 한 장(받은 카드·내 카드 미리보기·요청 답 확인). 보여 주지 않은 항목은 그렇다고만 적는다.
 * 알레르기는 맨 위 "꼭 알아 두세요"에 빨간 동그라미로.
 */
export function CardView({
  card,
  sections,
  name,
  locale,
  t,
  updatedToday = [],
}: {
  card: PartialCard;
  sections: Section[];
  name: string;
  locale: Locale;
  t: T;
  updatedToday?: string[];
}) {
  const safety = card.safety;
  const taste = card.taste;
  const sizes = card.sizes;
  const gifts = card.gifts;
  const fav = card.favorites;
  const culture = card.culture;
  // 알레르기 '없음'은 빨간 경고 대신 음식 칸에 한 줄로
  const allergens = realCodes(safety?.allergens);
  const noAllergy = !!safety?.allergens.includes(NONE);
  const life = card.life;
  const codes = (list: Parameters<typeof labelOf>[0], c: string[]) => c.map((x) => labelOf(list, x, locale)).join(t("common.and"));
  const alcohol = taste?.alcohol;
  const notShared = (s: Section) => !sections.includes(s);
  const hidden = <p className="row text-[14px] text-muted">{t("person.notShared", { name })}</p>;
  const empty = <p className="row text-[14px] text-muted">{t("common.notWritten")}</p>;

  return (
    <div className="flex flex-col">
      {safety && (allergens.length || safety.allergyNote) ? (
        <section className="flex flex-col gap-3 px-6 pt-7" aria-labelledby="must-know">
          <h2 id="must-know" className="flex items-center gap-[7px] text-[15px] font-bold text-red">
            <Icon name="alert" size={17} strokeWidth={1.9} />
            {t("person.mustKnow")}
          </h2>
          {allergens.length ? (
            <div className="flex flex-wrap items-baseline gap-x-[26px] gap-y-3 pl-2.5 pt-1.5">
              {allergens.map((c) => (
                <span key={c} className="relative text-[26px] font-bold tracking-[-0.03em] text-red">
                  {labelOf(ALLERGENS, c, locale)}
                  <MarkerCircle color="warn" pad={[12, 7]} width={2} />
                </span>
              ))}
              <span className="text-[14.5px] font-medium text-red">{t("person.allergy")}</span>
            </div>
          ) : null}
          {safety.allergyNote ? (
            <div className="mt-1.5 flex flex-col gap-0.5">
              <p className="text-[15px] leading-[1.6]">“{safety.allergyNote}”</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col px-6 pt-9" aria-labelledby="food">
        <h2 id="food" className="section-title mb-2">
          {t("person.food")}
        </h2>
        {notShared("taste") && notShared("safety") ? (
          hidden
        ) : !(noAllergy || taste?.likes.length || safety?.dislikes.length || safety?.diets.length || taste?.spicy != null || taste?.dessert || taste?.drinks || alcohol?.level) ? (
          empty
        ) : (
          <>
            {noAllergy ? <Row label={t("safety.allergens")}>{labelOf(ALLERGENS, NONE, locale)}</Row> : null}
            {taste?.likes.length ? <Row label={t("person.likes")}>{taste.likes.join(t("common.and"))}</Row> : null}
            {safety?.dislikes.length ? <Row label={t("person.wontEat")}>{safety.dislikes.map((c) => labelOf(DISLIKES, c, locale)).join(t("common.and"))}</Row> : null}
            {safety?.diets.length ? <Row label={t("person.diet")}>{safety.diets.map((c) => labelOf(DIETS, c, locale)).join(t("common.and"))}</Row> : null}
            {taste?.spicy != null ? (
              <Row label={t("person.spicy")} align="center">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ChiliMeter level={taste.spicy} size={20} />
                  {SPICY_LEVELS[taste.spicy]?.[locale]}
                </span>
              </Row>
            ) : null}
            {taste?.dessert ? <Row label={t("fav.dessert")}>{taste.dessert}</Row> : null}
            {taste?.drinks ? (
              <Row label={t("person.drinks")} align="center">
                <span className={updatedToday.includes("drinks") ? "hl" : ""}>{taste.drinks}</span>
              </Row>
            ) : null}
            {alcohol?.level ? (
              <Row label={t("person.alcohol")}>
                {labelOf(ALCOHOL_LEVELS, alcohol.level, locale)}
                {alcohol.kinds.length ? <span className="text-muted">{` · ${alcohol.kinds.map((c) => labelOf(ALCOHOL_KINDS, c, locale)).join(t("common.and"))}`}</span> : null}
              </Row>
            ) : null}
            <div className="border-t border-rule" />
          </>
        )}
      </section>

      <section className="flex flex-col px-6 pt-9" aria-labelledby="sizes">
        <h2 id="sizes" className="section-title mb-2">
          {t("person.sizes")}
        </h2>
        {notShared("sizes") ? (
          hidden
        ) : isEmptySection("sizes", sizes) ? (
          empty
        ) : (
          <div className="grid grid-cols-2 border-t border-rule">
            {(() => {
              const top = describeTop(sizes!.top, locale);
              const shoe = describeShoe(sizes!.shoe, locale);
              const ring = describeRing(sizes!.ring, locale);
              return (
                <>
                  <SizeCell left label={t("size.top")} value={top?.value ?? ""} unit={top?.unit ?? ""} hint={top?.hint ?? null} />
                  <SizeCell left={false} label={t("size.bottom")} value={sizes!.bottom} unit={t("size.bottomUnit")} hint={null} />
                  <SizeCell left label={t("size.shoe")} value={shoe?.value ?? ""} unit="mm" hint={shoe?.hint ?? null} />
                  <SizeCell left={false} label={t("size.ring")} value={ring?.value ?? ""} unit={ring?.unit ?? ""} hint={ring?.hint ?? null} />
                </>
              );
            })()}
          </div>
        )}
      </section>

      <section className="flex flex-col px-6 pt-9" aria-labelledby="gifts">
        <h2 id="gifts" className="section-title mb-2">
          {t("person.gifts")}
        </h2>
        {notShared("gifts") ? (
          hidden
        ) : isEmptySection("gifts", gifts) ? (
          empty
        ) : (
          <>
            {gifts!.brands?.length ? <Row label={t("gift.brands")}>{gifts!.brands.join(t("common.and"))}</Row> : null}
            {gifts!.scent ? <Row label={t("gift.scent")}>{gifts!.scent}</Row> : null}
            {gifts!.flowers ? <Row label={t("gift.flowers")}>{gifts!.flowers}</Row> : null}
            {gifts!.giftCard ? <Row label={t("gift.giftCard")}>{t(gifts!.giftCard === "yes" ? "gift.giftCardYes" : "gift.giftCardNo")}</Row> : null}
            {gifts!.wishlist.length ? (
              <Row label={t("gift.wishlist")}>
                <span className="flex flex-col">
                  {gifts!.wishlist.map((w, i) =>
                    w.url ? (
                      <a key={i} href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-11 items-center justify-between gap-2">
                        {w.title}
                        <Icon name="external" size={16} className="shrink-0 text-muted" />
                      </a>
                    ) : (
                      <span key={i} className="flex min-h-11 items-center">
                        {w.title}
                      </span>
                    ),
                  )}
                </span>
              </Row>
            ) : null}
            {gifts!.skip.length ? (
              <Row label={t("gift.skip")}>
                <span className="text-muted line-through decoration-red decoration-2">{gifts!.skip.join(t("common.and"))}</span>
              </Row>
            ) : null}
            <div className="border-t border-rule" />
          </>
        )}
      </section>

      <section className="flex flex-col px-6 pt-9" aria-labelledby="favorites">
        <h2 id="favorites" className="section-title mb-2">
          {t("person.favorites")}
        </h2>
        {notShared("favorites") ? (
          hidden
        ) : isEmptySection("favorites", fav) ? (
          empty
        ) : (
          <>
            {fav!.colors?.length ? (
              <Row label={t("gift.colors")} align="center">
                <span className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[15px]">
                  {fav!.colors.map((code) => {
                    const c = COLORS.find((x) => x.code === code);
                    return (
                      <span key={code} className="flex items-center gap-1.5">
                        <ColorDot hex={c?.hex ?? "#FFFFFF"} size={20} />
                        {c?.label[locale] ?? code}
                      </span>
                    );
                  })}
                </span>
              </Row>
            ) : null}
            {fav!.idol ? <Row label={t("fav.idol")}>{fav!.idol}</Row> : null}
            {fav!.character ? <Row label={t("fav.character")}>{fav!.character}</Row> : null}
            {fav!.team ? <Row label={t("fav.team")}>{fav!.team}</Row> : null}
            {fav!.animal ? <Row label={t("fav.animal")}>{fav!.animal}</Row> : null}
            {fav!.patterns.length ? <Row label={t("fav.patterns")}>{codes(PATTERNS, fav!.patterns)}</Row> : null}
            {fav!.styles.length ? <Row label={t("fav.styles")}>{codes(STYLES, fav!.styles)}</Row> : null}
            {fav!.metals.length ? <Row label={t("fav.metals")}>{codes(METALS, fav!.metals)}</Row> : null}
            <div className="border-t border-rule" />
          </>
        )}
      </section>

      <section className="flex flex-col px-6 pt-9" aria-labelledby="culture">
        <h2 id="culture" className="section-title mb-2">
          {t("person.culture")}
        </h2>
        {notShared("culture") ? (
          hidden
        ) : isEmptySection("culture", culture) ? (
          empty
        ) : (
          <>
            {culture!.movieGenres.length ? <Row label={t("fav.movieGenres")}>{codes(MOVIE_GENRES, culture!.movieGenres)}</Row> : null}
            {culture!.movie ? <Row label={t("fav.movie")}>{culture!.movie}</Row> : null}
            {culture!.drama ? <Row label={t("fav.drama")}>{culture!.drama}</Row> : null}
            {culture!.shows ? <Row label={t("fav.shows")}>{culture!.shows}</Row> : null}
            {culture!.musicGenres.length ? <Row label={t("fav.musicGenres")}>{codes(MUSIC_GENRES, culture!.musicGenres)}</Row> : null}
            {culture!.song ? <Row label={t("fav.song")}>{culture!.song}</Row> : null}
            {culture!.book ? <Row label={t("fav.book")}>{culture!.book}</Row> : null}
            <div className="border-t border-rule" />
          </>
        )}
      </section>

      <section className="flex flex-col px-6 pt-9" aria-labelledby="life">
        <h2 id="life" className="section-title mb-2">
          {t("person.life")}
        </h2>
        {notShared("life") ? (
          hidden
        ) : isEmptySection("life", life) ? (
          empty
        ) : (
          <>
            {life!.hobbies.length ? <Row label={t("life.hobbies")}>{life!.hobbies.join(t("common.and"))}</Row> : null}
            {life!.seasons.length ? <Row label={t("fav.seasons")}>{codes(SEASONS, life!.seasons)}</Row> : null}
            {life!.travel ? <Row label={t("fav.travel")}>{life!.travel}</Row> : null}
            <div className="border-t border-rule" />
          </>
        )}
      </section>
    </div>
  );
}
