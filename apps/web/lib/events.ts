import { eventTitle, upcomingEvents, type Locale, type PersonDates, type UpcomingEvent, type YMD } from "@readme/core";
import type { T } from "./i18n";
import { displayName, type Person } from "./data";

/** 내 기록에 적힌 생일·기념일 */
export function peopleDates(people: Person[]): PersonDates[] {
  return people
    .filter((p) => p.card.dates)
    .map((p) => ({ contactId: p.contactId, name: displayName(p), birthday: p.card.dates!.birthday, anniversaries: p.card.dates!.anniversaries }));
}

export function eventsFor(people: Person[], today: YMD, horizonDays = 400): UpcomingEvent[] {
  return upcomingEvents(peopleDates(people), today, horizonDays);
}

/** "엄마 생일", 큰 생일이면 "엄마 칠순", 연도를 아는 기념일은 "지수 결혼기념일 10주년" */
export function eventName(e: UpcomingEvent, _t: T, locale: Locale): string {
  return eventTitle(locale, e);
}

export function eventSentence(e: UpcomingEvent, t: T, locale: Locale): string {
  const event = eventName(e, t, locale);
  if (e.daysUntil === 0) return t("home.today", { event });
  if (e.daysUntil === 1) return t("home.tomorrow", { event });
  return t("home.left", { event, n: e.daysUntil });
}
