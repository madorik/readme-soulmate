import { addDays, diffDays, nextOccurrence, ymdKey, type DateSpec, type YMD } from "./calendar";
import { translate, type MessageKey } from "./i18n";
import type { Locale } from "./locale";
import type { ReminderOffset } from "./reminders";

// 명절·챙기는 날(한국 기준). 홈 '다가오는 날'에 챙길 사람 기념일이 하나도 없을 때 대신 보여 준다.
// 날짜는 해마다 돌아오는 DateSpec(양력·음력)으로 적어 두고, 가까운 날은 calendar.ts의 nextOccurrence가 구한다(음력 변환 포함).

export type HolidayId = "seollal" | "chuseok" | "christmas" | "childrensDay" | "parentsDay" | "teachersDay" | "valentine" | "whiteDay" | "pepero";

/**
 * 같은 날에 겹치면 이 순서대로 앞엣것이 먼저다(2010년 설날과 발렌타인데이가 2월 14일).
 * 설날·추석은 연휴 첫날이 아니라 당일(음력 1월 1일, 8월 15일)이다.
 */
export const HOLIDAYS: readonly { id: HolidayId; spec: DateSpec }[] = [
  { id: "seollal", spec: { calendar: "lunar", month: 1, day: 1 } },
  { id: "chuseok", spec: { calendar: "lunar", month: 8, day: 15 } },
  { id: "christmas", spec: { calendar: "solar", month: 12, day: 25 } },
  { id: "childrensDay", spec: { calendar: "solar", month: 5, day: 5 } },
  { id: "parentsDay", spec: { calendar: "solar", month: 5, day: 8 } },
  { id: "teachersDay", spec: { calendar: "solar", month: 5, day: 15 } },
  { id: "valentine", spec: { calendar: "solar", month: 2, day: 14 } },
  { id: "whiteDay", spec: { calendar: "solar", month: 3, day: 14 } },
  { id: "pepero", spec: { calendar: "solar", month: 11, day: 11 } },
];

/** 이만큼(일) 안에 다가오면 홈에 보여 준다 */
export const HOLIDAY_WINDOW_DAYS = 30;

export interface UpcomingHoliday {
  id: HolidayId;
  spec: DateSpec;
  /** 양력으로 그 날 */
  date: YMD;
  /** 0이면 오늘 */
  daysUntil: number;
}

/** 이름 문구 키: holiday.christmas 등(ko·en 모두 있다) */
export function holidayKey(id: HolidayId): MessageKey {
  return `holiday.${id}`;
}

/** today부터(오늘 포함) withinDays일 안에 오는 명절·챙기는 날을 가까운 순서로. 음력이 2050년을 넘으면(변환 불가) 그 날은 뺀다 */
export function upcomingHolidays(today: YMD, withinDays = HOLIDAY_WINDOW_DAYS): UpcomingHoliday[] {
  const out: UpcomingHoliday[] = [];
  for (const h of HOLIDAYS) {
    const n = nextOccurrence(h.spec, today);
    if (n && n.daysUntil <= withinDays) out.push({ id: h.id, spec: h.spec, date: n.date, daysUntil: n.daysUntil });
  }
  // 정렬은 안정적이라 같은 날이면 HOLIDAYS의 순서가 남는다
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** 연말 분위기로 바뀌는 때: 크리스마스 45일 전(11월 10일)부터 크리스마스 당일까지 */
export const YEAR_END_WINDOW_DAYS = 45;

/** 연말(크리스마스 45일 전~당일)이면 그 크리스마스, 아니면 null */
export function yearEnd(today: YMD): UpcomingHoliday | null {
  return upcomingHolidays(today, YEAR_END_WINDOW_DAYS).find((h) => h.id === "christmas") ?? null;
}

/** 가장 가까운 하나(없으면 null) */
export function nextHoliday(today: YMD, withinDays = HOLIDAY_WINDOW_DAYS): UpcomingHoliday | null {
  return upcomingHolidays(today, withinDays)[0] ?? null;
}

// ── 명절·챙기는 날 알림 ─────────────────────────────

/** 알림 문구에 쓰는 날 이름(설날·크리스마스…) */
export function holidayName(locale: Locale, id: HolidayId): string {
  return translate(locale, holidayKey(id));
}

/** 알림 제목: 남은 날이 0이면 "오늘은 설날이에요", 아니면 "설날까지 7일 남았어요" */
export function holidayNoticeTitle(locale: Locale, id: HolidayId, left: number): string {
  const event = holidayName(locale, id);
  return left <= 0 ? translate(locale, "notif.today", { event }) : translate(locale, "notif.left", { event, n: left });
}

export interface DueHoliday {
  holiday: UpcomingHoliday;
  offset: ReminderOffset;
}

/**
 * 오늘 알릴 명절·챙기는 날: 남은 날이 알림 시점(offsets)과 같은 것 + 어제 알렸어야 하는데 못 알린 것(아직 안 지난 것, 크론이 어제 못 돌았을 때).
 * 같은 알림이 두 번 가지 않게 저장하는 쪽이 (사람·날짜·알림 시점·날 이름)으로 겹침을 막는다(notifications_holiday_once)
 */
export function dueHolidays(today: YMD, offsets: readonly ReminderOffset[], horizonDays = 15): DueHoliday[] {
  const out: DueHoliday[] = [];
  const seen = new Set<string>();
  for (const [base, catchUp] of [[today, false] as const, [addDays(today, -1), true] as const]) {
    for (const holiday of upcomingHolidays(base, horizonDays + (catchUp ? 1 : 0))) {
      const offset = offsets.find((o) => o === holiday.daysUntil);
      if (offset === undefined || (catchUp && diffDays(today, holiday.date) < 0)) continue;
      const key = `${holiday.id}|${ymdKey(holiday.date)}|${offset}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ holiday, offset });
    }
  }
  return out;
}

export interface HolidayReminder {
  /** 겹치지 않는 이름표(기기 알림 id를 만드는 데 쓴다) */
  key: string;
  id: HolidayId;
  /** 그 날 */
  date: YMD;
  /** 알릴 날(그 날의 offset일 전) */
  day: YMD;
  offset: ReminderOffset;
  title: string;
}

/** 앞으로 알릴 명절·챙기는 날 알림(앱이 기기에 예약한다): 오늘부터 horizonDays+14일 안의 날마다 알림 시점별로 */
export function holidayReminders(today: YMD, offsets: readonly ReminderOffset[], locale: Locale, horizonDays = 60): HolidayReminder[] {
  const out: HolidayReminder[] = [];
  for (const h of upcomingHolidays(today, horizonDays + 14)) {
    for (const offset of offsets) {
      out.push({ key: `holiday:${h.id}:${ymdKey(h.date)}:${offset}`, id: h.id, date: h.date, day: addDays(h.date, -offset), offset, title: holidayNoticeTitle(locale, h.id, offset) });
    }
  }
  return out;
}

