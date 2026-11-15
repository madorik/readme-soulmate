import { ALCOHOL_KINDS, ALLERGENS, DIETS, DISLIKES, SPICY_LEVELS, alcoholLabel, groupMemo, judgeMenus, labelOf, mealBrief, orderNote, type MenuReason, type MenuVerdict, type WhoCode } from "@readme/core";
import { ChiliMeter } from "@/components/Chili";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/chrome";
import { CopyButton } from "@/components/CopyButton";
import { Icon, MarkerCircle } from "@/components/marks";
import { ShareTextButton } from "@/components/ShareButtons";
import { requireSession } from "@/lib/data";
import { makeT, type T } from "@/lib/i18n";
import { pickBack, resolvePick } from "@/lib/plan";
import { ShareBar } from "../ShareBar";

function mapUrl(menu: string, locale: "ko" | "en"): string {
  const q = encodeURIComponent(menu);
  return locale === "ko" ? `https://map.naver.com/p/search/${q}` : `https://www.google.com/maps/search/${q}`;
}

function reasonText(r: MenuReason, locale: "ko" | "en", t: T): string {
  const who = r.who.join(", ");
  if (r.kind === "allergy") return `${labelOf(ALLERGENS, r.code, locale)} ${t("person.allergy")} · ${who}`;
  if (r.kind === "diet") return `${labelOf(DIETS, r.code, locale)} · ${who}`;
  if (r.kind === "dislike") return `${labelOf(DISLIKES, r.code, locale)} · ${who}`;
  return `${t("plan.reasonSpicy")} · ${who}`;
}

