import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ageOn,
  dueReminders,
  hasLeapMonth,
  isValidSpec,
  LUNAR_MAX_YEAR,
  lunarToSolar,
  nextOccurrence,
  occurrences,
  REMINDER_OFFSETS,
  sanitizeOffsets,
  SPEC_YEAR_MAX,
  upcomingEvents,
  type DateSpec,
} from "../index";

const TODAY = { y: 2026, m: 11, d: 13 };

test("윤달 음력 날짜: 윤달이 있는 해는 윤달에, 없는 해는 평달에 돌아온다", () => {
  const spec: DateSpec = { calendar: "lunar", month: 5, day: 1, leap: true };
  assert.equal(hasLeapMonth(2028, 5), true);
  assert.equal(hasLeapMonth(2029, 5), false);
  const list = occurrences(spec, { y: 2028, m: 1, d: 1 }, 3);
  assert.equal(list.length, 3);
  // 2028: 윤5월 1일(양력 6월 23일), 평5월 1일(5월 24일)보다 뒤
  assert.deepEqual(list[0], lunarToSolar(2028, 5, 1, true));
  assert.deepEqual(list[0], { y: 2028, m: 6, d: 23 });
  assert.notDeepEqual(list[0], lunarToSolar(2028, 5, 1, false));
  // 2029·2030: 윤5월이 없어서 평5월 1일
  assert.deepEqual(list[1], lunarToSolar(2029, 5, 1, false));
  assert.deepEqual(list[2], lunarToSolar(2030, 5, 1, false));
  // 평달로 적은 날짜는 윤달이 있는 해에도 평달
  assert.deepEqual(occurrences({ calendar: "lunar", month: 5, day: 1 }, { y: 2028, m: 1, d: 1 }, 1)[0], { y: 2028, m: 5, d: 24 });
});

test("만 나이: 2월 29일생은 평년에 2월 28일에 한 살 먹는다", () => {
  const leapling: DateSpec = { calendar: "solar", month: 2, day: 29, year: 2000 };
  assert.equal(ageOn(leapling, { y: 2027, m: 2, d: 27 }), 26);
  assert.equal(ageOn(leapling, { y: 2027, m: 2, d: 28 }), 27); // 평년은 28일이 생일
  assert.equal(ageOn(leapling, { y: 2027, m: 3, d: 1 }), 27);
  assert.equal(ageOn(leapling, { y: 2028, m: 2, d: 28 }), 27); // 윤년은 29일 전날
  assert.equal(ageOn(leapling, { y: 2028, m: 2, d: 29 }), 28);
  assert.equal(ageOn(leapling, { y: 2028, m: 3, d: 1 }), 28);
  // 태어나기 전이나 연도를 모르면 null
  assert.equal(ageOn(leapling, { y: 1999, m: 6, d: 1 }), null);
  assert.equal(ageOn({ calendar: "solar", month: 2, day: 29 }, TODAY), null);
});

test("알림: 14일 전 알림은 14일 남은 일정에만, 크론이 보는 15일 안에서", () => {
  const people = [
    { contactId: "a", name: "지수", birthday: { calendar: "solar", month: 11, day: 27 } as DateSpec }, // 14일 뒤
    { contactId: "b", name: "준호", birthday: { calendar: "solar", month: 11, day: 26 } as DateSpec }, // 13일 뒤
    { contactId: "c", name: "엄마", birthday: { calendar: "solar", month: 11, day: 28 } as DateSpec }, // 15일 뒤
  ];
  assert.ok((REMINDER_OFFSETS as readonly number[]).includes(14));
  assert.deepEqual(sanitizeOffsets([14, 7, 5]), [14, 7]);
  const events = upcomingEvents(people, TODAY, 15);
  assert.deepEqual(events.map((e) => [e.contactId, e.daysUntil]), [["b", 13], ["a", 14], ["c", 15]]);
  const due = dueReminders(events, [14]);
  assert.deepEqual(due.map((d) => [d.event.contactId, d.offset]), [["a", 14]]);
  assert.equal(dueReminders(events, [7, 0]).length, 0);
  assert.deepEqual(dueReminders(events, [14, 7, 3, 0]).map((d) => d.event.contactId), ["a"]);
  // 보는 기간이 14일보다 짧으면 14일 전 알림은 나가지 않는다
  assert.equal(dueReminders(upcomingEvents(people, TODAY, 13), [14]).length, 0);
});

test("음력 표가 끝난 뒤(2050년 이후): 돌아오는 날을 모르면 null·빈 목록이고 던지지 않는다", () => {
  assert.equal(LUNAR_MAX_YEAR, 2050);
  assert.ok(SPEC_YEAR_MAX > LUNAR_MAX_YEAR); // 저장해 둔 연도 범위는 일부러 그대로
  const lunar: DateSpec = { calendar: "lunar", month: 10, day: 12 };
  assert.deepEqual(nextOccurrence(lunar, { y: 2050, m: 1, d: 1 })?.date, { y: 2050, m: 11, d: 25 });
  assert.equal(nextOccurrence(lunar, { y: 2050, m: 12, d: 31 }), null);
  assert.equal(nextOccurrence(lunar, { y: 2060, m: 1, d: 1 }), null);
  assert.deepEqual(occurrences(lunar, { y: 2060, m: 1, d: 1 }, 3), []);
  assert.equal(lunarToSolar(2051, 1, 1), null);
  // 일정 목록·나이도 그 일정만 건너뛴다
  const events = upcomingEvents(
    [
      { contactId: "a", name: "엄마", birthday: lunar },
      { contactId: "b", name: "아빠", birthday: { calendar: "solar", month: 1, day: 5 } },
    ],
    { y: 2060, m: 1, d: 1 },
  );
  assert.deepEqual(events.map((e) => e.contactId), ["b"]);
  assert.equal(ageOn({ ...lunar, year: 1956 }, { y: 2060, m: 1, d: 1 }), null);
  // 양력은 그대로 계산된다
  assert.deepEqual(nextOccurrence({ calendar: "solar", month: 1, day: 1 }, { y: 2060, m: 1, d: 1 })?.date, { y: 2060, m: 1, d: 1 });
  // 이미 저장된 음력 날짜의 연도(2051~2100)는 읽을 때 지우지 않는다
  assert.equal(isValidSpec({ calendar: "lunar", month: 1, day: 1, year: 2100 }), true);
});
