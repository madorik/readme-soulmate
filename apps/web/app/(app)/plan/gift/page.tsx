import { COLORS, METALS, PATTERNS, STYLES, describeShoe, describeTop, labelOf } from "@readme/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import { displayName, requireSession, todayFor, type Person } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import { makeT } from "@/lib/i18n";
import { pickBack, resolvePick } from "@/lib/plan";
import { ShareBar } from "../ShareBar";

/** 같이 고르기 > 선물 고르기: 고른 사람마다 선물 힌트 한 장 */
export default async function PlanGift({ searchParams }: { searchParams: Promise<{ with?: string; me?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const today = todayFor(s.profile);
  const pick = await resolvePick(s, sp);
  if (!pick.people.length) redirect(pickBack(pick.query));
  const and = t("common.and");

  const hints = (p: Person) => {
    const can = (x: Parameters<typeof p.sections.includes>[0]) => p.sections.includes(x);
    const g = can("gifts") ? p.card.gifts : undefined;
    const z = can("sizes") ? p.card.sizes : undefined;
    const f = can("favorites") ? p.card.favorites : undefined;
    const style = [...(f?.patterns ?? []).map((x) => labelOf(PATTERNS, x, locale)), ...(f?.styles ?? []).map((x) => labelOf(STYLES, x, locale)), ...(f?.metals ?? []).map((x) => labelOf(METALS, x, locale))].join(and);
    const top = describeTop(z?.top ?? "", locale);
    const shoe = describeShoe(z?.shoe ?? null, locale);
    const sizes = [top ? `${t("size.top")} ${top.value}${top.unit}` : "", z?.bottom ? `${t("size.bottom")} ${z.bottom}` : "", shoe ? `${t("size.shoe")} ${shoe.value}mm` : "", z?.ring ? `${t("size.ring")} ${z.ring}` : ""].filter(Boolean).join(and);
    return [
      g?.loves.length ? { label: t("gift.loves"), value: g.loves.join(and) } : null,
      g?.wishlist.length ? { label: t("gift.wishlist"), value: g.wishlist.map((w) => w.title).join(and) } : null,
      g?.brands?.length ? { label: t("gift.brands"), value: g.brands.join(and) } : null,
      f?.idol ? { label: t("fav.idol"), value: f.idol } : null,
      f?.character ? { label: t("fav.character"), value: f.character } : null,
      f?.team ? { label: t("fav.team"), value: f.team } : null,
      style ? { label: t("fav.style"), value: style } : null,
      g?.colors.length ? { label: t("gift.colors"), value: g.colors.map((x) => labelOf(COLORS, x, locale)).join(and) } : null,
      g?.flowers ? { label: t("gift.flowers"), value: g.flowers } : null,
      g?.scent ? { label: t("gift.scent"), value: g.scent } : null,
      f?.dessert ? { label: t("fav.dessert"), value: f.dessert } : null,
      f?.book ? { label: t("fav.book"), value: f.book } : null,
      g?.giftCard ? { label: t("gift.giftCard"), value: t(g.giftCard === "yes" ? "gift.giftCardYes" : "gift.giftCardNo") } : null,
      sizes ? { label: t("person.sizes"), value: sizes } : null,
      g?.skip.length ? { label: t("gift.skip"), value: g.skip.join(and), strike: true } : null,
    ].filter((x): x is { label: string; value: string; strike?: boolean } => !!x);
  };

  // 공유하기: 같이 준비하는 사람(예: 형제)에게 보낼 선물 힌트
  const shareText = [
    t("plan.giftTitle"),
    ...pick.people.map((p) => {
      const name = displayName(p);
      const next = eventsFor([p], today)[0];
      const head = next ? `${name} · ${t("plan.nextDate", { event: eventName(next, t, locale), n: next.daysUntil })}` : name;
      const rows = hints(p);
      return [head, ...(rows.length ? rows.map((r) => `· ${r.label}: ${r.value}`) : [`· ${t("plan.giftNone")}`])].join("\n");
    }),
  ].join("\n\n");

  return (
    <div className="flex flex-1 flex-col">
      <TopBar back={pickBack(pick.query)} label={t("common.back")} />
      <h1 className="headline px-6 pt-1 text-[26px]">{t("plan.giftTitle")}</h1>
      <div className="flex flex-col gap-3 px-4 pt-5">
        {pick.people.map((p) => {
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
                  <div key={r.label} className="flex gap-3 border-t border-[#e6e6e3] py-2.5">
                    <span className="w-[84px] shrink-0 text-[12.5px] text-muted">{r.label}</span>
                    <span className={`min-w-0 flex-1 text-[14.5px] font-medium leading-[1.45] ${r.strike ? "text-muted line-through decoration-red" : ""}`}>{r.value}</span>
                  </div>
                ))
              ) : (
                <p className="border-t border-[#e6e6e3] py-3 text-[13.5px] text-muted">{t("plan.giftNone")}</p>
              )}
            </section>
          );
        })}
      </div>
      <div className="h-6" />
      <ShareBar plain={shareText} label={t("plan.share")} doneLabel={t("plan.sent")} />
    </div>
  );
}
