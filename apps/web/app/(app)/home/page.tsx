import { addDays, formatDayFull, formatSpec, questionFor, sameYmd, solarToLunar, weekday, weekdayNames } from "@readme/core";
import Link from "next/link";
import { answerQuestion } from "@/app/actions/card";
import { Avatar } from "@/components/Avatar";
import { TabBar, Wordmark } from "@/components/chrome";
import { EmptyPortrait, EventPortrait } from "@/components/EventArt";
import { Icon, MarkerCircle } from "@/components/marks";
import { PeopleList } from "@/components/PeopleList";
import { activeShareIds, displayName, listPeople, readCard, requireSession, todayFor } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import { makeT } from "@/lib/i18n";

// 시안 C2: 오늘 날짜 → 다가오는 날(가는 큰 숫자) → 이번 주(붉은 동그라미) → 오늘의 질문 → 내 사람들
export default async function Home({ searchParams }: { searchParams: Promise<{ answered?: string }> }) {
  const { answered } = await searchParams;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const today = todayFor(s.profile);
  const [people, mine, sharingWith] = await Promise.all([listPeople(s), s.tx((q) => readCard(q, s.user.id)), s.tx((q) => activeShareIds(q, s.user.id))]);
  const events = eventsFor(people, today);
  const next = events.find((e) => e.daysUntil <= 60) ?? null;
  const nextPerson = next ? (people.find((p) => p.contactId === next.contactId) ?? null) : null;
  // 두 달 안에는 없지만 그 뒤에 있는 날(빈 화면에서 '다음은 …'으로 알려 준다)
  const later = next ? null : (events[0] ?? null);
  const question = questionFor(today, mine.card);
  const names = weekdayNames(locale);
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  const lunarToday = solarToLunar(today);
  const hintHref = next ? `/people/${next.contactId}/reminder?kind=${next.kind}${next.label ? `&label=${encodeURIComponent(next.label)}` : ""}` : "";

  return (
    <>
      <div className="flex items-center justify-between pl-6 pr-3">
        <Wordmark />
        <div className="flex items-center">
          <Link href="/me" aria-label={t("home.myCard")} className="flex h-11 w-11 items-center justify-center">
            <Avatar config={s.profile.avatar} size={32} label={t("home.myCard")} />
          </Link>
        </div>
      </div>

      <section aria-label={t("home.upcoming")} className="flex flex-col px-6 pt-5">
        <span className="text-[12.5px] text-muted">
          {formatDayFull(today, locale)}
          {lunarToday ? (locale === "ko" ? ` · 음력 ${lunarToday.m}월 ${lunarToday.d}일` : ` · Lunar ${lunarToday.m}/${lunarToday.d}`) : ""}
        </span>
        {next ? (
          <>
            <div className="flex items-end gap-2.5 pt-[18px]">
              {next.daysUntil === 0 ? (
                <span className="text-[56px] font-light leading-[0.9] tracking-[-0.04em]">{t("start.today")}</span>
              ) : (
                <span className="num text-[104px] font-extralight leading-[0.82] tracking-[-0.04em]">{next.daysUntil}</span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-0.5">
                {next.daysUntil > 0 ? <span className="text-[12px] font-bold tracking-[0.04em] text-red">{next.daysUntil === 1 ? t("home.dayToGo") : t("home.daysToGo")}</span> : null}
                <span className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">{eventName(next, t, locale)}</span>
              </div>
              <EventPortrait
                href={`/people/${next.contactId}`}
                avatar={nextPerson?.avatar ?? null}
                name={nextPerson ? displayName(nextPerson) : next.name}
                kind={next.kind}
              />
            </div>
            <span className="pt-3 text-[13px] text-muted">
              {next.spec.calendar === "lunar" ? `${formatSpec(next.spec, locale)}${t("common.and")}` : ""}
              {formatDayFull(next.date, locale)}
            </span>
            <Link href={hintHref} className="mt-[18px] flex min-h-12 items-center justify-between border-y border-rule text-[14.5px] font-medium">
              {t("home.hints")}
              <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 pt-[18px]">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">{later ? t("home.quietTitle") : t("home.noUpcomingTitle")}</span>
                <span className="text-[13px] leading-[1.55] text-muted">
                  {later ? t("home.quietBody", { event: eventName(later, t, locale), date: formatDayFull(later.date, locale) }) : t("home.noUpcomingBody")}
                </span>
              </div>
              <EmptyPortrait />
            </div>
            {later ? null : (
              <Link href="/request" className="mt-[18px] flex min-h-12 items-center justify-between border-y border-rule text-[14.5px] font-medium">
                {t("home.askDates")}
                <Icon name="chevron" size={18} strokeWidth={1.6} className="text-muted" />
              </Link>
            )}
          </>
        )}
      </section>

      <section aria-label={t("nav.home")} className="px-4 pt-[22px]">
        <ol className="grid grid-cols-8">
          {days.map((day, i) => {
            const wd = weekday(day);
            const event = events.find((e) => sameYmd(e.date, day));
            const lunar = solarToLunar(day);
            return (
              <li key={i} className="flex flex-col items-center gap-1.5">
                <span className={`text-[10.5px] ${i === 0 ? "font-bold text-ink" : wd === 0 ? "text-red" : "text-muted"}`}>{i === 0 ? t("start.today") : names[wd]}</span>
                <span className={`num relative flex h-[34px] w-[34px] items-center justify-center text-[17px] ${event ? "font-medium text-red" : i === 0 ? "font-bold" : "font-light"}`}>
                  {day.d}
                  {event ? <MarkerCircle pad={[5, 3]} /> : null}
                </span>
                <span className={`h-1 w-1 rounded-full ${i === 0 ? "bg-ink" : "bg-transparent"}`} />
                <span className={`text-[10px] ${event ? "text-red" : "text-muted"}`}>{lunar ? `${lunar.m}.${lunar.d}` : ""}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {question ? (
        // 오늘의 질문: 홈에서 눈에 띄게(분홍 바탕 + 빨간 라벨 + 큰 질문 + 또렷한 답 버튼)
        <section aria-label={t("home.question")} className="mx-4 mt-[22px] flex flex-col gap-3 rounded-2xl bg-hl px-[18px] pb-4 pt-4">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.04em] text-red">
              <span aria-hidden="true" className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red text-[11px] leading-none text-white">
                Q
              </span>
              {t("home.question")}
            </span>
            <span className="text-[19px] font-bold leading-[1.35] tracking-[-0.02em]">{question.prompt[locale]}</span>
          </div>
          <form action={answerQuestion} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={question.id} />
            {question.options.map((o) => (
              <button
                key={o.value}
                name="value"
                value={o.value}
                className="h-11 rounded-full bg-white px-4 text-[14px] font-bold shadow-[0_1px_2px_rgba(196,68,58,0.12),inset_0_0_0_1px_rgba(196,68,58,0.22)] transition-transform active:scale-95"
              >
                {o.label[locale]}
              </button>
            ))}
          </form>
        </section>
      ) : null}
      {answered ? (
        <p role="status" className="mx-6 mt-2 flex items-center gap-2 text-[13px] text-muted">
          <Icon name="check" size={16} className="text-ok" />
          {t("home.answered")}
        </p>
      ) : null}

      <div className="flex items-baseline justify-between px-6 pb-1 pt-6">
        <h2 className="text-[15px] font-bold">{t("home.people")}</h2>
        <span className="num text-[13px] text-muted">{people.length}</span>
      </div>
      {people.length ? (
        <PeopleList people={people} today={today} locale={locale} t={t} sharingWith={sharingWith} />
      ) : (
        <div className="flex flex-col gap-3 px-6 pt-2">
          <p className="text-[14px] leading-[1.6] text-muted">{t("home.empty")}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/share" className="btn-outline">
              {t("home.sendMine")}
            </Link>
            <Link href="/request" className="btn-primary">
              {t("home.ask")}
            </Link>
          </div>
          <Link href="/people/new" className="btn-outline">
            {t("people.add")}
          </Link>
        </div>
      )}

      <div className="h-6" />
      <TabBar active="home" t={t} />
    </>
  );
}
