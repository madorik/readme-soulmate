import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE_MAX, captureRequest, capturePeople, cleanDate, parseCapture, type CapturePerson } from "../capture-ai";

const NOW = new Date(2026, 10, 18); // 2026-11-18

/** Responses API 응답 모양 */
const body = (items: unknown[], status = "completed") => ({ status, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ items }) }] }] });
const item = (extra: Record<string, unknown>) => ({ who: { type: "existing", contactId: "p1", name: null }, op: "add", target: "dates.birthday", text: null, codes: null, number: null, date: null, label: null, ...extra });

test("AI 날짜: 두 자리 연도는 풀고(90 → 1990, 5 → 2005), 올해보다 미래인 연도는 버린다", () => {
  assert.deepEqual(cleanDate({ calendar: "solar", month: 3, day: 1, year: 90 }, NOW), { calendar: "solar", month: 3, day: 1, year: 1990 });
  assert.deepEqual(cleanDate({ calendar: "solar", month: 3, day: 1, year: 5 }, NOW), { calendar: "solar", month: 3, day: 1, year: 2005 });
  assert.equal(cleanDate({ calendar: "solar", month: 3, day: 1, year: 26 }, NOW)?.year, 2026);
  assert.equal(cleanDate({ calendar: "solar", month: 3, day: 1, year: 27 }, NOW)?.year, 1927);
  assert.equal(cleanDate({ calendar: "solar", month: 3, day: 1, year: 1990 }, NOW)?.year, 1990);
  // 연도만 이상하면 연도만 버리고 월·일은 남긴다(0은 모른다는 뜻으로)
  for (const year of [0, -5, 190, 1850, 2027, 2099, 1990.5]) assert.deepEqual(cleanDate({ calendar: "solar", month: 3, day: 1, year }, NOW), { calendar: "solar", month: 3, day: 1 }, String(year));
  assert.deepEqual(cleanDate({ calendar: "solar", month: 3, day: 1, year: null }, NOW), { calendar: "solar", month: 3, day: 1 });
});

test("AI 날짜: 없는 날짜는 버린다(13월, 4월 31일, 0일, 숫자가 아님)", () => {
  for (const d of [
    { calendar: "solar", month: 13, day: 1 },
    { calendar: "solar", month: 0, day: 1 },
    { calendar: "solar", month: 4, day: 31 },
    { calendar: "solar", month: 2, day: 30 },
    { calendar: "solar", month: 1, day: 0 },
    { calendar: "lunar", month: 1, day: 31 },
    { calendar: "solar", month: 3.5, day: 1 },
    { calendar: "solar", month: "3", day: 1 },
    { calendar: "solar", day: 1 },
    null,
    undefined,
    "2026-03-01",
  ]) assert.equal(cleanDate(d, NOW), null, JSON.stringify(d));
  // 평년 2월 29일: 그 해는 버리고 2월 29일만 남긴다. 윤년이면 그대로
  assert.deepEqual(cleanDate({ calendar: "solar", month: 2, day: 29, year: 1997 }, NOW), { calendar: "solar", month: 2, day: 29 });
  assert.deepEqual(cleanDate({ calendar: "solar", month: 2, day: 29, year: 1996 }, NOW), { calendar: "solar", month: 2, day: 29, year: 1996 });
  // 음력은 30일까지, 모르는 달력은 양력
  assert.deepEqual(cleanDate({ calendar: "lunar", month: 12, day: 30, year: 1956 }, NOW), { calendar: "lunar", month: 12, day: 30, year: 1956 });
  assert.equal(cleanDate({ calendar: "gregorian", month: 3, day: 1 }, NOW)?.calendar, "solar");
});

