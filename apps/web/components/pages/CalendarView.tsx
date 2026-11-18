import { addDays, daysInMonth, diffDays, formatDayFull, formatSpec, monthName, sameYmd, solarToLunar, weekday, weekdayNames, type UpcomingEvent, type YMD } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FaceStack } from "@/components/FaceStack";
import { TabBar } from "@/components/chrome";
import { Icon } from "@/components/marks";
import type { Person } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import type { CalendarData, Month } from "@/lib/pages/calendar.data";
import { makeT } from "@/lib/t";

const monthKey = (v: Month) => `${v.y}-${String(v.m).padStart(2, "0")}`;
const shift = (v: Month, n: number): Month => {
  const i = v.y * 12 + (v.m - 1) + n;
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
};

/** 그 날의 선물 힌트 화면(홈 '선물 힌트 보기'와 같은 곳) */
const hintHref = (e: UpcomingEvent) => `/people/${e.contactId}/reminder?kind=${e.kind}${e.label ? `&label=${encodeURIComponent(e.label)}` : ""}`;

// 월별 달력: 챙길 날의 '이번 주'를 누르면 온다. 위는 달력(음력, 오늘, 챙길 날엔 그 사람 얼굴), 아래는 이 달의 챙길 날 목록
export function CalendarView({ locale, today, cur, people, ai }: CalendarData) {
  const t = makeT(locale);
  const isThisMonth = cur.y === today.y && cur.m === today.m;
  const first: YMD = { y: cur.y, m: cur.m, d: 1 };
  const dim = daysInMonth(cur.y, cur.m);
  const last: YMD = { y: cur.y, m: cur.m, d: dim };
  // 그 달 1일부터 말일까지 돌아오는 생일·기념일(사람마다 그 달의 것)
  const events = eventsFor(people, first, dim - 1);
  const who = (e: UpcomingEvent): Person | null => people.find((p) => p.contactId === e.contactId) ?? null;

  const start = addDays(first, -weekday(first));
  const weeks = Math.ceil((weekday(first) + dim) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const names = weekdayNames(locale);
  const title = locale === "ko" ? `${cur.y}년 ${cur.m}월` : `${monthName(cur.m, locale, true)} ${cur.y}`;
  const lf = solarToLunar(first);
  const ll = solarToLunar(last);
  const lunarRange = lf && ll ? (lf.m === ll.m ? `${lf.m}` : `${lf.m}–${ll.m}`) : "";

  return (
    <>
      <div className="flex min-h-11 items-center justify-between px-3">
        <Link href="/home" aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center">
          <Icon name="back" size={24} />
        </Link>
        {isThisMonth ? (
          <span className="w-11" />
        ) : (
          <Link href="/calendar" className="pill relative !h-9 !px-3.5 text-[13.5px] before:absolute before:-inset-y-1 before:inset-x-0">
            {t("cal.thisMonth")}
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between px-3 pt-1">
        <Link href={`/calendar?m=${monthKey(shift(cur, -1))}`} aria-label={t("cal.prev")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--color-rule)]">
          <Icon name="back" size={20} strokeWidth={2} />
        </Link>
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="headline text-[24px]">{title}</h1>
          {lunarRange ? <span className="text-[12.5px] font-medium text-muted">{t("cal.lunar", { m: lunarRange })}</span> : null}
        </div>
        <Link href={`/calendar?m=${monthKey(shift(cur, 1))}`} aria-label={t("cal.next")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--color-rule)]">
          <Icon name="chevron" size={20} strokeWidth={2} />
        </Link>
      </div>

      <section aria-label={title} className="card mx-4 mt-4 px-1.5 pb-2 pt-3.5">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] pb-1.5 text-center text-[12px] font-bold">
          {names.map((n, i) => (
            <span key={n} className={i === 0 ? "text-red" : i === 6 ? "text-sat" : "text-muted"}>
              {n}
            </span>
          ))}
        </div>
        <ol className="grid grid-cols-[repeat(7,minmax(0,1fr))]">
          {cells.map((day) => {
            const inMonth = day.m === cur.m;
            const wd = weekday(day);
            const isToday = sameYmd(day, today);
            const dayEvents = inMonth ? events.filter((e) => sameYmd(e.date, day)) : [];
            const lunar = solarToLunar(day);
            return (
              <li key={`${day.m}-${day.d}`} className="flex min-h-[78px] flex-col items-center gap-1 border-t border-rule pt-2">
                <span
                  className={`num flex h-8 w-8 items-center justify-center rounded-full text-[15px] ${inMonth ? "" : "opacity-35"} ${
                    isToday ? "grad !font-bold" : dayEvents.length ? "chip-on !font-bold" : wd === 0 ? "font-semibold text-red" : wd === 6 ? "font-semibold text-sat" : "font-semibold"
                  }`}
                >
                  {day.d}
                </span>
                <span className={`num whitespace-nowrap text-[12px] !font-semibold text-muted ${lunar?.leap ? "tracking-[-0.05em]" : ""} ${inMonth ? "" : "opacity-35"}`}>{lunar ? `${lunar.leap ? "윤" : ""}${lunar.m}.${lunar.d}` : ""}</span>
                <FaceStack faces={dayEvents.map((e) => ({ key: `${e.contactId}-${e.kind}-${e.label ?? ""}`, avatar: who(e)?.avatar ?? null, label: eventName(e, t, locale) }))} size={20} />
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label={t("cal.events")} className="mx-4 mt-5">
        <h2 className="flex items-baseline gap-1.5 pb-2 pl-1.5 text-[15px] font-bold">
          {t("cal.events")}
          <span className="num text-[13px] !font-bold text-muted">{events.length}</span>
        </h2>
        {events.length ? (
          <ul className="card flex flex-col px-3.5">
            {events.map((e) => {
              const p = who(e);
              const name = eventName(e, t, locale);
              const left = diffDays(today, e.date);
              const badge = left === 0 ? t("start.today") : left > 0 ? `D-${left}` : t("cal.passed");
              return (
                <li key={`${e.contactId}-${e.kind}-${e.label ?? ""}`} className="border-t border-rule first:border-t-0">
                  <Link href={hintHref(e)} className="flex min-h-[70px] items-center gap-3">
                    <Avatar config={p?.avatar ?? null} size={44} label={name} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15.5px] font-bold">{name}</span>
                      <span className="truncate text-[12.5px] text-muted">
                        {e.spec.calendar === "lunar" ? `${formatSpec(e.spec, locale)}${t("common.and")}` : ""}
                        {formatDayFull(e.date, locale)}
                      </span>
                    </span>
                    <span className={`num shrink-0 rounded-full px-2.5 py-1 text-[12px] !font-bold ${left >= 0 ? "grad" : "bg-fill text-muted"}`}>{badge}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card flex flex-col gap-1 px-5 py-5">
            <span className="text-[15px] font-bold">{t("cal.empty")}</span>
            <Link href="/request" className="flex min-h-11 items-center gap-0.5 self-start text-[14px] font-bold text-accent">
              {t("home.askDates")}
              <Icon name="chevron" size={16} strokeWidth={2.2} />
            </Link>
          </div>
        )}
      </section>

      <div className="h-6" />
      <TabBar active="home" t={t} voice={ai} />
    </>
  );
}
