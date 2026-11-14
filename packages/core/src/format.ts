import { weekday, type DateSpec, type YMD } from "./calendar";
import type { Locale } from "./locale";

const WEEKDAY_SHORT: Record<Locale, string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const WEEKDAY_LONG: Record<Locale, string[]> = {
  ko: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_EN_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function weekdayShort(v: YMD, locale: Locale): string {
  return WEEKDAY_SHORT[locale][weekday(v)]!;
}

export function weekdayLong(v: YMD, locale: Locale): string {
  return WEEKDAY_LONG[locale][weekday(v)]!;
}

export function weekdayNames(locale: Locale): string[] {
  return WEEKDAY_SHORT[locale];
}

export function monthName(m: number, locale: Locale, long = false): string {
  if (locale === "ko") return `${m}월`;
  return (long ? MONTH_EN_LONG : MONTH_EN)[m - 1] ?? String(m);
}

/** 11월 20일 / Nov 20 */
export function formatMonthDay(v: { m: number; d: number }, locale: Locale): string {
  return locale === "ko" ? `${v.m}월 ${v.d}일` : `${MONTH_EN[v.m - 1]} ${v.d}`;
}

/** 달력 숫자처럼: 11.20 (두 언어 같음) */
export function formatDotted(v: { m: number; d: number }): string {
  return `${v.m}.${v.d}`;
}

/** 11월 20일 금요일 / Friday, Nov 20 */
export function formatDayFull(v: YMD, locale: Locale): string {
  return locale === "ko" ? `${v.m}월 ${v.d}일 ${weekdayLong(v, locale)}` : `${weekdayLong(v, locale)}, ${MONTH_EN[v.m - 1]} ${v.d}`;
}

/** 2027년 11월 9일 화요일 / Tuesday, Nov 9, 2027 */
export function formatDateLong(v: YMD, locale: Locale): string {
  return locale === "ko" ? `${v.y}년 ${formatDayFull(v, locale)}` : `${formatDayFull(v, locale)}, ${v.y}`;
}

/** 음력 10월 12일 / Lunar 10/12, 양력은 10월 12일 / Oct 12 */
export function formatSpec(spec: DateSpec, locale: Locale): string {
  if (spec.calendar === "solar") return formatMonthDay({ m: spec.month, d: spec.day }, locale);
  if (locale === "ko") return `음력 ${spec.leap ? "윤" : ""}${spec.month}월 ${spec.day}일`;
  return `Lunar ${spec.leap ? "leap " : ""}${spec.month}/${spec.day}`;
}

/** 연도까지: "1990년 11월 20일", "음력 1956년 10월 13일" / "Nov 20, 1990", "Lunar 1956/10/13". 연도를 모르면 formatSpec과 같다 */
export function formatSpecFull(spec: DateSpec, locale: Locale): string {
  if (!spec.year) return formatSpec(spec, locale);
  if (locale === "ko") return `${spec.calendar === "lunar" ? `음력 ${spec.leap ? "윤" : ""}` : ""}${spec.year}년 ${spec.month}월 ${spec.day}일`;
  if (spec.calendar === "lunar") return `Lunar ${spec.leap ? "leap " : ""}${spec.year}/${spec.month}/${spec.day}`;
  return `${formatMonthDay({ m: spec.month, d: spec.day }, locale)}, ${spec.year}`;
}

/** 오늘 / 7일 남음, Today / In 7 days */
export function formatDaysLeft(n: number, locale: Locale): string {
  if (locale === "ko") return n === 0 ? "오늘" : n === 1 ? "내일" : `${n}일 남음`;
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
}
