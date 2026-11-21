import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarDays, daysOn, holidayRuns, isPublicHoliday, ymdKey } from "../index";

/** 그 해 쉬는 날(공휴일·대체공휴일)을 "월-일" 목록으로(같은 날 공휴일이 둘이면 한 번만) */
const offDays = (year: number) => [...new Set(calendarDays(year).filter((d) => d.off).map((d) => `${d.date.m}-${d.date.d}`))];

// 정부가 발표한 공휴일 목록과 견준다(대체공휴일 규칙이 맞는지 확인하는 기준)

test("2025년 공휴일: 설 연휴·삼일절 대체·어린이날+부처님오신날 겹침(하루만 대체)·추석 연휴 일요일 겹침 대체·선거일·임시공휴일", () => {
  assert.deepEqual(offDays(2025), [
    "1-1",
    "1-27", // 임시공휴일
    "1-28", "1-29", "1-30", // 설 연휴
    "3-1", "3-3", // 삼일절(토) → 월요일 대체
    "5-5", "5-6", // 어린이날 + 부처님오신날이 같은 날 → 대체공휴일 하나
    "6-3", // 대통령 선거일
    "6-6",
    "8-15",
    "10-3",
    "10-5", "10-6", "10-7", "10-8", // 추석 연휴(첫날이 일요일) → 수요일 대체
    "10-9",
    "12-25",
  ]);
});

test("2026년 공휴일: 설 연휴 5일(주말 포함), 일요일·토요일인 삼일절·부처님오신날·광복절·개천절은 월요일 대체, 현충일(토)은 대체 없음, 추석(토요일 겹침)은 대체 없음", () => {
  assert.deepEqual(offDays(2026), [
    "1-1",
    "2-16", "2-17", "2-18",
    "3-1", "3-2",
    "5-5",
    "5-24", "5-25",
    "6-3", // 지방선거일
    "6-6",
    "8-15", "8-17",
    "9-24", "9-25", "9-26",
    "10-3", "10-5",
    "10-9",
    "12-25",
  ]);
});

test("2027년 공휴일: 설날이 일요일(2/7, 한국 시간 기준 음력 1월 1일)이라 연휴 다음 화요일 대체, 광복절·개천절(일)·한글날(토)·성탄절(토) 대체", () => {
  assert.deepEqual(offDays(2027), [
    "1-1",
    "2-6", "2-7", "2-8", "2-9",
    "3-1",
    "5-5",
    "5-13",
    "6-6",
    "8-15", "8-16",
    "9-14", "9-15", "9-16",
    "10-3", "10-4",
    "10-9", "10-11",
    "12-25", "12-27",
  ]);
});

test("날짜로 찾기: 이름과 쉬는 날 여부, 챙기는 날(쉬지 않는다)", () => {
  const xmas = daysOn({ y: 2026, m: 12, d: 25 });
  assert.equal(xmas[0]!.id, "christmas");
  assert.equal(xmas[0]!.off, true);
  assert.equal(xmas[0]!.short.ko, "성탄절");
  assert.equal(isPublicHoliday({ y: 2026, m: 12, d: 25 }), true);
  // 크리스마스 이브·어버이날은 챙기는 날일 뿐 쉬는 날이 아니다
  assert.deepEqual(daysOn({ y: 2026, m: 12, d: 24 }).map((d) => [d.id, d.off, d.kind]), [["christmasEve", false, "observance"]]);
  assert.equal(isPublicHoliday({ y: 2026, m: 5, d: 8 }), false);
  assert.equal(daysOn({ y: 2026, m: 5, d: 8 })[0]!.name.ko, "어버이날");
  // 대체공휴일은 어느 공휴일의 것인지 이름에 남는다
  const sub = daysOn({ y: 2026, m: 8, d: 17 })[0]!;
  assert.equal(sub.kind, "substitute");
  assert.equal(sub.name.ko, "대체공휴일(광복절)");
  assert.equal(sub.name.en, "Substitute holiday (Liberation Day)");
  // 그냥 평일
  assert.deepEqual(daysOn({ y: 2026, m: 11, d: 20 }), []);
});

test("연휴: 쉬는 날이 사흘 이상 이어지고 공휴일이 있는 덩이(앞뒤 주말까지), 이름은 설날·추석 우선", () => {
  const fmt = (r: { start: { y: number; m: number; d: number }; end: { y: number; m: number; d: number }; days: number; title: { ko: string } }) => `${ymdKey(r.start)}~${ymdKey(r.end)} ${r.days}일 ${r.title.ko}`;
  // 2026 추석: 목·금·토 + 일요일 = 4일, 설날: 토(14) ~ 수(18) = 5일
  assert.deepEqual(holidayRuns({ y: 2026, m: 9, d: 1 }, { y: 2026, m: 9, d: 30 }).map(fmt), ["2026-09-24~2026-09-27 4일 추석 연휴"]);
  // 2월 28일(토)부터 삼일절 대체(월)까지의 연휴도 2월에 걸쳐 있다
  assert.deepEqual(holidayRuns({ y: 2026, m: 2, d: 1 }, { y: 2026, m: 2, d: 28 }).map(fmt), ["2026-02-14~2026-02-18 5일 설날 연휴", "2026-02-28~2026-03-02 3일 삼일절 연휴"]);
  // 2025 추석 + 개천절 + 한글날이 이어져 7일(10/3~10/9)
  assert.deepEqual(holidayRuns({ y: 2025, m: 10, d: 1 }, { y: 2025, m: 10, d: 31 }).map(fmt), ["2025-10-03~2025-10-09 7일 추석 연휴"]);
  // 월을 넘어 걸친 연휴는 어느 쪽 달에서 봐도 한 덩이: 2026 어린이날(화)은 앞뒤가 평일이라 연휴가 아니다
  assert.deepEqual(holidayRuns({ y: 2026, m: 5, d: 1 }, { y: 2026, m: 5, d: 31 }).map(fmt), ["2026-05-23~2026-05-25 3일 부처님오신날 연휴"]);
  // 크리스마스(금) + 주말 = 3일
  assert.deepEqual(holidayRuns({ y: 2026, m: 12, d: 1 }, { y: 2026, m: 12, d: 31 }).map(fmt), ["2026-12-25~2026-12-27 3일 크리스마스 연휴"]);
  // 공휴일 없이 주말뿐이면(2026-11) 연휴가 아니다
  assert.deepEqual(holidayRuns({ y: 2026, m: 11, d: 1 }, { y: 2026, m: 11, d: 30 }), []);
});

test("음력을 못 구하는 해(2051~)에도 양력 공휴일은 나온다", () => {
  const ids = calendarDays(2060).filter((d) => d.off).map((d) => d.id);
  assert.ok(ids.includes("newYear") && ids.includes("christmas"));
  assert.ok(!ids.includes("seollal") && !ids.includes("chuseok"));
});
