import { ALLERGENS, DISLIKES, METALS, PATTERNS, SPICY_LEVELS, eventTitle, formatDayFull, formatSpec, labelOf, monthName, nextOccurrence, weekdayLong, type DateSpec } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { Icon, MarkerCircle } from "@/components/marks";
import { ShareTextButton } from "@/components/ShareButtons";
import { displayName, listNotes, listPeople, requireSession, todayFor } from "@/lib/data";
import { makeT } from "@/lib/i18n";

function Hint({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="row">
      <span className="w-[76px] shrink-0 pt-0.5 text-[13.5px] text-muted">{label}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15.5px] font-medium leading-[1.45]">{children}</span>
        {sub ? <span className="text-[12.5px] text-muted">{sub}</span> : null}
      </span>
    </div>
  );
}

export default async function Reminder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string; label?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const people = await listPeople(s);
  const p = people.find((x) => x.contactId === id);
  if (!p || p.kind === "pending") notFound();
  const name = displayName(p);
  const today = todayFor(s.profile);
  const dates = p.sections.includes("dates") ? p.card.dates : undefined;
  const anniversary = sp.kind === "anniversary" ? dates?.anniversaries.find((a) => a.label === sp.label) : undefined;
  const spec: DateSpec | null = anniversary?.spec ?? dates?.birthday ?? null;
  const next = spec ? nextOccurrence(spec, today) : null;
  const event =
    spec && next
      ? eventTitle(locale, { kind: anniversary ? "anniversary" : "birthday", name, label: anniversary?.label, spec, date: next.date })
      : anniversary
        ? t("home.event.anniversary", { name, label: anniversary.label })
        : t("home.event.birthday", { name });
  const notes = await s.tx((q) => listNotes(q, s.user.id, p.contactId));
  const { gifts, safety, taste, sizes } = p.card;
  const fav = p.sections.includes("favorites") ? p.card.favorites : undefined;
  const favHint = [fav?.idol, fav?.character, fav?.team].filter(Boolean).join(t("common.and"));
  const styleHint = [...(fav?.patterns ?? []).map((c) => labelOf(PATTERNS, c, locale)), ...(fav?.metals ?? []).map((c) => labelOf(METALS, c, locale))].join(t("common.and"));

  const meal = [
    ...(safety?.allergens ?? []).map((c) => `${labelOf(ALLERGENS, c, locale)} ${t("person.allergy")}`),
    ...(safety?.dislikes ?? []).map((c) => labelOf(DISLIKES, c, locale)),
  ];
  const hasHints = !!(favHint || styleHint || fav?.dessert || gifts?.loves.length || gifts?.flowers || gifts?.scent || gifts?.wishlist.length || gifts?.skip.length || meal.length || taste?.spicy != null || notes.length || sizes?.shoe);
  const shareText = next ? `${event} ${formatDayFull(next.date, locale)}${spec?.calendar === "lunar" ? ` (${formatSpec(spec, locale)})` : ""}` : event;

  return (
    <>
      <TopBar back={`/people/${p.contactId}`} label={t("common.back")} right={<Link href="/privacy#reminders" aria-label={t("privacy.reminders")} className="flex h-11 w-11 items-center justify-center"><Icon name="bell" /></Link>} />

      {next && spec ? (
        <div className="flex items-center gap-[22px] pl-[34px] pr-6 pt-1.5">
          <span className="num relative text-[112px] font-extralight !leading-[0.9] tracking-[-0.04em] text-red">
            {next.date.d}
            <MarkerCircle pad={[18, 12]} width={2.2} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[17px] font-bold">
              {monthName(next.date.m, locale, true)} {weekdayLong(next.date, locale)}
            </span>
            {spec.calendar === "lunar" ? <span className="text-[13.5px] text-muted">{formatSpec(spec, locale)}</span> : null}
          </div>
          <Avatar config={p.avatar} size={56} label={t("avatar.of", { name })} />
        </div>
      ) : null}

      <h1 className="headline mx-6 mt-6 text-[28px]">{next ? (next.daysUntil === 0 ? t("reminder.today", { event }) : t("reminder.left", { event, n: next.daysUntil })) : event}</h1>

      <section className="flex flex-col px-6 pt-6">
        <h2 className="mb-2 text-[15px] font-bold">{t("reminder.hints", { name })}</h2>
        {!hasHints ? <p className="row text-[14px] leading-[1.6] text-muted">{t("reminder.noHints", { name })}</p> : null}
        {gifts?.loves.length ? <Hint label={t("gift.loves")}>{gifts.loves.join(t("common.and"))}</Hint> : null}
        {favHint ? <Hint label={t("fav.people")}>{favHint}</Hint> : null}
        {gifts?.flowers ? <Hint label={t("reminder.flowers")}>{gifts.flowers}</Hint> : null}
        {gifts?.scent ? <Hint label={t("reminder.scent")}>{gifts.scent}</Hint> : null}
        {gifts?.wishlist.length ? <Hint label={t("reminder.wish")}>{gifts.wishlist.map((w) => w.title).join(t("common.and"))}</Hint> : null}
        {sizes?.shoe ? <Hint label={t("size.shoe")}>{sizes.shoe}mm</Hint> : null}
        {styleHint ? <Hint label={t("fav.style")}>{styleHint}</Hint> : null}
        {fav?.dessert ? <Hint label={t("fav.dessert")}>{fav.dessert}</Hint> : null}
        {gifts?.skip.length ? (
          <Hint label={t("reminder.skip")}>
            <span className="text-muted line-through decoration-red decoration-2">{gifts.skip.join(t("common.and"))}</span>
          </Hint>
        ) : null}
        {meal.length || taste?.spicy != null ? (
          <Hint label={t("reminder.meal")}>
            {[...meal, ...(taste?.spicy != null ? [`${t("taste.spicy")} ${SPICY_LEVELS[taste.spicy]?.[locale]}`] : [])].join(t("common.and"))}
          </Hint>
        ) : null}
        {notes.length ? (
          <Hint label={t("reminder.pastNotes")}>
            {notes
              .slice(0, 3)
              .map((n) => (n.label ? `${n.label} ${n.body}` : n.body))
              .join(" / ")}
          </Hint>
        ) : null}
        <div className="border-t border-rule" />
      </section>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 bg-white px-6 pt-4" style={{ paddingBottom: "max(var(--sab), 16px)" }}>
        {next && next.daysUntil > 0 && s.profile.reminderOffsets.includes(0) ? <span className="text-[13px] text-muted">{t("reminder.again")}</span> : null}
        <div className="grid grid-cols-2 gap-2.5">
          <ShareTextButton text={shareText} label={t("reminder.together")} doneLabel={t("reminder.shared")} className="btn-outline" />
          <Link href={`/people/${p.contactId}#gifts`} className="btn-primary">
            {t("person.pickGift")}
          </Link>
        </div>
      </div>
    </>
  );
}
