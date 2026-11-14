import { addDays, sameYmd, solarToLunar, weekday, weekdayNames, type Locale, type YMD } from "@readme/core";
import { MarkerCircle } from "./marks";

/** 한국식 벽걸이 달력처럼: 일요일 빨강, 토요일 파랑, 날짜 아래 작은 음력 */
export function CalendarWeeks({
  start,
  weeks,
  today,
  circled,
  locale,
}: {
  /** 첫 줄의 일요일 */
  start: YMD;
  weeks: number;
  today?: YMD;
  circled?: { date: YMD; label?: string } | null;
  locale: Locale;
}) {
  const names = weekdayNames(locale);
  const rows = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <div>
      <div className="grid grid-cols-7 pb-2 text-center text-[11.5px] font-medium">
        {names.map((n, i) => (
          <span key={n} className={i === 0 ? "text-red" : i === 6 ? "text-sat" : "text-muted"}>
            {n}
          </span>
        ))}
      </div>
      {rows.map((row, r) => (
        <div key={r} className={`grid grid-cols-7 border-t border-rule text-center ${r === rows.length - 1 ? "border-b" : ""}`}>
          {row.map((day) => {
            const wd = weekday(day);
            const isToday = today && sameYmd(day, today);
            const isCircled = circled && sameYmd(day, circled.date);
            const lunar = solarToLunar(day);
            const color = isCircled ? "text-accent" : wd === 0 ? "text-red" : wd === 6 ? "text-sat" : "";
            return (
              <div key={`${day.m}-${day.d}`} className="flex flex-col items-center gap-1.5 pb-3 pt-2.5">
                <span className={`num relative text-[26px] ${isToday ? "font-bold" : "font-light"} ${color}`}>
                  {day.d}
                  {isCircled ? <MarkerCircle pad={[12, 8]} width={1.9} /> : null}
                </span>
                <span className={`text-[10.5px] ${isCircled ? "font-bold text-accent" : isToday ? "font-bold" : "text-muted"}`}>
                  {isToday ? (locale === "ko" ? "오늘" : "Today") : lunar ? `${lunar.leap ? "윤" : ""}${lunar.m}.${lunar.d}` : ""}
                </span>
                {isCircled && circled.label ? <span className="whitespace-nowrap text-[11px] font-bold text-accent">{circled.label}</span> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** 그 날이 들어 있는 주의 일요일 */
export function sundayOf(day: YMD): YMD {
  return addDays(day, -weekday(day));
}
