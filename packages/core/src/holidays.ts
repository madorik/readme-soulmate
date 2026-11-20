import { nextOccurrence, type DateSpec, type YMD } from "./calendar";
import type { MessageKey } from "./i18n";

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

/** 가장 가까운 하나(없으면 null) */
export function nextHoliday(today: YMD, withinDays = HOLIDAY_WINDOW_DAYS): UpcomingHoliday | null {
  return upcomingHolidays(today, withinDays)[0] ?? null;
}
