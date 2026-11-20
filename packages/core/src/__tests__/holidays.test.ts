import assert from "node:assert/strict";
import { test } from "node:test";
import { en, HOLIDAY_WINDOW_DAYS, HOLIDAYS, holidayKey, ko, lunarToSolar, nextHoliday, upcomingHolidays, yearEnd, type HolidayId, type YMD } from "../index";

const ymd = (y: number, m: number, d: number): YMD => ({ y, m, d });
const summary = (today: YMD, within?: number) => upcomingHolidays(today, within).map((h) => `${h.id} ${h.date.y}-${h.date.m}-${h.date.d} D${h.daysUntil}`);

test("명절·챙기는 날 아홉 개가 모두 이름 문구(ko·en)를 가진다", () => {
  assert.equal(HOLIDAYS.length, 9);
  for (const h of HOLIDAYS) {
    const key = holidayKey(h.id);
    assert.ok(ko[key as keyof typeof ko], `ko ${key}`);
    assert.ok(en[key], `en ${key}`);
  }
  assert.equal(en[holidayKey("seollal")], "Seollal (Lunar New Year)");
  assert.equal(en[holidayKey("parentsDay")], "Parents' Day");
});

test("해마다 오는 날: 양력 날은 그대로, 설날·추석은 음력 당일(연휴 첫날이 아니다)", () => {
  // 2026년 설날 직후부터 한 해 동안 찾는다
  const from = ymd(2026, 2, 18);
  const dateOf = (id: HolidayId) => upcomingHolidays(from, 400).find((h) => h.id === id)!.date;
  assert.deepEqual(dateOf("seollal"), ymd(2027, 2, 7)); // 음력 2027년 1월 1일
  assert.deepEqual(dateOf("seollal"), lunarToSolar(2027, 1, 1));
  assert.deepEqual(dateOf("chuseok"), ymd(2026, 9, 25)); // 음력 8월 15일
  assert.deepEqual(dateOf("chuseok"), lunarToSolar(2026, 8, 15));
  assert.deepEqual(dateOf("christmas"), ymd(2026, 12, 25));
  assert.deepEqual(dateOf("childrensDay"), ymd(2026, 5, 5));
  assert.deepEqual(dateOf("parentsDay"), ymd(2026, 5, 8));
  assert.deepEqual(dateOf("teachersDay"), ymd(2026, 5, 15));
  assert.deepEqual(dateOf("valentine"), ymd(2027, 2, 14));
  assert.deepEqual(dateOf("whiteDay"), ymd(2026, 3, 14));
  assert.deepEqual(dateOf("pepero"), ymd(2026, 11, 11));
});

test("30일 안만 본다: 크리스마스는 D-30까지, D-31은 아직 아니다", () => {
  assert.equal(HOLIDAY_WINDOW_DAYS, 30);
  assert.deepEqual(summary(ymd(2026, 11, 25)), ["christmas 2026-12-25 D30"]);
  assert.deepEqual(summary(ymd(2026, 11, 24)), []);
  assert.equal(nextHoliday(ymd(2026, 11, 24)), null);
  // 오늘(2026-11-20)은 가까운 날이 없다: 새 친구 카드
  assert.equal(nextHoliday(ymd(2026, 11, 20)), null);
  assert.equal(nextHoliday(ymd(2026, 11, 25))?.id, "christmas");
});

test("당일(D-day 0)은 오늘로 잡히고, 하루 지나면 다음 날로 넘어간다", () => {
  const xmas = nextHoliday(ymd(2026, 12, 25));
  assert.equal(xmas?.id, "christmas");
  assert.equal(xmas?.daysUntil, 0);
  assert.deepEqual(xmas?.date, ymd(2026, 12, 25));
  // 음력 당일: 2027-02-07이 설날
  assert.equal(nextHoliday(ymd(2027, 2, 7))?.daysUntil, 0);
  assert.equal(nextHoliday(ymd(2027, 2, 7))?.id, "seollal");
  assert.equal(nextHoliday(ymd(2027, 2, 6))?.daysUntil, 1);
  // 설날이 지난 다음 날: 설날은 다음 해로 넘어가고 발렌타인데이가 7일 남았다
  assert.deepEqual(summary(ymd(2027, 2, 8)), ["valentine 2027-2-14 D6"]);
});

