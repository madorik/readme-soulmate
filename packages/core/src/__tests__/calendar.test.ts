import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  diffDays,
  hasLeapMonth,
  lunarToSolar,
  nextOccurrence,
  occurrences,
  parseYmd,
  solarInYear,
  solarToLunar,
  todayIn,
  weekday,
  isValidSpec,
} from "../calendar";

const TODAY = { y: 2026, m: 11, d: 13 };

test("음력 → 양력: 한국천문연구원 자료와 같은 값", () => {
  assert.deepEqual(lunarToSolar(2026, 10, 12), { y: 2026, m: 11, d: 20 });
  assert.deepEqual(lunarToSolar(2027, 10, 12), { y: 2027, m: 11, d: 9 });
  assert.deepEqual(lunarToSolar(2028, 10, 12), { y: 2028, m: 11, d: 27 });
  assert.deepEqual(lunarToSolar(2026, 11, 3), { y: 2026, m: 12, d: 11 });
});

test("양력 → 음력", () => {
  assert.deepEqual(solarToLunar(TODAY), { y: 2026, m: 10, d: 5, leap: false });
  assert.deepEqual(solarToLunar({ y: 2026, m: 11, d: 9 }), { y: 2026, m: 10, d: 1, leap: false });
});

test("윤달: 있는 해는 윤달로, 없는 해는 평달로", () => {
  assert.equal(hasLeapMonth(2028, 5), true);
  assert.equal(hasLeapMonth(2026, 10), false);
  const leap = lunarToSolar(2028, 5, 1, true);
  const plain = lunarToSolar(2028, 5, 1, false);
  assert.ok(leap && plain);
  assert.ok(diffDays(plain!, leap!) > 0, "윤5월은 평5월 뒤에 온다");
  assert.deepEqual(lunarToSolar(2026, 10, 12, true), lunarToSolar(2026, 10, 12, false));
});

test("음력 30일: 29일까지만 있는 달은 29일로", () => {
  assert.equal(lunarToSolar(2026, 9, 30) !== null, true);
  assert.deepEqual(lunarToSolar(2026, 9, 30), lunarToSolar(2026, 9, 29));
  assert.deepEqual(lunarToSolar(2026, 10, 30), { y: 2026, m: 12, d: 8 });
});

test("범위 밖은 null", () => {
  assert.equal(lunarToSolar(2051, 1, 1), null);
  assert.equal(lunarToSolar(2026, 13, 1), null);
  assert.equal(lunarToSolar(2026, 1, 31), null);
});

test("다음 음력 생일: 시안의 어머니 생신(음력 10.12)은 2026-11-20, 7일 남음", () => {
  const n = nextOccurrence({ calendar: "lunar", month: 10, day: 12 }, TODAY);
  assert.deepEqual(n, { date: { y: 2026, m: 11, d: 20 }, daysUntil: 7 });
});

test("다음 음력 생일: 올해 날짜가 지났으면 내년", () => {
  const n = nextOccurrence({ calendar: "lunar", month: 3, day: 18 }, TODAY);
  assert.equal(n?.date.y, 2027);
});

test("음력 12월 생일은 양력 이듬해 초에 온다", () => {
  const n = nextOccurrence({ calendar: "lunar", month: 12, day: 20 }, TODAY);
  assert.ok(n);
  assert.equal(n!.date.y, 2027);
  assert.ok(n!.date.m <= 2);
});

test("양력 생일: 오늘이면 0일", () => {
  assert.deepEqual(nextOccurrence({ calendar: "solar", month: 11, day: 13 }, TODAY), { date: TODAY, daysUntil: 0 });
  assert.equal(nextOccurrence({ calendar: "solar", month: 12, day: 3 }, TODAY)?.daysUntil, 20);
  assert.deepEqual(nextOccurrence({ calendar: "solar", month: 2, day: 14 }, TODAY)?.date, { y: 2027, m: 2, d: 14 });
});

test("2월 29일생은 평년에 2월 28일", () => {
  assert.deepEqual(solarInYear({ calendar: "solar", month: 2, day: 29 }, 2027), { y: 2027, m: 2, d: 28 });
  assert.deepEqual(solarInYear({ calendar: "solar", month: 2, day: 29 }, 2028), { y: 2028, m: 2, d: 29 });
});

test("앞으로 몇 해의 날짜(생일 화면의 2027·2028년)", () => {
  const list = occurrences({ calendar: "lunar", month: 10, day: 12 }, TODAY, 3);
  assert.deepEqual(list, [
    { y: 2026, m: 11, d: 20 },
    { y: 2027, m: 11, d: 9 },
    { y: 2028, m: 11, d: 27 },
  ]);
});

test("날짜 계산 도우미", () => {
  assert.equal(weekday(TODAY), 5);
  assert.deepEqual(addDays(TODAY, 20), { y: 2026, m: 12, d: 3 });
  assert.equal(diffDays(TODAY, { y: 2027, m: 2, d: 14 }), 93);
  assert.equal(parseYmd("2026-02-30"), null);
  assert.deepEqual(parseYmd("2026-11-13"), TODAY);
});

test("시간대별 오늘", () => {
  const instant = new Date("2026-11-13T16:30:00Z");
  assert.deepEqual(todayIn("Asia/Seoul", instant), { y: 2026, m: 11, d: 14 });
  assert.deepEqual(todayIn("America/Los_Angeles", instant), { y: 2026, m: 11, d: 13 });
  assert.deepEqual(todayIn("Not/AZone", instant), { y: 2026, m: 11, d: 14 });
});

test("날짜 형식 검사", () => {
  assert.equal(isValidSpec({ calendar: "solar", month: 2, day: 29 }), true);
  assert.equal(isValidSpec({ calendar: "solar", month: 4, day: 31 }), false);
  assert.equal(isValidSpec({ calendar: "lunar", month: 4, day: 30, leap: true }), true);
  assert.equal(isValidSpec({ calendar: "lunar", month: 4, day: 31 }), false);
  assert.equal(isValidSpec({ calendar: "moon", month: 1, day: 1 }), false);
});
