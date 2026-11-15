import { ageLine, formatDayFull, formatSpec, monthName, nextOccurrence, weekdayLong, yearsAt, type DatesData, type Locale, type YMD } from "@readme/core";
import type { T } from "@/lib/i18n";

/** 한 장 뜯어 쓰는 작은 달력: 위 띠에 달, 아래 큰 날. 한 달 안이면 띠가 망고 */
function CalendarLeaf({ m, d, soon, locale }: { m: number; d: number; soon: boolean; locale: Locale }) {
  return (
    <span aria-hidden="true" className="flex h-[58px] w-[54px] shrink-0 flex-col overflow-hidden rounded-[13px] bg-paper shadow-[0_0_0_1.5px_var(--color-edge)]">
      <span className={`relative flex h-[19px] items-center justify-center text-[10.5px] font-bold ${soon ? "bg-sky text-ink" : "bg-fill text-ink-2"}`}>
        {/* 고리 두 개 */}
        <span className="absolute -top-[3px] left-[12px] h-[7px] w-[3px] rounded-full bg-ink" />
        <span className="absolute -top-[3px] right-[12px] h-[7px] w-[3px] rounded-full bg-ink" />
        {monthName(m, locale)}
      </span>
      <span className="num flex flex-1 items-center justify-center text-[25px] font-semibold tracking-[-0.03em]">{d}</span>
    </span>
  );
}

/** 생일·기념일: 날마다 한 칸(작은 달력 + 이름 + D-day 배지 + 요일·음력 + 나이·주년) */
export function DateTiles({ dates, today, locale, t, className = "mx-6 mt-6" }: { dates: DatesData | undefined; today: YMD; locale: Locale; t: T; className?: string }) {
  const items = [
    ...(dates?.birthday ? [{ label: t("dates.birthday"), spec: dates.birthday, birth: true }] : []),
    ...(dates?.anniversaries ?? []).map((a) => ({ label: a.label, spec: a.spec, birth: false })),
  ].slice(0, 4);
  if (!items.length) return null;
  return (
    <ul className={`${className} flex flex-col gap-2 pb-1`}>
      {items.map((item, i) => {
        const next = nextOccurrence(item.spec, today);
        const soon = !!next && next.daysUntil <= 30;
        const when = next
          ? [item.spec.calendar === "lunar" ? formatSpec(item.spec, locale) : null, weekdayLong(next.date, locale)].filter(Boolean).join(" · ")
          : formatSpec(item.spec, locale);
        const years = !item.spec.year
          ? null
          : item.birth
            ? ageLine(item.spec, today, locale)
            : (() => {
                const n = next ? yearsAt(item.spec, next.date) : null;
                return n != null && n > 0 ? `${item.spec.year} · ${t("dates.years", { n })}` : String(item.spec.year);
              })();
        return (
          <li key={i} className="flex items-center gap-3.5 rounded-2xl bg-fill py-2.5 pl-2.5 pr-3.5">
            <CalendarLeaf m={next ? next.date.m : item.spec.month} d={next ? next.date.d : item.spec.day} soon={soon} locale={locale} />
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold tracking-[-0.02em]">{item.label}</span>
                {next ? (
                  <span className={`num shrink-0 rounded-full px-2.5 py-[5px] text-[12px] font-bold ${soon ? "grad" : "bg-paper text-muted"}`}>
                    {next.daysUntil === 0 ? t("start.today") : `D-${next.daysUntil}`}
                  </span>
                ) : null}
              </div>
              {next ? <span className="sr-only">{formatDayFull(next.date, locale)}</span> : null}
              <span className="truncate text-[13px] font-medium text-ink-2">{when}</span>
              {years ? <span className="truncate text-[12.5px] text-muted">{years}</span> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
