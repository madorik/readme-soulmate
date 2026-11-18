import type { Locale, YMD } from "@readme/core";
import type { Person } from "@/lib/data";

// 월별 달력 데이터(lib/pages/calendar.ts가 읽고 components/pages/CalendarView가 그린다). 타입만 둔다

export interface Month {
  y: number;
  m: number;
}

export interface CalendarData {
  locale: Locale;
  today: YMD;
  /** 보이는 달(?m=2026-12, 없거나 이상하면 이번 달) */
  cur: Month;
  people: Person[];
  ai: boolean;
}
