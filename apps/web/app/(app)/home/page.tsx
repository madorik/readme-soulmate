import { addDays, countWord, formatDayFull, formatSpec, questionFor, sameYmd, solarToLunar, weekday, weekdayNames } from "@readme/core";
import Link from "next/link";
import { answerQuestion } from "@/app/actions/card";
import { Avatar } from "@/components/Avatar";
import { ChiliMeter } from "@/components/Chili";
import { TabBar, Wordmark } from "@/components/chrome";
import { EmptyPortrait, EventPortrait } from "@/components/EventArt";
import { Mascot } from "@/components/Mascot";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Icon } from "@/components/marks";
import { displayName, listPeople, readCard, requireSession, todayFor } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import { makeT } from "@/lib/i18n";
import { aiConfigured } from "@/lib/ai";

// 시안 v3: 다가오는 날(흰 카드, 가는 큰 숫자) → 이번 주(오늘은 하늘 그라데이션, 챙길 날엔 그 사람 얼굴) → 리디가 묻는 오늘의 질문 → 내 사람들(가로 줄)
export default async function Home({ searchParams }: { searchParams: Promise<{ answered?: string }> }) {
  const { answered } = await searchParams;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const today = todayFor(s.profile);
  const [people, mine] = await Promise.all([listPeople(s), s.tx((q) => readCard(q, s.user.id))]);
  const events = eventsFor(people, today);
  const next = events.find((e) => e.daysUntil <= 60) ?? null;
  const nextPerson = next ? (people.find((p) => p.contactId === next.contactId) ?? null) : null;
  // 두 달 안에는 없지만 그 뒤에 있는 날(빈 화면에서 '다음은 …'으로 알려 준다)
  const later = next ? null : (events[0] ?? null);
  const question = questionFor(today, mine.card);
  const names = weekdayNames(locale);
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  const weekEvents = days.filter((d) => events.some((e) => sameYmd(e.date, d))).length;
  const lunarToday = solarToLunar(today);
  const hintHref = next ? `/people/${next.contactId}/reminder?kind=${next.kind}${next.label ? `&label=${encodeURIComponent(next.label)}` : ""}` : "";
  // 내 사람들 줄: 즐겨찾기 먼저, 한 달 안에 챙길 날이 있으면 D-day 배지
  const strip = [...people]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .map((p) => {
      const soon = events.find((e) => e.contactId === p.contactId && e.daysUntil <= 30);
      // 화면에는 부르는 말(짧게), 읽어 줄 때는 그 사람 이름 + 부르는 말
      const name = p.name || displayName(p);
      const label = p.nickname && p.nickname !== name ? `${name} ${p.nickname}` : name;
      return { p, label, badge: soon ? (soon.daysUntil === 0 ? t("start.today") : `D-${soon.daysUntil}`) : "" };
    });

  return (
    <>
      <div className="flex items-center justify-between pl-5 pr-3">
        <Wordmark />
        <ProfileMenu avatar={s.profile.avatar} labels={{ menu: t("home.profileMenu"), profile: t("profile.title"), signOut: t("privacy.signOut") }} />
      </div>

      {/* 오늘은 카드 밖에. 카드 안 날짜는 챙길 날 것만 */}
      <p className="flex items-center gap-2 px-5 pb-2.5 pt-1 text-[13px] font-medium text-muted">
        <span className="rounded-full bg-ink px-2 py-[2px] text-[11.5px] font-bold text-white">{t("start.today")}</span>
        <span>
          {formatDayFull(today, locale)}
          {lunarToday ? (locale === "ko" ? ` · 음력 ${lunarToday.m}월 ${lunarToday.d}일` : ` · Lunar ${lunarToday.m}/${lunarToday.d}`) : ""}
        </span>
      </p>

      <section aria-label={t("home.upcoming")} className="card mx-4 flex flex-col px-5 pt-[18px]">
        {next ? (
          <>
            <div className="flex items-end gap-2.5 pt-1">
              {next.daysUntil === 0 ? (
                <span className="text-[56px] font-light leading-[0.9] tracking-[-0.04em]">{t("start.today")}</span>
              ) : (
                <span className="num text-[104px] font-extralight leading-[0.82] tracking-[-0.04em]">{next.daysUntil}</span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-0.5">
                {next.daysUntil > 0 ? <span className="text-[12px] font-bold tracking-[0.04em] text-accent">{next.daysUntil === 1 ? t("home.dayToGo") : t("home.daysToGo")}</span> : null}
                <span className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">{eventName(next, t, locale)}</span>
              </div>
              <EventPortrait href={`/people/${next.contactId}`} avatar={nextPerson?.avatar ?? null} name={nextPerson ? displayName(nextPerson) : next.name} kind={next.kind} />
            </div>
            {/* 챙길 날: 양력 날짜를 먼저 굵게, 음력이면 옆에 */}
            <span className="flex items-center gap-1.5 pt-3.5 text-[14px] font-bold">
              <Icon name="calendar" size={16} strokeWidth={2} className="shrink-0 text-accent" />
              {formatDayFull(next.date, locale)}
              {next.spec.calendar === "lunar" ? <span className="font-medium text-muted">· {formatSpec(next.spec, locale)}</span> : null}
            </span>
            <Link href={hintHref} className="mt-[18px] flex min-h-[52px] items-center justify-between border-t border-rule text-[14.5px] font-medium">
              {t("home.hints")}
              <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">{later ? t("home.quietTitle") : t("home.noUpcomingTitle")}</span>
                {later ? <span className="text-[13px] leading-[1.55] text-muted">{t("home.quietBody", { event: eventName(later, t, locale), date: formatDayFull(later.date, locale) })}</span> : null}
              </div>
              <EmptyPortrait />
            </div>
            {later ? (
              <div className="h-5" />
            ) : (
              <Link href="/request" className="mt-[18px] flex min-h-[52px] items-center justify-between border-t border-rule text-[14.5px] font-medium">
                {t("home.askDates")}
                <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
              </Link>
            )}
          </>
        )}
      </section>

      {/* 누르면 월별 달력(카드 전체가 눌린다) */}
      <section aria-label={t("home.thisWeek")} className="card relative mx-4 mt-3.5 px-2 pb-3.5 pt-4 transition-transform active:scale-[0.99]">
        <Link href="/calendar" aria-label={t("home.openCalendar")} className="absolute inset-0 z-10 rounded-[24px]" />
        <div className="flex items-center justify-between px-2.5 pb-3">
          <h2 className="text-[16px] font-bold">{t("home.thisWeek")}</h2>
          <span className="flex items-center gap-1">
            {weekEvents ? <span className="chip-on rounded-full px-2.5 py-1 text-[12.5px]">{t("home.weekCount", { n: countWord(weekEvents, locale) })}</span> : null}
            <Icon name="chevron" size={18} strokeWidth={1.8} className="text-muted" />
          </span>
        </div>
        <ol className="grid grid-cols-8">
          {days.map((day, i) => {
            const wd = weekday(day);
            const event = events.find((e) => sameYmd(e.date, day));
            const who = event ? (people.find((p) => p.contactId === event.contactId) ?? null) : null;
            const lunar = solarToLunar(day);
            const isToday = i === 0;
            return (
              <li key={i} className="flex flex-col items-center gap-[5px]">
                <span className={`text-[11px] ${isToday ? "font-bold text-accent" : wd === 0 ? "text-red" : wd === 6 ? "text-sat" : "text-muted"}`}>{isToday ? t("start.today") : names[wd]}</span>
                <span
                  className={`num flex h-9 w-9 items-center justify-center rounded-full text-[16px] ${
                    isToday ? "grad !font-bold" : event ? "chip-on !font-bold" : wd === 0 ? "font-semibold text-red" : "font-semibold"
                  }`}
                >
                  {day.d}
                </span>
                <span className="num text-[10px] !font-semibold text-muted">{lunar ? `${lunar.m}.${lunar.d}` : ""}</span>
                <span className="flex h-6 items-center justify-center">
                  {event ? <Avatar config={who?.avatar ?? null} size={24} label={eventName(event, t, locale)} /> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {question ? (
        <section aria-label={t("home.question")} className="card mx-4 mt-3.5 flex flex-col gap-3.5 px-4 pb-4 pt-[18px]">
          <div className="flex items-center gap-2.5">
            <Mascot size={46} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[12.5px] font-bold text-accent">{t("home.question")}</span>
              <span className="text-[19px] font-bold leading-[1.35] tracking-[-0.02em]">{question.prompt[locale]}</span>
            </div>
          </div>
          {/* 넷 이하면 두 줄 격자, 넘으면 옆으로 넘겨 본다(카드 밖까지 이어지게) */}
          <form
            action={answerQuestion}
            className={question.options.length > 4 ? "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "grid grid-cols-2 gap-2"}
          >
            <input type="hidden" name="id" value={question.id} />
            {question.options.map((o) => (
              <button
                key={o.value}
                name="value"
                value={o.value}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-white px-3 py-2 text-[15px] font-bold shadow-[inset_0_0_0_1.5px_var(--color-rule)] transition-[transform,background-color] hover:bg-sky-soft active:scale-95 ${question.options.length > 4 ? "min-w-[96px] shrink-0 snap-start whitespace-nowrap px-4" : ""}`}
              >
                {o.label[locale]}
                {/* 매운맛 질문은 고추 개수로도(값이 단계 0–4) */}
                {question.id === "spicy" ? <ChiliMeter level={Number(o.value)} size={16} /> : null}
              </button>
            ))}
          </form>
        </section>
      ) : null}
      {answered ? (
        <p role="status" className="mx-5 mt-2.5 flex items-center gap-2 text-[13px] text-muted">
          <Icon name="check" size={16} className="text-accent" />
          {t("home.answered")}
        </p>
      ) : null}

      <section aria-label={t("home.people")} className="card mx-4 mt-3.5 px-3 pb-3.5 pt-4">
        <div className="flex items-center justify-between px-1.5 pb-3">
          <h2 className="flex items-baseline gap-1.5 text-[16px] font-bold">
            {t("home.people")}
            <span className="num text-[14px] !font-bold text-muted">{people.length}</span>
          </h2>
          {people.length ? (
            <Link href="/people" className="flex min-h-9 items-center gap-0.5 text-[13px] font-medium text-muted">
              {t("home.seeAll")}
              <Icon name="chevron" size={16} />
            </Link>
          ) : null}
        </div>
        {people.length ? (
          <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {strip.map(({ p, label, badge }) => (
              <Link key={p.contactId} href={`/people/${p.contactId}`} aria-label={badge ? `${label} ${badge}` : label} className="flex w-[60px] shrink-0 flex-col items-center gap-1.5">
                <span className="relative block">
                  <Avatar config={p.avatar} size={52} label={label} />
                  {badge ? (
                    <span className="grad num absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-[3px] text-[10.5px] !font-bold shadow-[0_0_0_2px_#fff]">{badge}</span>
                  ) : null}
                </span>
                <span className="w-full truncate text-center text-[12.5px] font-medium">{displayName(p)}</span>
              </Link>
            ))}
            <Link href="/request" className="flex w-[60px] shrink-0 flex-col items-center gap-1.5 text-accent">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-dashed border-[#f0d27a]">
                <Icon name="plus" size={22} strokeWidth={2.2} />
              </span>
              <span className="text-[12.5px] font-bold">{t("home.request")}</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-1.5">
            <p className="text-[14px] leading-[1.6] text-muted">{t("home.empty")}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/people/new" className="btn-outline">
                {t("people.add")}
              </Link>
              <Link href="/request" className="btn-primary">
                {t("home.ask")}
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className="h-4" />
      <TabBar active="home" t={t} voice={aiConfigured()} />
    </>
  );
}
