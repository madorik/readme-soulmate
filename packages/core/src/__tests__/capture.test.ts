import assert from "node:assert/strict";
import { test } from "node:test";
import { CAPTURE_FIELDS, CAPTURE_TARGETS, captureField, describeCapture, emptySection, mergeCapture, sanitizeSection, SECTIONS, type CaptureField, type CaptureOp, type CaptureValue } from "../index";

// 합친 결과는 칸마다 모양이 달라, 시험에서는 넓게 받아 값만 본다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const merge = (f: CaptureField, current: unknown, value: CaptureValue, op?: CaptureOp): any => mergeCapture(f, current as never, value, op);

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

test("바꾸기: 그 칸을 새 값으로(글·목록·고르는 칸), 위시리스트는 같은 이름의 링크를 남긴다", () => {
  const flowers = merge(field("gifts.flowers"), { ...emptySection("gifts"), flowers: "카네이션보다 수국" }, { text: "튤립" }, "replace");
  assert.equal(flowers.flowers, "튤립");
  const likes = merge(field("taste.likes"), { ...emptySection("taste"), likes: ["짜장면", "떡볶이"] }, { text: "짬뽕" }, "replace");
  assert.deepEqual(likes.likes, ["짬뽕"]);
  const colors = merge(field("favorites.colors"), { ...emptySection("favorites"), colors: ["red"] }, { codes: ["blue"] }, "replace");
  assert.deepEqual(colors.colors, ["blue"]);
  const wish = merge(field("gifts.wishlist"), { ...emptySection("gifts"), wishlist: [{ title: "에어팟", url: "https://example.com/a" }, { title: "향수", url: "" }] }, { text: "에어팟" }, "replace");
  assert.deepEqual(wish.wishlist, [{ title: "에어팟", url: "https://example.com/a" }]);
  // 이미 그 값이면 바뀐 게 없다
  assert.equal(merge(field("gifts.flowers"), flowers, { text: "튤립" }, "replace"), null);
});

test("지우기: 맞는 것만 빼고, 값이 없으면 그 칸을 비우고, 없는 걸 지우라면 null", () => {
  const safety = { ...emptySection("safety"), allergens: ["peanut", "shrimp"] };
  assert.deepEqual(merge(field("safety.allergens"), safety, { codes: ["peanut"] }, "remove").allergens, ["shrimp"]);
  assert.deepEqual(merge(field("safety.allergens"), safety, {}, "remove").allergens, []);
  assert.equal(merge(field("safety.allergens"), safety, { codes: ["milk"] }, "remove"), null);
  assert.equal(merge(field("safety.allergens"), safety, { text: "고양이" }, "remove"), null);

  const gifts = { ...emptySection("gifts"), flowers: "카네이션보다 수국, 해바라기", wishlist: [{ title: "에어팟 프로", url: "" }, { title: "향수", url: "" }] };
  assert.equal(merge(field("gifts.flowers"), gifts, { text: "수국" }, "remove").flowers, "해바라기");
  assert.deepEqual(merge(field("gifts.wishlist"), gifts, { text: "에어팟" }, "remove").wishlist, [{ title: "향수", url: "" }]);
  assert.equal(merge(field("gifts.flowers"), gifts, { text: "튤립" }, "remove"), null);

  const taste = { ...emptySection("taste"), likes: ["짜장면", "떡볶이"], spicy: 3 };
  assert.deepEqual(merge(field("taste.likes"), taste, { text: "짜장면" }, "remove").likes, ["떡볶이"]);
  assert.equal(merge(field("taste.spicy"), taste, {}, "remove").spicy, null);
  assert.equal(merge(field("taste.spicy"), emptySection("taste"), {}, "remove"), null);

  const dates = { birthday: { calendar: "solar" as const, month: 3, day: 1 }, anniversaries: [{ label: "결혼기념일", spec: { calendar: "solar" as const, month: 5, day: 3 } }] };
  assert.equal(merge(field("dates.birthday"), dates, {}, "remove").birthday, null);
  assert.deepEqual(merge(field("dates.anniversary"), dates, { label: "결혼 기념일" }, "remove").anniversaries, []);
});

test("알레르기·안 먹는 것: 목록에 없는 음식은 이름 그대로 새 항목으로, 목록에 있는 이름은 코드로", () => {
  const safety = sanitizeSection("safety", { allergens: ["peanut", "키위"], dislikes: ["오이", "국밥", "cucumber", " 국밥 ", "없음"] }) as { allergens: string[]; dislikes: string[] };
  assert.deepEqual(safety.allergens, ["peanut", "키위"]);
  assert.deepEqual(safety.dislikes, ["cucumber", "국밥"]);
  assert.deepEqual((sanitizeSection("safety", { dislikes: ["없음"] }) as { dislikes: string[] }).dislikes, ["none"]);

  const f = field("safety.dislikes");
  const out = merge(f, { ...emptySection("safety"), dislikes: ["none"] }, { codes: ["cucumber"], text: "순대, 국밥" });
  assert.deepEqual(out.dislikes, ["cucumber", "순대", "국밥"]);
  // 같은 이름은 두 번 넣지 않고, 목록 이름("오이")은 코드와 같은 것으로 본다
  assert.equal(merge(f, out, { text: "오이" }), null);
  // 지우기는 코드·이름 어느 쪽으로도
  assert.deepEqual(merge(f, out, { text: "국밥" }, "remove").dislikes, ["cucumber", "순대"]);
  assert.deepEqual(merge(f, out, { text: "오이" }, "remove").dislikes, ["순대", "국밥"]);
  assert.equal(describeCapture(f, { codes: ["cucumber"], text: "순대" }, "ko"), "오이, 순대");
});
