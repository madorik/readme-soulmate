import { nextOccurrence, solarToLunar, type DateSpec, type YMD } from "./calendar";
import { translate } from "./i18n";
import type { Label, Locale } from "./locale";

// 연도를 아는 날짜(생년월일·시작한 해)로 계산하는 것들: 만 나이, 띠, 환갑 같은 큰 생일, 기념일 N주년.
// 음력 날짜의 연도는 음력 연도다.

/** on(그 날짜가 돌아오는 날)에 몇 번째인지: 생일이면 그날 되는 만 나이, 기념일이면 N주년. 연도를 모르면 null */
export function yearsAt(spec: DateSpec, on: YMD): number | null {
  if (!spec.year) return null;
  if (spec.calendar === "solar") return on.y - spec.year;
  const lunar = solarToLunar(on);
  return lunar ? lunar.y - spec.year : null;
}

/** 오늘 기준 만 나이(생일이 오늘이면 오늘 바뀐 나이). 연도를 모르거나 아직 안 태어났으면 null */
export function ageOn(spec: DateSpec, today: YMD): number | null {
  const next = nextOccurrence(spec, today);
  if (!next) return null;
  const turning = yearsAt(spec, next.date);
  if (turning == null) return null;
  const age = next.daysUntil === 0 ? turning : turning - 1;
  return age >= 0 ? age : null;
}

const ZODIAC: Label[] = [
  { ko: "쥐", en: "Rat" },
  { ko: "소", en: "Ox" },
  { ko: "호랑이", en: "Tiger" },
  { ko: "토끼", en: "Rabbit" },
  { ko: "용", en: "Dragon" },
  { ko: "뱀", en: "Snake" },
  { ko: "말", en: "Horse" },
  { ko: "양", en: "Goat" },
  { ko: "원숭이", en: "Monkey" },
  { ko: "닭", en: "Rooster" },
  { ko: "개", en: "Dog" },
  { ko: "돼지", en: "Pig" },
];

/** 띠(음력 설 기준). 양력 생일은 그 날의 음력 연도로 본다. 연도를 모르면 null */
export function zodiacOf(spec: DateSpec): Label | null {
  if (!spec.year) return null;
  let year = spec.year;
  if (spec.calendar === "solar") {
    const lunar = solarToLunar({ y: spec.year, m: spec.month, d: spec.day });
    if (lunar) year = lunar.y;
  }
  return ZODIAC[(((year - 4) % 12) + 12) % 12] ?? null;
}

/** 큰 생일(만 나이 기준): 돌, 환갑, 칠순, 팔순, 구순, 백수 */
const MILESTONES: Record<number, Label> = {
  1: { ko: "돌", en: "1st birthday" },
  60: { ko: "환갑", en: "60th birthday" },
  70: { ko: "칠순", en: "70th birthday" },
  80: { ko: "팔순", en: "80th birthday" },
  90: { ko: "구순", en: "90th birthday" },
  100: { ko: "백수", en: "100th birthday" },
};

export function milestoneOf(turning: number | null): Label | null {
  return turning == null ? null : (MILESTONES[turning] ?? null);
}

/** "만 34세 · 용띠" / "34 · Year of the Dragon". 연도를 모르면 "" */
export function ageLine(spec: DateSpec, today: YMD, locale: Locale): string {
  const age = ageOn(spec, today);
  const zodiac = zodiacOf(spec);
  const parts: string[] = [];
  if (age != null) parts.push(translate(locale, "dates.age", { n: age }));
  if (zodiac) parts.push(translate(locale, "dates.zodiac", { animal: zodiac[locale] }));
  return parts.join(" · ");
}

export interface TitledEvent {
  kind: "birthday" | "anniversary";
  name: string;
  label?: string | null;
  spec: DateSpec;
  date: YMD;
}

/** 다가오는 날 이름: "엄마 생일", 큰 생일이면 "엄마 칠순", 연도를 아는 기념일은 "지수 결혼기념일 10주년" */
export function eventTitle(locale: Locale, e: TitledEvent): string {
  const n = yearsAt(e.spec, e.date);
  if (e.kind === "birthday") {
    const milestone = milestoneOf(n);
    return milestone ? translate(locale, "home.event.milestone", { name: e.name, milestone: milestone[locale] }) : translate(locale, "home.event.birthday", { name: e.name });
  }
  const base = translate(locale, "home.event.anniversary", { name: e.name, label: e.label ?? "" });
  return n != null && n > 0 ? translate(locale, "home.event.years", { event: base, n }) : base;
}
