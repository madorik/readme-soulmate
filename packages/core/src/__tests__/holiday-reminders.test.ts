import assert from "node:assert/strict";
import { test } from "node:test";
import { dueHolidays, holidayNoticeTitle, holidayReminders, ymdKey } from "../index";

const due = (y: number, m: number, d: number, offsets: (14 | 7 | 3 | 0)[] = [7, 0]) => dueHolidays({ y, m, d }, offsets).map((x) => `${x.holiday.id} ${x.offset} ${ymdKey(x.holiday.date)}`);

test("명절·챙기는 날 알림: 남은 날이 알림 시점과 같은 날에만(7일 전·당일)", () => {
  // 크리스마스(12/25)는 12/18에 7일 전, 12/25에 당일
  assert.deepEqual(due(2026, 12, 18), ["christmas 7 2026-12-25"]);
  assert.deepEqual(due(2026, 12, 25), ["christmas 0 2026-12-25"]);
  // 그 사이엔 없다
  assert.deepEqual(due(2026, 12, 20), []);
  // 설날은 음력이라 해마다 양력 날짜가 다르다(2027 설날은 2/7)
  assert.deepEqual(due(2027, 1, 31), ["seollal 7 2027-02-07"]);
  // 알림 시점을 바꾸면(14일·3일 전) 그대로 따른다
  assert.deepEqual(due(2026, 12, 11, [14]), ["christmas 14 2026-12-25"]);
  assert.deepEqual(due(2026, 12, 22, [3]), ["christmas 3 2026-12-25"]);
});

test("명절·챙기는 날 알림: 어제 크론이 못 돌았으면 어제 알렸어야 할 것도 오늘 보낸다(지난 날은 빼고, 하루만)", () => {
  // 12/18이 7일 전인데 12/19에 돌았다: 만회(남은 날은 6일이지만 시점은 7)
  assert.deepEqual(due(2026, 12, 19), ["christmas 7 2026-12-25"]);
  // 이틀 지나면 더는 안 보낸다
  assert.deepEqual(due(2026, 12, 20), []);
  // 당일 알림을 다음 날 만회하지 않는다(이미 지난 날)
  assert.deepEqual(due(2026, 12, 26), []);
});

test("한 날에 둘이 겹쳐도(어버이날 5/8, 스승의 날 5/15 일주일 간격) 각자 따로 나온다", () => {
  assert.deepEqual(due(2026, 5, 1), ["parentsDay 7 2026-05-08"]);
  assert.deepEqual(due(2026, 5, 8), ["parentsDay 0 2026-05-08", "teachersDay 7 2026-05-15"]);
});

test("알림 제목: 당일은 '오늘은 …이에요', 아니면 '…까지 n일 남았어요'(한·영, 받침에 맞는 조사)", () => {
  assert.equal(holidayNoticeTitle("ko", "seollal", 0), "오늘은 설날이에요");
  assert.equal(holidayNoticeTitle("ko", "christmas", 0), "오늘은 크리스마스예요");
  assert.equal(holidayNoticeTitle("ko", "chuseok", 7), "추석까지 7일 남았어요");
  assert.equal(holidayNoticeTitle("en", "christmas", 0), "Christmas is today");
  assert.equal(holidayNoticeTitle("en", "valentine", 3), "3 days until Valentine's Day");
});

test("기기에 예약할 알림: 앞으로의 날마다 알림 시점별로, 알릴 날은 그 날의 n일 전", () => {
  const list = holidayReminders({ y: 2026, m: 11, d: 21 }, [7, 0], "ko", 30);
  // 30+14일 안: 크리스마스(12/25)만(그 앞에 11/21 이후 챙기는 날은 없다)
  const xmas = list.filter((r) => r.id === "christmas");
  assert.deepEqual(xmas.map((r) => [r.offset, ymdKey(r.day), r.title]), [
    [7, "2026-12-18", "크리스마스까지 7일 남았어요"],
    [0, "2026-12-25", "오늘은 크리스마스예요"],
  ]);
  assert.equal(new Set(list.map((r) => r.key)).size, list.length, "이름표는 겹치지 않는다");
});
