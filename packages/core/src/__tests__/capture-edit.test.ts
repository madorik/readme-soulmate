import assert from "node:assert/strict";
import { test } from "node:test";
import { captureField, describeCapture, mergeCapture, parseCaptureEdit, type CaptureField, type CaptureOp, type CaptureValue, type Locale } from "../index";

// 합친 결과는 칸마다 모양이 달라, 시험에서는 넓게 받아 값만 본다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const merge = (f: CaptureField, current: unknown, value: CaptureValue, op?: CaptureOp): any => mergeCapture(f, current as never, value, op);

const field = (key: string) => {
  const f = captureField(key);
  assert.ok(f, key);
  return f;
};
const edit = (key: string, input: string, current: CaptureValue = {}, locale: Locale = "ko") => parseCaptureEdit(field(key), input, locale, current);

test("고친 글 읽기: 글·목록 칸은 쓴 글 그대로(띄어쓰기만 정리), 빈 글은 못 읽는다", () => {
  assert.deepEqual(edit("taste.drinks", "  바닐라   라떼 "), { text: "바닐라 라떼" });
  assert.deepEqual(edit("taste.likes", "마라탕, 떡볶이", { text: "마라탕" }), { text: "마라탕, 떡볶이" });
  assert.equal(edit("taste.drinks", "   "), null);
});

test("고친 글 읽기: 고르는 칸은 선택지 이름(한국어·영어·코드)으로, 목록에 없는 말은 못 읽는다", () => {
  const colors = field("favorites.colors");
  const first = colors.catalog![0]!;
  const second = colors.catalog![1]!;
  const out = edit("favorites.colors", `${first.label.ko}, ${second.label.en.toUpperCase()}`);
  assert.deepEqual(out?.codes, [first.code, second.code]);
  assert.equal(edit("favorites.colors", `${first.label.ko}, 없는색깔`), null);
  // 읽은 값을 다시 보이면 처음 쓴 말과 같다
  assert.equal(describeCapture(colors, out!, "ko"), `${first.label.ko}, ${second.label.ko}`);
});

test("고친 글 읽기: 알레르기·안 먹는 것은 목록 이름은 코드로, 나머지는 새 항목 글로", () => {
  const f = field("safety.allergens");
  const known = f.catalog![0]!;
  const out = edit("safety.allergens", `${known.label.ko}, 두리안`);
  assert.deepEqual(out, { codes: [known.code], text: "두리안" });
  assert.deepEqual(edit("safety.allergens", "두리안"), { codes: null, text: "두리안" });
});

test("고친 글 읽기: 수는 숫자만 뽑고 범위를 지키며, 매운맛은 단계 이름도 읽는다", () => {
  assert.deepEqual(edit("sizes.shoe", "245mm"), { number: 245 });
  assert.equal(edit("sizes.shoe", "24"), null);
  assert.equal(edit("sizes.shoe", "아주 큰 발"), null);
  assert.deepEqual(edit("sizes.ring", "13호"), { number: 13 });
  const spicy = field("taste.spicy");
  assert.deepEqual(edit("taste.spicy", describeCapture(spicy, { number: 2 }, "ko")), { number: 2 });
  assert.deepEqual(edit("taste.spicy", describeCapture(spicy, { number: 4 }, "en"), {}, "en"), { number: 4 });
  assert.deepEqual(edit("taste.spicy", "3"), { number: 3 });
  assert.equal(edit("taste.spicy", "9"), null);
});

test("고친 글 읽기: 생일은 월·일(음력 표시 포함)을 읽고, 없는 날짜는 못 읽으며, 적어 둔 연도는 남긴다", () => {
  assert.deepEqual(edit("dates.birthday", "3월 5일"), { date: { calendar: "solar", month: 3, day: 5 } });
  assert.deepEqual(edit("dates.birthday", "음력 3월 5일"), { date: { calendar: "lunar", month: 3, day: 5 } });
  assert.deepEqual(edit("dates.birthday", "Lunar 12/30", {}, "en"), { date: { calendar: "lunar", month: 12, day: 30 } });
  assert.deepEqual(edit("dates.birthday", "3/6", { date: { calendar: "solar", month: 3, day: 5, year: 1990 } }), { date: { calendar: "solar", month: 3, day: 6, year: 1990 } });
  assert.deepEqual(edit("dates.birthday", "1991.3.6", { date: { calendar: "solar", month: 3, day: 5, year: 1990 } }), { date: { calendar: "solar", month: 3, day: 6, year: 1991 } });
  assert.equal(edit("dates.birthday", "4월 31일"), null);
  assert.equal(edit("dates.birthday", "곧"), null);
  // 평년에 2월 29일 + 평년을 같이 적으면 연도만 버린다
  assert.deepEqual(edit("dates.birthday", "2월 29일", { date: { calendar: "solar", month: 2, day: 28, year: 1997 } }), { date: { calendar: "solar", month: 2, day: 29 } });
});

test("고친 글 읽기: 기념일은 이름과 날짜 둘 다 있어야 한다(describeCapture와 왕복)", () => {
  const f = field("dates.anniversary");
  const value: CaptureValue = { label: "결혼기념일", date: { calendar: "solar", month: 10, day: 3 } };
  assert.deepEqual(edit("dates.anniversary", describeCapture(f, value, "ko"), value), value);
  assert.deepEqual(edit("dates.anniversary", "100일 기념 5월 6일"), { label: "100일 기념", date: { calendar: "solar", month: 5, day: 6 } });
  assert.equal(edit("dates.anniversary", "결혼기념일"), null);
  assert.equal(edit("dates.anniversary", "3월 5일"), null);
});

test("고친 글 읽기: 반려동물은 이름 · 종류 · 품종으로 읽고, 이름이 없던 줄은 이름을 만들지 않는다", () => {
  const pet = field("pets.pet");
  const dog = pet.catalog!.find((x) => x.code === "dog") ?? pet.catalog![0]!;
  const value: CaptureValue = { label: "콩이", codes: [dog.code], text: "푸들" };
  assert.equal(describeCapture(pet, value, "ko"), `콩이 · ${dog.label.ko} · 푸들`);
  assert.deepEqual(edit("pets.pet", `콩이 · ${dog.label.ko} · 말티즈`, value), { label: "콩이", codes: [dog.code], text: "말티즈" });
  assert.deepEqual(edit("pets.pet", "말티즈", { label: null }), { label: null, codes: null, text: "말티즈" });
  assert.deepEqual(edit("pets.treats", "콩이 · 오리 간식, 공", { label: "콩이", text: "오리 간식" }), { label: "콩이", text: "오리 간식, 공" });
  assert.deepEqual(edit("pets.treats", "오리 간식", { label: "콩이", text: "닭가슴살" }), { label: "콩이", text: "오리 간식" });
});

test("고친 글을 읽은 값은 그대로 합쳐진다(저장 단계가 쓰는 길)", () => {
  const f = field("taste.drinks");
  const v = edit("taste.drinks", "바닐라라떼")!;
  assert.equal(merge(f, null, v, "add")?.drinks, "바닐라라떼");
  const shoe = edit("sizes.shoe", "250")!;
  assert.equal(merge(field("sizes.shoe"), null, shoe, "replace")?.shoe, 250);
});
