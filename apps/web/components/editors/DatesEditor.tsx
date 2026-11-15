"use client";

import {
  REMINDER_OFFSETS,
  SPEC_YEAR_MIN,
  yearsAt,
  zodiacOf,
  addDays,
  daysInMonth,
  formatDateLong,
  formatDayFull,
  occurrences,
  solarToLunar,
  todayIn,
  weekday,
  weekdayNames,
  diffDays,
  type DateSpec,
  type DatesData,
  type Locale,
  type ReminderOffset,
  type YMD,
} from "@readme/core";
import { useMemo, useState } from "react";
import { Icon, MarkerCircle } from "../marks";
import { CircleOption, SectionHeading, useT } from "./shared";

const DEFAULT_SPEC: DateSpec = { calendar: "solar", month: 1, day: 1 };

function useToday(): YMD {
  // 시간대는 기기 기준(서버와 하루 차이 날 수 있는 자정 근처도 사용자가 보는 날짜로 맞춘다)
  return useMemo(() => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul"), []);
}

/**
 * 양력/음력 + (연도) + 월·일 + 윤달. 음력이면 올해·내년 양력 날짜를 바로 보여 준다.
 * year를 주면 연도 칸(몰라도 됨)을 보여 준다: birth = 태어난 해(만 나이·띠), since = 시작한 해(N주년)
 */
export function DateSpecPicker({
  value,
  onChange,
  locale,
  preview = true,
  large = false,
  year,
}: {
  value: DateSpec | null;
  onChange: (v: DateSpec) => void;
  locale: Locale;
  preview?: boolean;
  large?: boolean;
  year?: "birth" | "since";
}) {
  const t = useT(locale);
  const spec = value ?? DEFAULT_SPEC;
  const today = useToday();
  const capOf = (s: DateSpec) => (s.calendar === "lunar" ? 30 : daysInMonth(s.year ?? 2024, s.month));
  const maxDay = capOf(spec);
  const set = (patch: Partial<DateSpec>) => {
    const next = { ...spec, ...patch };
    if (next.year === undefined) delete next.year;
    const cap = capOf(next);
    if (next.day > cap) next.day = cap;
    if (next.calendar === "solar") delete next.leap;
    onChange(next);
  };
  const yearLabel = year === "birth" ? t("dates.birthYear") : year === "since" ? t("dates.sinceYear") : "";
  const years = Array.from({ length: today.y - SPEC_YEAR_MIN + 1 }, (_, i) => today.y - i);
  const list = value ? occurrences(spec, today, 3) : [];
  const first = list[0];
  const left = first ? diffDays(today, first) : null;
  const leftText = left == null ? "" : left === 0 ? (locale === "ko" ? "오늘이에요" : "today") : locale === "ko" ? `${left}일 남았어요` : `in ${left} days`;
  const selectClass = `num w-full appearance-none bg-transparent text-center outline-none ${large ? "h-[72px] text-[56px]" : "h-[70px] text-[60px]"}`;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={`${t("dates.solar")} / ${t("dates.lunar")}`} className="flex gap-7">
        {(["solar", "lunar"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={spec.calendar === c && !!value}
            onClick={() => set({ calendar: c })}
            className={`relative flex min-h-11 items-center px-1 text-[22px] font-bold ${spec.calendar === c && value ? "text-accent" : "text-muted"}`}
          >
            <span className="relative">
              {t(c === "solar" ? "dates.solar" : "dates.lunar")}
              {spec.calendar === c && value ? <MarkerCircle pad={[12, 9]} width={2.6} /> : null}
            </span>
          </button>
        ))}
      </div>

      {yearLabel ? (
        <label className="flex items-center gap-3">
          <span className="w-[84px] shrink-0 text-[14px] font-bold">{yearLabel}</span>
          <span className="w-[120px] border-b border-ink">
            <select
              aria-label={yearLabel}
              value={value?.year ?? ""}
              onChange={(e) => set({ year: e.target.value ? Number(e.target.value) : undefined })}
              className="num h-12 w-full appearance-none bg-transparent text-center text-[26px] font-light outline-none"
            >
              <option value="">{t("dates.yearUnknown")}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </span>
          {locale === "ko" ? <span className="text-[16px] font-medium">년</span> : null}
          <span className="ml-auto text-[12.5px] text-muted">{t("dates.yearOptional")}</span>
        </label>
      ) : null}

      <div className="flex items-end gap-1.5">
        <label className="flex items-end gap-1.5">
          <span className="w-[86px] border-b-2 border-ink">
            <select aria-label={t("dates.month")} value={value ? spec.month : ""} onChange={(e) => set({ month: Number(e.target.value) })} className={selectClass}>
              {!value ? <option value="">–</option> : null}
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </span>
          <span className="pb-2 text-[20px] font-bold">{locale === "ko" ? "월" : "/"}</span>
        </label>
        <label className="ml-2.5 flex items-end gap-1.5">
          <span className="w-[86px] border-b-2 border-ink">
            <select aria-label={t("dates.day")} value={value ? spec.day : ""} onChange={(e) => set({ day: Number(e.target.value) })} className={selectClass}>
              {!value ? <option value="">–</option> : null}
              {Array.from({ length: maxDay }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </span>
          {locale === "ko" ? <span className="pb-2 text-[20px] font-bold">일</span> : null}
        </label>
        {spec.calendar === "lunar" && value ? (
          <label className="ml-auto flex min-h-11 items-center gap-2 text-[14px] font-bold">
            <input type="checkbox" checked={!!spec.leap} onChange={(e) => set({ leap: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
            {t("dates.leap")}
          </label>
        ) : null}
      </div>
      {spec.leap ? <p className="text-[12.5px] leading-[1.5] text-muted">{t("dates.leapNote", { m: spec.month, d: spec.day })}</p> : null}

      {preview && value && first ? (
        <div className="flex flex-col">
          {spec.calendar === "lunar" ? <WeekOf day={first} locale={locale} /> : null}
          <p className="mb-1.5 mt-3.5 text-[17px] font-bold leading-[1.45] tracking-[-0.02em]">
            {spec.calendar === "lunar"
              ? t("dates.thisYearLunar", { date: formatDayFull(first, locale), left: leftText })
              : t("dates.nextSolar", { date: formatDateLong(first, locale), left: leftText })}
          </p>
          {yearLabel && spec.year ? (
            <p className="-mt-0.5 mb-1.5 text-[13.5px] text-muted">
              {[
                (() => {
                  const n = yearsAt(spec, first);
                  return n != null && n > 0 ? (year === "birth" ? t("dates.turns", { n }) : t("dates.years", { n })) : "";
                })(),
                year === "birth" && zodiacOf(spec) ? t("dates.zodiac", { animal: zodiacOf(spec)![locale] }) : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {list.slice(1).map((d) => (
            <div key={`${d.y}`} className="flex min-h-9 items-center justify-between border-t border-rule text-[14px]">
              <span className="num text-[15px] text-muted">{d.y}</span>
              <span className="font-bold">{formatDayFull(d, locale)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** 그 날이 든 한 주, 그 날에 빨간 동그라미 */
function WeekOf({ day, locale }: { day: YMD; locale: Locale }) {
  const start = addDays(day, -weekday(day));
  const names = weekdayNames(locale);
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-7 pb-1.5 text-center text-[11.5px] font-bold">
        {names.map((n, i) => (
          <span key={n} className={i === 0 ? "text-red" : i === 6 ? "text-sat" : "text-muted"}>
            {n}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 border-y border-rule text-center">
        {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d, i) => {
          const on = d.m === day.m && d.d === day.d;
          const lunar = solarToLunar(d);
          return (
            <div key={i} className="flex flex-col items-center gap-[5px] pb-2.5 pt-2">
              <span className={`num relative text-[26px] ${on ? "text-accent" : i === 0 ? "text-red" : i === 6 ? "text-sat" : ""}`}>
                {d.d}
                {on ? <MarkerCircle pad={[12, 7]} width={2.6} /> : null}
              </span>
              <span className={`text-[10px] ${on ? "font-bold text-accent" : "text-muted"}`}>{lunar ? `${lunar.m}.${lunar.d}` : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReminderPicker({ value, onChange, locale }: { value: ReminderOffset[]; onChange: (v: ReminderOffset[]) => void; locale: Locale }) {
  const t = useT(locale);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[16px] font-bold">{t("remind.when")}</span>
      <div className="flex flex-wrap gap-2 pt-1">
        {REMINDER_OFFSETS.map((o) => (
          <CircleOption
            key={o}
            label={t(`remind.${o}` as "remind.7")}
            on={value.includes(o)}
            onToggle={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : REMINDER_OFFSETS.filter((x) => x === o || value.includes(x)))}
            textClass="whitespace-nowrap"
          />
        ))}
      </div>
    </div>
  );
}

/** 생일 + 기념일(내 리드미 편집용) */
export function DatesEditor({ value, onChange, locale }: { value: DatesData; onChange: (v: DatesData) => void; locale: Locale }) {
  const t = useT(locale);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <SectionHeading>{t("dates.birthday")}</SectionHeading>
        <DateSpecPicker value={value.birthday} onChange={(birthday) => onChange({ ...value, birthday })} locale={locale} year="birth" />
      </div>
      <div className="flex flex-col gap-2">
        {/* 기념일 제목 줄 오른쪽에 추가 버튼 */}
        <div className="flex min-h-11 items-center justify-between">
          <SectionHeading>{t("dates.anniversaries")}</SectionHeading>
          {value.anniversaries.length < 10 ? (
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, anniversaries: [...value.anniversaries, { label: "", spec: { calendar: "solar", month: 1, day: 1 } }] });
                setOpen(value.anniversaries.length);
              }}
              className="pill !h-9 !px-3.5 text-[13.5px]"
            >
              <Icon name="plus" size={16} />
              {t("dates.addAnniversary")}
            </button>
          ) : null}
        </div>
        {value.anniversaries.map((a, i) => (
          <div key={i} className="flex flex-col gap-3 border-t border-rule pt-3">
            <div className="flex items-center gap-2">
              <input
                value={a.label}
                onChange={(e) => onChange({ ...value, anniversaries: value.anniversaries.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                placeholder={t("dates.anniversaryPlaceholder")}
                aria-label={t("dates.anniversaryLabel")}
                className="field"
              />
              <button type="button" aria-label={t("common.delete")} onClick={() => onChange({ ...value, anniversaries: value.anniversaries.filter((_, j) => j !== i) })} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted">
                <Icon name="close" size={20} />
              </button>
            </div>
            {open === i ? (
              <DateSpecPicker value={a.spec} onChange={(spec) => onChange({ ...value, anniversaries: value.anniversaries.map((x, j) => (j === i ? { ...x, spec } : x)) })} locale={locale} preview={false} year="since" />
            ) : (
              <button type="button" onClick={() => setOpen(i)} aria-label={`${a.spec.calendar === "lunar" ? `${t("dates.lunar")} ` : ""}${a.spec.month}.${a.spec.day} ${t("common.edit")}`} className="flex min-h-9 items-center gap-1.5 self-start text-[14px] font-bold text-muted">
                {a.spec.calendar === "lunar" ? `${t("dates.lunar")} ` : ""}
                {a.spec.month}.{a.spec.day}
                <Icon name="pencil" size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
