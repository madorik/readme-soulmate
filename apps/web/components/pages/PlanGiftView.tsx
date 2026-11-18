import { COLORS, METALS, PATTERNS, STYLES, describeShoe, describeTop, labelOf, type UpcomingEvent } from "@readme/core";
import Link from "next/link";
import { ShareBar } from "@/app/(app)/plan/ShareBar";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import type { Person } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import type { PlanGiftData } from "@/lib/pages/plan-gift.data";
import { displayName } from "@/lib/person";
import { makeT } from "@/lib/t";

/** 선물 추천 자리. 웹은 AI·쿠팡을 부르는 서버 컴포넌트를 Suspense로 나중에 채워 넣고, 없으면(토스 번들) 그리지 않는다 */
export interface PlanGiftPicks {
  /** 사람 카드 아래 한 줄 */
  row: (p: Person, name: string, next: UpcomingEvent | undefined) => React.ReactNode;
  /** 목록 아래 고지 */
  disclosure: React.ReactNode;
}

/** 같이 고르기 > 선물 고르기: 고른 사람마다 선물 힌트 한 장 */
export function PlanGiftView({ locale, today, people, back, picksOn, picks }: PlanGiftData & { picks?: PlanGiftPicks }) {
  const t = makeT(locale);
  const and = t("common.and");

  const hints = (p: Person) => {
    const { gifts: g, sizes: z, favorites: f, life: l, taste: tt, culture: c } = p.card;
    const style = [...(f?.patterns ?? []).map((x) => labelOf(PATTERNS, x, locale)), ...(f?.styles ?? []).map((x) => labelOf(STYLES, x, locale)), ...(f?.metals ?? []).map((x) => labelOf(METALS, x, locale))].join(and);
    const top = describeTop(z?.top ?? "", locale);
    const shoe = describeShoe(z?.shoe ?? null, locale);
    const sizes = [top ? `${t("size.top")} ${top.value}${top.unit}` : "", z?.bottom ? `${t("size.bottom")} ${z.bottom}` : "", shoe ? `${t("size.shoe")} ${shoe.value}mm` : "", z?.ring ? `${t("size.ring")} ${z.ring}` : ""].filter(Boolean).join(and);
    return [
      l?.hobbies.length ? { label: t("life.hobbies"), value: l.hobbies.join(and) } : null,
      g?.wishlist.length ? { label: t("gift.ideas"), value: g.wishlist.map((w) => w.title).join(and) } : null,
      g?.brands?.length ? { label: t("gift.brands"), value: g.brands.join(and) } : null,
      f?.idol ? { label: t("fav.idol"), value: f.idol } : null,
      f?.character ? { label: t("fav.character"), value: f.character } : null,
      f?.team ? { label: t("fav.team"), value: f.team } : null,
      f?.animal ? { label: t("fav.animal"), value: f.animal } : null,
      style ? { label: t("fav.style"), value: style } : null,
      f?.colors?.length ? { label: t("gift.colors"), value: f.colors.map((x) => labelOf(COLORS, x, locale)).join(and) } : null,
      f?.flowers ? { label: t("gift.flowers"), value: f.flowers } : null,
      f?.scent ? { label: t("gift.scent"), value: f.scent } : null,
      f?.places?.length ? { label: t("fav.places"), value: f.places.join(and) } : null,
      tt?.dessert ? { label: t("fav.dessert"), value: tt.dessert } : null,
      c?.book ? { label: t("fav.book"), value: c.book } : null,
      g?.giftCard ? { label: t("gift.giftCard"), value: t(g.giftCard === "yes" ? "gift.giftCardYes" : "gift.giftCardNo") } : null,
      sizes ? { label: t("person.sizes"), value: sizes } : null,
      g?.skip.length ? { label: t("gift.skip"), value: g.skip.join(and), strike: true } : null,
    ].filter((x): x is { label: string; value: string; strike?: boolean } => !!x);
  };

  // 공유하기: 같이 준비하는 사람(예: 형제)에게 보낼 선물 힌트
  const shareText = [
    t("plan.giftTitle"),
    ...people.map((p) => {
      const name = displayName(p);
      const next = eventsFor([p], today)[0];
      const head = next ? `${name} · ${t("plan.nextDate", { event: eventName(next, t, locale), n: next.daysUntil })}` : name;
      const rows = hints(p);
      return [head, ...(rows.length ? rows.map((r) => `· ${r.label}: ${r.value}`) : [`· ${t("plan.giftNone")}`])].join("\n");
    }),
  ].join("\n\n");

  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={back} label={t("common.back")} />
      <h1 className="headline px-6 pt-1 text-[26px]">{t("plan.giftTitle")}</h1>
      <div className="flex flex-col gap-3 px-4 pt-5">
        {people.map((p) => {
          const name = displayName(p);
          const next = eventsFor([p], today)[0];
          const rows = hints(p);
          return (
            <section key={p.contactId} className="flex flex-col rounded-2xl bg-fill px-5 pb-2 pt-4">
              <div className="flex items-center gap-3 pb-2">
                <Avatar config={p.avatar} size={40} label={t("avatar.of", { name })} />
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[16px] font-bold">{name}</span>
                  {next ? <span className={`text-[12.5px] ${next.daysUntil <= 30 ? "font-bold text-accent" : "text-muted"}`}>{t("plan.nextDate", { event: eventName(next, t, locale), n: next.daysUntil })}</span> : null}
                </div>
                <Link href={`/people/${p.contactId}/reminder`} className="flex min-h-11 items-center gap-0.5 text-[13px] font-medium text-muted">
                  {t("plan.seeHints")}
                  <Icon name="chevron" size={16} />
                </Link>
              </div>
              {rows.length ? (
                rows.map((r) => (
                  <div key={r.label} className="flex gap-3 border-t border-rule py-2.5">
                    <span className="w-[84px] shrink-0 text-[12.5px] text-muted">{r.label}</span>
                    <span className={`min-w-0 flex-1 text-[14.5px] font-medium leading-[1.45] ${r.strike ? "text-muted line-through decoration-red" : ""}`}>{r.value}</span>
                  </div>
                ))
              ) : (
                <p className="border-t border-rule py-3 text-[13.5px] text-muted">{t("plan.giftNone")}</p>
              )}
              {picksOn && picks ? <div className="-mx-5 border-t border-rule pb-2">{picks.row(p, name, next)}</div> : null}
            </section>
          );
        })}
      </div>
      {picksOn && picks ? picks.disclosure : null}
      <div className="h-6" />
      <ShareBar plain={shareText} label={t("plan.share")} doneLabel={t("plan.sent")} />
    </div>
  );
}
