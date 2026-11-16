import { realCodes, ALLERGENS, DISLIKES, METALS, PATTERNS, SPICY_LEVELS, eventTitle, formatDayFull, formatSpec, labelOf, monthName, nextOccurrence, weekdayLong, type DateSpec } from "@readme/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/chrome";
import { GiftActions } from "@/components/GiftActions";
import { GiftPicks, GiftPicksSkeleton, parseSkip } from "@/components/GiftPicks";
import { Icon, MarkerCircle } from "@/components/marks";
import { displayName, listNotes, listPeople, requireSession, todayFor } from "@/lib/data";
import { giftPicksOn } from "@/lib/gifts";
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

export default async function Reminder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string; label?: string; skip?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const people = await listPeople(s);
  const p = people.find((x) => x.contactId === id);
  if (!p) notFound();
  const name = displayName(p);
  const today = todayFor(s.profile);
  const dates = p.card.dates;
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
  const { favorites: fav, life } = p.card;
  const favHint = [fav?.idol, fav?.character, fav?.team, fav?.animal].filter(Boolean).join(t("common.and"));
  const styleHint = [...(fav?.patterns ?? []).map((c) => labelOf(PATTERNS, c, locale)), ...(fav?.metals ?? []).map((c) => labelOf(METALS, c, locale))].join(t("common.and"));

  const meal = [
    ...realCodes(safety?.allergens).map((c) => `${labelOf(ALLERGENS, c, locale)} ${t("person.allergy")}`),
    ...realCodes(safety?.dislikes).map((c) => labelOf(DISLIKES, c, locale)),
  ];
  const hasHints = !!(favHint || styleHint || taste?.dessert || life?.hobbies.length || fav?.flowers || fav?.scent || fav?.places?.length || gifts?.wishlist.length || gifts?.skip.length || meal.length || taste?.spicy != null || notes.length || sizes?.shoe);
  // 이런 선물은 어때요(쿠팡 API 키가 있으면 상품, 없으면 파트너스 링크 목록에서 가격대별로)
  const picksOn = giftPicksOn();
  // 다시 고르기: 지금 주소(날 종류·이름은 그대로)에 지난번에 보인 것(skip)을 실어 보낸다
  const skip = parseSkip(sp.skip);
  const here = new URLSearchParams();
  if (sp.kind) here.set("kind", sp.kind);
  if (sp.label) here.set("label", sp.label);
  const again = `/people/${p.contactId}/reminder${here.size ? `?${here.toString()}` : ""}`;
  const loading = [1, 2, 3, 4].map((n) => t(`picks.loading.${n}` as "picks.loading.1", { name }));
  const occasion = anniversary ? { kind: "anniversary" as const, label: anniversary.label } : dates?.birthday ? { kind: "birthday" as const, label: "" } : null;
  const shareText = next ? `${event} ${formatDayFull(next.date, locale)}${spec?.calendar === "lunar" ? ` (${formatSpec(spec, locale)})` : ""}` : event;
  // 선물 완료: 이번 챙길 날 메모 이름(지난 지 얼마 안 된 날이면 그해). 남겼으면 무엇을 했는지
  const doneYear = next ? (next.daysUntil > 180 ? next.date.y - 1 : next.date.y) : today.y;
  const doneLabel = `${doneYear} ${event}`.slice(0, 40);
  const done = notes.find((n) => n.label === doneLabel)?.body ?? null;

  return (
    <>
      <TopBar back={`/people/${p.contactId}`} label={t("common.back")} right={<Link href="/privacy#reminders" aria-label={t("privacy.reminders")} className="flex h-11 w-11 items-center justify-center"><Icon name="bell" /></Link>} />

      {next && spec ? (
        <div className="flex items-center gap-[22px] pl-[34px] pr-6 pt-1.5">
          <span className="num relative text-[112px] font-extralight !leading-[0.9] tracking-[-0.04em] text-accent">
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
        {life?.hobbies.length ? <Hint label={t("life.hobbies")}>{life.hobbies.join(t("common.and"))}</Hint> : null}
        {favHint ? <Hint label={t("fav.people")}>{favHint}</Hint> : null}
        {gifts?.wishlist.length ? <Hint label={t("reminder.wish")}>{gifts.wishlist.map((w) => w.title).join(t("common.and"))}</Hint> : null}
        {fav?.flowers ? <Hint label={t("reminder.flowers")}>{fav.flowers}</Hint> : null}
        {fav?.scent ? <Hint label={t("reminder.scent")}>{fav.scent}</Hint> : null}
        {fav?.places?.length ? <Hint label={t("fav.places")}>{fav.places.join(t("common.and"))}</Hint> : null}
        {sizes?.shoe ? <Hint label={t("size.shoe")}>{sizes.shoe}mm</Hint> : null}
        {styleHint ? <Hint label={t("fav.style")}>{styleHint}</Hint> : null}
        {taste?.dessert ? <Hint label={t("fav.dessert")}>{taste.dessert}</Hint> : null}
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

      {picksOn ? (
        <section id="picks" aria-labelledby="picks-title" className="relative flex scroll-mt-2 flex-col pt-8">
          <h2 id="picks-title" className="pl-6 pr-36 text-[15px] font-bold">
            {t("picks.title")}
          </h2>
          {/* 다시 고르면 key가 바뀌어 고르는 동안 빈 자리와 문구를 다시 보인다 */}
          <Suspense key={skip.join(",")} fallback={<GiftPicksSkeleton loading={loading} />}>
            <GiftPicks s={s} person={p} occasion={occasion} today={today} skip={skip} again={again} card={{ name, event: shareText }} />
          </Suspense>
        </section>
      ) : null}
      <div className="h-6" />

      <div className="bottom-bar mt-auto flex flex-col gap-2.5 bg-bg px-6 pt-4">
        {next && next.daysUntil > 0 && s.profile.reminderOffsets.includes(0) ? <span className="text-[13px] text-muted">{t("reminder.again")}</span> : null}
        <GiftActions
          contactId={p.contactId}
          doneLabel={doneLabel}
          done={done}
          fallbackText={shareText}
          labels={{
            together: t("reminder.together"),
            shared: t("reminder.shared"),
            done: t("picks.done"),
            doneTitle: t("picks.doneTitle"),
            doneOwn: t("picks.doneOwn"),
            doneSave: t("picks.doneSave"),
            doneEdit: t("picks.doneEdit"),
            close: t("common.close"),
          }}
        />
      </div>
    </>
  );
}