test("AI 응답 풀기: 날짜는 다듬고, 글은 이모지를 반으로 가르지 않고 자르고, 모르는 칸은 메모로", () => {
  const items = parseCapture(
    body([
      item({ date: { calendar: "solar", month: 3, day: 1, year: 90 } }),
      item({ date: { calendar: "solar", month: 4, day: 31, year: null } }),
      item({ target: "dates.anniversary", label: "결".repeat(39) + "🎉🎉", date: { calendar: "solar", month: 5, day: 3, year: 16 } }),
      item({ target: "nowhere", text: "가".repeat(199) + "😀😀" }),
      { who: { type: "new", contactId: null, name: "이".repeat(39) + "😀😀" }, op: "remove", target: "taste.likes", text: "밥", codes: ["x", 3], number: null, date: null, label: null },
    ]),
    NOW,
  );
  assert.deepEqual(items[0]!.date, { calendar: "solar", month: 3, day: 1, year: 1990 });
  assert.equal(items[1]!.date, null);
  assert.equal(items[2]!.date?.year, 2016);
  assert.equal(items[2]!.label, "결".repeat(39) + "🎉");
  assert.equal(items[3]!.target, "memo");
  assert.equal(items[3]!.text, "가".repeat(199) + "😀");
  assert.equal(items[4]!.who.name, "이".repeat(39) + "😀");
  assert.equal(items[4]!.op, "remove");
  assert.deepEqual(items[4]!.codes, ["x"]);
  for (const it of items) assert.equal(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(JSON.stringify(it)), false);
});

test("AI 응답 풀기: 길이 한도에 걸려 끊긴 빈 응답은 실패로, 비어 있으면 항목 없음", () => {
  assert.throws(() => parseCapture({ status: "incomplete", output: [] }, NOW), /ai_incomplete/);
  assert.deepEqual(parseCapture({ status: "completed", output: [] }, NOW), []);
  assert.deepEqual(parseCapture(body([]), NOW), []);
  assert.equal(parseCapture(body(Array.from({ length: 20 }, () => item({}))), NOW).length, 12);
});

const person = (i: number): CapturePerson & { secret: string } => ({ id: `id${i}`, name: `이름${i}`, nickname: i % 2 ? `부름${i}` : "", secret: "민감한 값" });

test("모델에 보내는 사람 목록: 300명까지, 쓰는 사람·@로 짚은 사람이 맨 앞, id·이름·부름만", () => {
  const people = Array.from({ length: 450 }, (_, i) => person(i));
  const out = capturePeople(people, people[400]!, [people[420]!, people[10]!]);
  assert.equal(out.length, PEOPLE_MAX);
  assert.deepEqual(out.slice(0, 3).map((p) => p.id), ["id400", "id420", "id10"]);
  assert.equal(new Set(out.map((p) => p.id)).size, out.length); // 겹치지 않는다
  assert.ok(out.every((p) => Object.keys(p).sort().join() === "id,name,nickname"));
  assert.deepEqual(out.slice(3, 5).map((p) => p.id), ["id0", "id1"]); // 나머지는 원래 순서
  // 적으면 그대로
  assert.deepEqual(capturePeople(people.slice(0, 3)).map((p) => p.id), ["id0", "id1", "id2"]);
  assert.equal(capturePeople(people, null, [], 5).length, 5);
});

test("요청 몸: 사람 목록은 한도 안", () => {
  const people = Array.from({ length: 450 }, (_, i) => person(i));
  const req = captureRequest("엄마는 커피를 좋아해", people, "ko", "m", "medium", people[449]!, []);
  const peopleLine = req.input.split("\n").find((l) => l.startsWith("PEOPLE: "))!;
  const sent = JSON.parse(peopleLine.slice("PEOPLE: ".length)) as CapturePerson[];
  assert.equal(sent.length, PEOPLE_MAX);
  assert.equal(sent[0]!.id, "id449");
  assert.ok(!req.input.includes("민감한 값"));
  assert.ok(req.input.includes("ABOUT: "));
  assert.ok(req.input.endsWith("NOTE: 엄마는 커피를 좋아해"));
});