test("연말·연초를 넘어간다: 12월 말에 다음 해 설날, 지난 크리스마스는 다음 해로", () => {
  // 크리스마스 다음 날엔 가까운 날이 없고(설날은 42일 뒤), 1월 10일이면 설날이 28일 남았다
  assert.deepEqual(summary(ymd(2026, 12, 26)), []);
  assert.deepEqual(summary(ymd(2027, 1, 10)), ["seollal 2027-2-7 D28"]);
  // 설날이 1월 말인 해: 12월 30일에 다음 해 1월 설날이 28일 남았다
  assert.deepEqual(summary(ymd(2027, 12, 30)), ["seollal 2028-1-27 D28"]);
  // 12월 20일엔 크리스마스 D-5, 설날(다음 해)은 범위 밖
  assert.deepEqual(summary(ymd(2026, 12, 20)), ["christmas 2026-12-25 D5"]);
  // 범위를 넓히면 해를 넘어서도 가까운 순서
  assert.deepEqual(summary(ymd(2026, 12, 20), 60), ["christmas 2026-12-25 D5", "seollal 2027-2-7 D49", "valentine 2027-2-14 D56"]);
  // 1월 1일 막 지난 날: 지난 크리스마스는 가까운 날이 아니다
  assert.deepEqual(summary(ymd(2027, 1, 1)), []);
  assert.ok(!upcomingHolidays(ymd(2027, 1, 1), 400).some((h) => h.id === "christmas" && h.date.y === 2026));
});

test("봄·가을: 5월 앞은 어린이날부터, 추석은 한 달 전부터", () => {
  assert.deepEqual(summary(ymd(2026, 4, 10)), ["childrensDay 2026-5-5 D25", "parentsDay 2026-5-8 D28"]);
  assert.equal(nextHoliday(ymd(2026, 4, 10))?.id, "childrensDay");
  assert.equal(nextHoliday(ymd(2026, 5, 6))?.id, "parentsDay");
  assert.equal(nextHoliday(ymd(2026, 8, 26))?.id, "chuseok"); // D-30
  assert.equal(nextHoliday(ymd(2026, 8, 25)), null);
  assert.equal(nextHoliday(ymd(2026, 10, 15))?.id, "pepero"); // 빼빼로데이 D-27
});

test("같은 날 겹치면 목록 순서가 앞선 것이 먼저(2010년 설날과 발렌타인데이)", () => {
  const list = upcomingHolidays(ymd(2010, 2, 1));
  assert.deepEqual(
    list.map((h) => h.id),
    ["seollal", "valentine"],
  );
  assert.equal(list[0]!.daysUntil, 13);
  assert.equal(nextHoliday(ymd(2010, 2, 1))?.id, "seollal");
});

test("음력을 바꿀 수 없는 2050년 뒤: 음력 날은 빼고 양력 날만, 터지지 않는다", () => {
  assert.deepEqual(summary(ymd(2050, 12, 20)), ["christmas 2050-12-25 D5"]);
  const far = upcomingHolidays(ymd(2050, 12, 30), 400).map((h) => h.id);
  assert.ok(!far.includes("seollal") && !far.includes("chuseok"));
  assert.ok(far.includes("valentine"));
  assert.equal(nextHoliday(ymd(2050, 12, 30)), null);
});

test("연말: 크리스마스 45일 전(11월 10일)부터 당일까지만 크리스마스를 돌려준다", () => {
  assert.equal(yearEnd(ymd(2026, 11, 9)), null);
  assert.equal(yearEnd(ymd(2026, 11, 10))?.daysUntil, 45);
  assert.equal(yearEnd(ymd(2026, 11, 20))?.daysUntil, 35);
  assert.equal(yearEnd(ymd(2026, 12, 25))?.daysUntil, 0);
  // 크리스마스가 지나면 다음 해로 넘어가 연말이 아니다
  assert.equal(yearEnd(ymd(2026, 12, 26)), null);
  assert.equal(yearEnd(ymd(2027, 6, 1)), null);
});
