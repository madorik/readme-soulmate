import { ageLine, formatDotted, formatSpec, nextOccurrence, weekdayLong, yearsAt, type DatesData, type Locale, type YMD } from "@readme/core";
import type { T } from "@/lib/i18n";

/** 생일·기념일 칸: 달력 숫자 + 남은 날 */
export function DateTiles({ dates, today, locale, t }: { dates: DatesData | undefined; today: YMD; locale: Locale; t: T }) {
  const items = [
    ...(dates?.birthday ? [{ label: t("dates.birthday"), spec: dates.birthday, birth: true }] : []),
    ...(dates?.anniversaries ?? []).map((a) => ({ label: a.label, spec: a.spec, birth: false })),
  ].slice(0, 4);
  if (!items.length) return null;
  return (
    <div className="mx-6 mt-6 grid grid-cols-2 border-y border-rule">
      {items.map((item, i) => {
        const next = nextOccurrence(item.spec, today);
        const left = i % 2 === 0;
        return (
          <div key={i} className={`flex flex-col gap-1 py-3.5 ${left ? "border-r border-rule pr-3" : "pl-[18px]"} ${i >= 2 ? "border-t border-rule" : ""}`}>
            <span className="truncate text-[12.5px] font-medium text-muted">{item.label}</span>
            <span className="num text-[40px] font-light">{next ? formatDotted(next.date) : formatDotted({ m: item.spec.month, d: item.spec.day })}</span>
            <span className="text-[12.5px] font-medium">
              {next ? (
                <>
                  <span className={next.daysUntil <= 30 ? "text-red" : "text-muted"}>{next.daysUntil === 0 ? t("start.today") : t("person.daysLeft", { n: next.daysUntil })}</span>
                  <span className="text-muted">
                    {t("common.and")}
                    {item.spec.calendar === "lunar" ? formatSpec(item.spec, locale) : weekdayLong(next.date, locale)}
                  </span>
                </>
              ) : (
                formatSpec(item.spec, locale)
              )}
            </span>
            {item.spec.year ? (
              <span className="text-[12px] text-muted">
                {item.birth
                  ? ageLine(item.spec, today, locale)
                  : (() => {
                      const n = next ? yearsAt(item.spec, next.date) : null;
                      return n != null && n > 0 ? `${item.spec.year} · ${t("dates.years", { n })}` : String(item.spec.year);
                    })()}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