/** 같이 고르기 > 메뉴 고르기 */
export default async function PlanMenu({ searchParams }: { searchParams: Promise<{ with?: string; me?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const pick = await resolvePick(s, sp);
  if (!pick.people.length) redirect(pickBack(pick.query));
  const brief = mealBrief(pick.diners);
  const verdicts = judgeMenus(pick.diners);
  const ok = verdicts.filter((v) => v.status === "ok");
  const soft = verdicts.filter((v) => v.status === "soft");
  const avoid = verdicts.filter((v) => v.status === "avoid");
  const note = orderNote(brief, locale);
  const picks = ok.slice(0, 3).map((v) => v.item.label[locale]);
  const recommend = picks.length ? `\n${t("plan.recommend", { menus: picks.join(", ") })}` : "";
  const memo = groupMemo(brief, locale, false) + recommend;
  const memoNamed = groupMemo(brief, locale, true) + recommend;
  const avoidRow = (label: string, list: WhoCode[], catalog: Parameters<typeof labelOf>[0], red = false) =>
    list.length ? (
      <div className="row">
        <span className="w-[76px] shrink-0 pt-0.5 text-[13px] text-muted">{label}</span>
        <span className={`flex min-w-0 flex-1 flex-wrap ${red ? "gap-x-6 gap-y-3 pl-1.5" : "gap-x-4 gap-y-2"}`}>
          {list.map((x) => (
            <span key={x.code} className="flex items-baseline gap-2">
              <span className={`relative text-[16px] font-bold ${red ? "text-red" : ""}`}>
                {labelOf(catalog, x.code, locale)}
                {red ? <MarkerCircle color="warn" pad={[7, 4]} /> : null}
              </span>
              <span className="text-[12px] text-muted">{x.who.join(", ")}</span>
            </span>
          ))}
        </span>
      </div>
    ) : null;
  const menuRow = (v: MenuVerdict) => {
    const label = v.item.label[locale];
    return (
      <li key={v.item.code} className="flex flex-col border-t border-rule py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[16.5px] font-bold">{label}</span>
            <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-[12.5px]">
              {v.likedBy.length ? <span className="font-bold text-accent">{t("plan.likedBy", { names: v.likedBy.join(", ") })}</span> : null}
              {v.milder ? <span className="text-muted">{t("plan.milder")}</span> : null}
              {v.reasons.map((r, i) => (
                <span key={i} className="text-muted">
                  {reasonText(r, locale, t)}
                </span>
              ))}
            </span>
          </div>
          {v.status === "ok" ? (
            <div className="flex shrink-0 items-center">
              <a href={mapUrl(label, locale)} target="_blank" rel="noopener noreferrer" aria-label={`${label} · ${t("plan.findPlace")}`} className="flex h-11 w-10 items-center justify-center text-muted">
                <Icon name="map" size={20} />
              </a>
              <ShareTextButton text={t("plan.proposal", { menu: label })} label={t("plan.propose")} doneLabel={t("plan.proposed")} className="flex h-11 items-center whitespace-nowrap px-1.5 text-[13px] font-medium text-ink-2 underline underline-offset-4" />
            </div>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={pickBack(pick.query)} label={t("common.back")} />
      <div className="flex flex-col gap-1.5 px-6 pt-1">
        <h1 className="headline text-[26px]">{t("plan.menuTitle")}</h1>
        <p className="text-[13.5px] text-muted">{pick.diners.map((d) => d.name).join(", ")}</p>
      </div>

      <section aria-labelledby="avoid" className="flex flex-col px-6 pt-6">
        <h2 id="avoid" className="section-title mb-1">
          {t("plan.mustAvoid")}
        </h2>
        {brief.allergens.length || brief.dislikes.length || brief.diets.length || brief.spicy ? (
          <>
            {avoidRow(t("plan.allergy"), brief.allergens, ALLERGENS, true)}
            {avoidRow(t("plan.dislike"), brief.dislikes, DISLIKES)}
            {avoidRow(t("plan.diet"), brief.diets, DIETS)}
            {brief.spicy ? (
              <div className="row">
                <span className="w-[76px] shrink-0 pt-0.5 text-[13px] text-muted">{t("plan.spicy")}</span>
                <span className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <ChiliMeter level={brief.spicy.level} size={18} />
                  <span className="text-[16px] font-bold">{t("plan.spicyUpTo", { level: SPICY_LEVELS[brief.spicy.level]?.[locale] ?? "" })}</span>
                  <span className="text-[12px] text-muted">{brief.spicy.who.join(", ")}</span>
                </span>
              </div>
            ) : null}
            {brief.alcohol.length ? (
              <div className="row">
                <span className="w-[76px] shrink-0 pt-0.5 text-[13px] text-muted">{t("plan.alcohol")}</span>
                <span className="flex flex-1 flex-col gap-1 text-[14px]">
                  {brief.alcohol.map((a) => (
                    <span key={a.who}>
                      <span className="font-medium">{a.who}</span> <span className="text-muted">{[alcoholLabel(a.level, locale), ...a.kinds.map((k) => labelOf(ALCOHOL_KINDS, k, locale))].join(" · ")}</span>
                    </span>
                  ))}
                </span>
              </div>
            ) : null}
            <div className="border-t border-rule" />
          </>
        ) : (
          <p className="row text-[14px] text-muted">{t("plan.nothingToAvoid")}</p>
        )}
      </section>

      {note ? (
        <section className="mx-4 mt-6 flex flex-col gap-2 rounded-2xl bg-fill px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-bold">{t("plan.order")}</span>
            <CopyButton text={note} label={t("plan.copy")} doneLabel={t("plan.copied")} className="flex min-h-11 items-center px-1 text-[13px] font-medium text-muted underline underline-offset-4" />
          </div>
          <p className="text-[15px] leading-[1.6]">{note}</p>
        </section>
      ) : null}

      <section aria-labelledby="ok" className="flex flex-col px-6 pt-8">
        <h2 id="ok" className="section-title">
          {t("plan.okMenus")} <span className="num text-[14px] font-medium text-muted">{ok.length}</span>
        </h2>
        <ul className="mt-2 flex flex-col border-b border-rule">{ok.slice(0, 8).map(menuRow)}</ul>
      </section>

      {soft.length ? (
        <details className="mx-6 mt-6">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-bold">
            {t("plan.softMenus")} <span className="num text-[14px] font-medium text-muted">{soft.length}</span>
          </summary>
          <ul className="flex flex-col border-b border-rule">{soft.map(menuRow)}</ul>
        </details>
      ) : null}
      {avoid.length ? (
        <details className="mx-6 mt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-bold">
            {t("plan.avoidMenus")} <span className="num text-[14px] font-medium text-muted">{avoid.length}</span>
          </summary>
          <ul className="flex flex-col border-b border-rule">{avoid.map(menuRow)}</ul>
        </details>
      ) : null}

      <p className="px-6 pb-6 pt-6 text-[12px] leading-[1.6] text-muted">{t("plan.menuNote")}</p>
      <ShareBar plain={memo} named={memoNamed} label={t("plan.share")} doneLabel={t("plan.sent")} namesLabel={t("plan.withNames")} />
    </div>
  );
}
