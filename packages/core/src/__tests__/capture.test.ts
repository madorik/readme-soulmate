import assert from "node:assert/strict";
import { test } from "node:test";
import { CAPTURE_FIELDS, CAPTURE_TARGETS, captureField, describeCapture, emptySection, mergeCapture, sanitizeSection, SECTIONS, type CaptureField, type CaptureValue } from "../index";

// 합친 결과는 칸마다 모양이 달라, 시험에서는 넓게 받아 값만 본다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const merge = (f: CaptureField, current: unknown, value: CaptureValue): any => mergeCapture(f, current as never, value);

const field = (key: string) => {
  const f = captureField(key);
  assert.ok(f, key);
  return f;
};

test("말로 적기 칸: 모든 칸이 실제 항목에 있고, 메모가 마지막 갈 곳이다", () => {
  for (const f of CAPTURE_FIELDS) assert.ok((SECTIONS as readonly string[]).includes(f.section), f.key);
  assert.equal(CAPTURE_TARGETS.at(-1), "memo");
  assert.equal(new Set(CAPTURE_TARGETS).size, CAPTURE_TARGETS.length);
});

test("글 한 줄 칸은 이어 붙이고, 같은 말은 두 번 넣지 않는다", () => {
  const f = field("taste.drinks");
  const first = merge(f, null, { text: "아메리카노" })!;
  assert.equal(first.drinks, "아메리카노");
  const second = merge(f, first, { text: "바닐라라떼" })!;
  assert.equal(second.drinks, "아메리카노, 바닐라라떼");
  assert.equal(merge(f, second, { text: "바닐라라떼" }), null);
  assert.equal(merge(f, second, { text: "  " }), null);
});

test("사이즈 상의는 바꾸고, 신발은 범위 안의 수만", () => {
  const top = merge(field("sizes.top"), { ...emptySection("sizes"), top: "M" }, { text: "L" })!;
  assert.equal(top.top, "L");
  const shoe = merge(field("sizes.shoe"), null, { number: 270 })!;
  assert.equal(shoe.shoe, 270);
  assert.equal(merge(field("sizes.shoe"), null, { number: 27 }), null);
});

test("목록 칸은 없는 것만 더하고, 받고 싶은 것은 위시리스트 항목으로", () => {
  const likes = merge(field("taste.likes"), { ...emptySection("taste"), likes: ["떡볶이"] }, { text: "마라탕, 떡볶이" })!;
  assert.deepEqual(likes.likes, ["떡볶이", "마라탕"]);
  const wish = merge(field("gifts.wishlist"), null, { text: "에어팟" })!;
  assert.deepEqual(wish.wishlist, [{ title: "에어팟", url: "" }]);
});

test("고르는 칸은 목록에 있는 코드만, '없음'을 지우고 더한다", () => {
  const f = field("safety.allergens");
  const out = merge(f, { ...emptySection("safety"), allergens: ["none"] }, { codes: ["peanut", "unicorn"] })!;
  assert.deepEqual(out.allergens, ["peanut"]);
  assert.equal(merge(f, null, { codes: ["unicorn"] }), null);
  const kinds = merge(field("taste.alcoholKinds"), null, { codes: ["wine"] })!;
  assert.deepEqual(kinds.alcohol.kinds, ["wine"]);
  const level = merge(field("taste.alcoholLevel"), kinds, { codes: ["lots"] })!;
  assert.equal(level.alcohol.level, "lots");
  assert.deepEqual(level.alcohol.kinds, ["wine"]);
});

test("생일은 바꾸고, 기념일은 같은 이름이면 바꾸고 아니면 더한다", () => {
  const bday = merge(field("dates.birthday"), null, { date: { calendar: "lunar", month: 11, day: 3 } })!;
  assert.deepEqual(bday.birthday, { calendar: "lunar", month: 11, day: 3, leap: false });
  const a1 = merge(field("dates.anniversary"), bday, { label: "결혼기념일", date: { calendar: "solar", month: 5, day: 3 } })!;
  const a2 = merge(field("dates.anniversary"), a1, { label: "결혼기념일", date: { calendar: "solar", month: 5, day: 4 } })!;
  assert.equal(a2.anniversaries.length, 1);
  assert.equal(a2.anniversaries[0]!.spec.day, 4);
  assert.equal(merge(field("dates.anniversary"), a2, { label: "", date: { calendar: "solar", month: 1, day: 1 } }), null);
  assert.deepEqual(sanitizeSection("dates", a2), a2);
});

test("화면에 보일 값", () => {
  assert.equal(describeCapture(field("safety.allergens"), { codes: ["peanut", "shrimp"] }, "ko"), "땅콩, 새우");
  assert.equal(describeCapture(field("dates.birthday"), { date: { calendar: "lunar", month: 11, day: 3 } }, "ko"), "음력 11월 3일");
  assert.equal(describeCapture(field("dates.anniversary"), { label: "결혼기념일", date: { calendar: "solar", month: 5, day: 3 } }, "en"), "결혼기념일 5/3");
});
