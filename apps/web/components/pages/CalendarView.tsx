import { addDays, daysInMonth, diffDays, formatDayFull, formatSpec, monthName, sameYmd, solarToLunar, weekday, weekdayNames, type UpcomingEvent, type YMD } from "@readme/core";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { HandCircle, Heart, Sparkle, SKY_STAR, Squiggle, Star, Tape } from "@/components/diary";
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
          <Link href="/calendar" className="pill relative !h-9 !px-3.5 text-[15px] before:absolute before:-inset-y-1 before:inset-x-0">
            {t("cal.thisMonth")}
          </Link>
        )}
      </div>

      <div className="relative flex items-center justify-between px-3 pt-1">
        <Link href={`/calendar?m=${monthKey(shift(cur, -1))}`} aria-label={t("cal.prev")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--color-edge)]">
          <Icon name="back" size={20} strokeWidth={2} />
        </Link>
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="hl px-1 text-[31px] font-normal leading-[1.15]">{title}</h1>
          {lunarRange ? <span className="text-[15px] text-muted">{t("cal.lunar", { m: lunarRange })}</span> : null}
        </div>
        <Link href={`/calendar?m=${monthKey(shift(cur, 1))}`} aria-label={t("cal.next")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1.5px_var(--color-edge)]">
          <Icon name="chevron" size={20} strokeWidth={2} />
        </Link>
        <Star size={20} rotate={-14} className="left-[76px] top-0.5" />
      </div>

      <section aria-label={title} className="card relative mx-4 mt-5 px-2 pb-2 pt-4">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] pb-1.5 text-center text-[16px]">
          {names.map((n, i) => (
            <span key={n} className={i === 0 ? "text-red" : i === 6 ? "text-sat" : "text-muted"}>
              {n}
            </span>
          ))}
        </div>
        <ol className="grid grid-cols-[repeat(7,minmax(0,1fr))]">
          {cells.map((day, i) => {
            const inMonth = day.m === cur.m;
            const wd = weekday(day);
            const isToday = sameYmd(day, today);
            const dayEvents = inMonth ? events.filter((e) => sameYmd(e.date, day)) : [];
            const past = diffDays(today, day) < 0;
            const lunar = solarToLunar(day);
            return (
              <li key={`${day.m}-${day.d}`} className={`flex h-[76px] flex-col items-center gap-px border-dashed border-rule pt-[5px] ${i >= 7 ? "border-t" : ""} ${wd ? "border-l" : ""} ${inMonth ? "" : "opacity-40"}`}>
                <span
                  className={`num relative flex h-[30px] w-[34px] items-center justify-center rounded-full text-[20px] ${
                    isToday ? "" : dayEvents.length ? (past ? "bg-postit/60" : "bg-postit") : ""
                  } ${wd === 0 && !isToday ? "text-red" : wd === 6 && !isToday ? "text-sat" : ""}`}
                >
                  {isToday ? <HandCircle w={40} h={36} className="-left-[3px] -top-[3px]" /> : null}
                  {day.d}
                </span>
                <span className={`num whitespace-nowrap text-[12px] leading-[14px] text-muted ${lunar?.leap ? "tracking-[-0.05em]" : ""}`}>{lunar ? `${lunar.leap ? "윤" : ""}${lunar.m}.${lunar.d}` : ""}</span>
                <span className={`relative flex h-[26px] items-center justify-center ${past ? "opacity-50" : ""}`}>
                  <FaceStack faces={dayEvents.map((e) => ({ key: `${e.contactId}-${e.kind}-${e.label ?? ""}`, avatar: who(e)?.avatar ?? null, label: eventName(e, t, locale) }))} size={25} />
                  {dayEvents.length ? <Heart size={13} rotate={14} className="-top-[5px] right-0.5" /> : null}
                </span>
              </li>
            );
          })}
        </ol>
        <Tape color="pink" className="-left-2.5 -top-1.5" />
        <Tape color="mint" className="-bottom-1 -right-2.5" />
        <Heart size={24} rotate={16} className="-right-2 top-10" />
        <Squiggle w={54} width={2.4} className="-bottom-2 left-[70px]" />
        <Sparkle size={18} className="-left-1.5 bottom-[120px]" />
      </section>

      <section aria-label={t("cal.events")} className="relative mx-4 mt-[26px]">
        <div className="flex items-center gap-2.5 pb-2.5 pl-1.5">
          <h2 className="text-[22px] font-normal">{t("cal.events")}</h2>
          <span className="num -rotate-3 rounded-full bg-[#fff0c9] px-[11px] pb-[3px] pt-0.5 text-[16px] shadow-[inset_0_0_0_1.5px_var(--color-ink)]">{events.length}</span>
        </div>
        {events.length ? (
          <div className="card relative px-3.5 py-1">
            <Tape color="mango" w={84} h={22} rotate={4} alpha={0.62} className="-top-[11px] right-[34px]" />
            <ul className="flex flex-col">
            {(() => {
              const firstUp = events.findIndex((e) => diffDays(today, e.date) >= 0);
              return events.map((e, i) => {
                const p = who(e);
                const name = eventName(e, t, locale);
                const left = diffDays(today, e.date);
                const badge = left === 0 ? t("start.today") : left > 0 ? `D-${left}` : t("cal.passed");
                return (
                  <li key={`${e.contactId}-${e.kind}-${e.label ?? ""}`} className="border-t border-dashed border-rule first-of-type:border-t-0">
                    <Link href={hintHref(e)} className="flex min-h-[70px] items-center gap-3">
                      <span className={`flex shrink-0 ${left < 0 ? "opacity-55" : ""}`}>
                        <Avatar config={p?.avatar ?? null} size={46} label={name} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-[20px] leading-[1.25]">{name}</span>
                        <span className="truncate text-[15px] text-muted">
                          {e.spec.calendar === "lunar" ? `${formatSpec(e.spec, locale)}${t("common.and")}` : ""}
                          {formatDayFull(e.date, locale)}
                        </span>
                      </span>
                      <span
                        className={`num shrink-0 rounded-full px-3 pb-1 pt-[3px] text-[16px] shadow-[inset_0_0_0_1.5px_var(--color-ink)] ${left < 0 ? "bg-[#ece7d8]" : i === firstUp ? "bg-sky" : "bg-[#ffe4a3]"}`}
                        style={left >= 0 ? { transform: `rotate(${i === firstUp ? -4 : 3}deg)` } : undefined}
                      >
                        {badge}
                      </span>
                    </Link>
                  </li>
                );
              });
            })()}
            </ul>
          </div>
        ) : (
          <div className="card flex flex-col gap-1 px-5 py-5">
            <span className="text-[18px]">{t("cal.empty")}</span>
            <Link href="/request" className="flex min-h-11 items-center gap-0.5 self-start text-[17px] text-accent">
              {t("home.askDates")}
              <Icon name="chevron" size={16} strokeWidth={2.2} />
            </Link>
          </div>
        )}
        {events.length ? <Star size={22} rotate={12} color={SKY_STAR} className="-right-[5px] top-[30px]" /> : null}
      </section>

      <div className="h-6" />
      <TabBar active="home" t={t} voice={ai} />
    </>
  );
}
