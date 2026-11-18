import assert from "node:assert/strict";
import { test } from "node:test";
import { captureField, emptySection, mergeCapture, type CaptureField, type CaptureOp, type CaptureValue, type DateSpec } from "../index";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const merge = (f: CaptureField, current: unknown, value: CaptureValue, op?: CaptureOp): any => mergeCapture(f, current as never, value, op);
const field = (key: string) => {
  const f = captureField(key);
  assert.ok(f, key);
  return f;
};

const dates = (birthday: DateSpec | null, anniversaries: { label: string; spec: DateSpec }[] = []) => ({ birthday, anniversaries });
const solar = (month: number, day: number, year?: number): DateSpec => ({ calendar: "solar", month, day, ...(year === undefined ? {} : { year }) });

test("말로 적은 날짜: 없는 날짜는 아무것도 바꾸지 않아서 이미 적은 생일을 지우지 않는다", () => {
  const kept = dates(solar(3, 1, 1990));
  const bad: DateSpec[] = [
    solar(13, 1),
    solar(0, 1),
    solar(4, 31),
    solar(2, 30),
    solar(1, 0),
    solar(1, 32),
    solar(2, 29, 1997), // 평년
    solar(5, 5, 1800),
    solar(5, 5, 2101),
    { calendar: "lunar", month: 1, day: 31 },
    { calendar: "solar", month: 3.5, day: 1 },
    { calendar: "solar", month: Number.NaN, day: 1 },
    { calendar: "lunar", month: 2, day: 3, leap: "yes" as unknown as boolean },
    { calendar: "weird" as unknown as "solar", month: 2, day: 3 },
  ];
  for (const date of bad) {
    for (const op of ["add", "replace"] as const) {
      assert.equal(merge(field("dates.birthday"), kept, { date }, op), null, JSON.stringify(date));
      assert.equal(merge(field("dates.birthday"), null, { date }, op), null, JSON.stringify(date));
    }
  }
  // 두 자리 연도는 1990이 아니라 90년으로 읽혀 범위 밖: 지우지 않는다
  assert.equal(merge(field("dates.birthday"), kept, { date: solar(3, 1, 90) }), null);
  // 멀쩡한 날짜는 그대로 바뀐다(연도 없는 2월 29일, 윤년 2월 29일, 음력 30일)
  assert.deepEqual(merge(field("dates.birthday"), kept, { date: solar(2, 29) }).birthday, solar(2, 29));
  assert.deepEqual(merge(field("dates.birthday"), kept, { date: solar(2, 29, 1996) }).birthday, solar(2, 29, 1996));
  assert.deepEqual(merge(field("dates.birthday"), null, { date: { calendar: "lunar", month: 12, day: 30 } }).birthday, { calendar: "lunar", month: 12, day: 30, leap: false });
});

test("말로 적은 기념일: 없는 날짜는 같은 이름의 기록을 지우지 않는다", () => {
  const kept = dates(null, [{ label: "결혼기념일", spec: solar(5, 3, 2016) }]);
  assert.equal(merge(field("dates.anniversary"), kept, { label: "결혼기념일", date: solar(4, 31) }), null);
  assert.equal(merge(field("dates.anniversary"), kept, { label: "결혼기념일", date: solar(13, 3) }), null);
  assert.equal(merge(field("dates.anniversary"), kept, { label: "결혼기념일", date: solar(2, 29, 2017) }), null);
  assert.equal(merge(field("dates.anniversary"), kept, { label: "결혼기념일", date: null }), null);
  // 멀쩡한 날짜면 같은 이름은 바뀌고 다른 이름은 더해진다
  const moved = merge(field("dates.anniversary"), kept, { label: "결혼기념일", date: solar(5, 4, 2016) });
  assert.deepEqual(moved.anniversaries, [{ label: "결혼기념일", spec: solar(5, 4, 2016) }]);
  const added = merge(field("dates.anniversary"), kept, { label: "100일", date: solar(8, 1) });
  assert.deepEqual(added.anniversaries.map((a: { label: string }) => a.label), ["결혼기념일", "100일"]);
});

test("날짜 지우기는 그대로: 생일은 비우고, 기념일은 이름이나 날짜로", () => {
  const kept = dates(solar(3, 1), [{ label: "결혼기념일", spec: solar(5, 3) }, { label: "100일", spec: solar(8, 1) }]);
  assert.equal(merge(field("dates.birthday"), kept, {}, "remove").birthday, null);
  assert.equal(merge(field("dates.birthday"), dates(null), {}, "remove"), null);
  assert.deepEqual(merge(field("dates.anniversary"), kept, { label: "100일" }, "remove").anniversaries.map((a: { label: string }) => a.label), ["결혼기념일"]);
  assert.deepEqual(merge(field("dates.anniversary"), kept, { date: solar(5, 3) }, "remove").anniversaries.map((a: { label: string }) => a.label), ["100일"]);
  assert.equal(merge(field("dates.anniversary"), kept, { label: "없는 날" }, "remove"), null);
});

test("지우기: 같은 말이 있으면 그것만, 짧은 말이 다른 말에 들어 있다고 지우지 않는다", () => {
  const likes = (list: string[]) => ({ ...emptySection("taste"), likes: list });
  // "밥"은 김밥 만들기·볶음밥이 아니라 "밥"만
  assert.deepEqual(merge(field("taste.likes"), likes(["김밥 만들기", "볶음밥", "밥"]), { text: "밥" }, "remove").likes, ["김밥 만들기", "볶음밥"]);
  // 같은 말이 없고 한 글자뿐이면 아무것도 지우지 않는다
  assert.equal(merge(field("taste.likes"), likes(["김밥 만들기", "볶음밥"]), { text: "밥" }, "remove"), null);
  assert.equal(merge(field("taste.likes"), likes(["소고기", "소주"]), { text: "소" }, "remove"), null);
  assert.deepEqual(merge(field("taste.likes"), likes(["소고기", "소주"]), { text: "소고기" }, "remove").likes, ["소주"]);
  // 두 글자 이상이고 맞는 것이 하나뿐이면 일부만 말해도 지운다
  assert.deepEqual(merge(field("taste.likes"), likes(["김밥 만들기", "볶음밥"]), { text: "볶음" }, "remove").likes, ["김밥 만들기"]);
  // 맞는 것이 둘 이상이면 누구인지 몰라 지우지 않는다
  assert.equal(merge(field("taste.likes"), likes(["김치찌개", "김치볶음밥"]), { text: "김치" }, "remove"), null);
  // 띄어쓰기·대소문자만 다르면 같은 말
  assert.deepEqual(merge(field("taste.likes"), likes(["Ice Cream", "아이스크림"]), { text: "ice cream" }, "remove").likes, ["아이스크림"]);
  // 쉼표로 여러 개를 말하면 하나씩 같은 규칙으로
  assert.deepEqual(merge(field("taste.likes"), likes(["소고기", "소주", "밥"]), { text: "소고기, 밥" }, "remove").likes, ["소주"]);
});

test("지우기: 글 칸·위시리스트·안 먹는 것·기념일·반려동물 간식도 같은 규칙", () => {
  const fav = { ...emptySection("favorites"), flowers: "장미, 수국" };
  assert.equal(merge(field("favorites.flowers"), fav, { text: "장" }, "remove"), null);
  assert.equal(merge(field("favorites.flowers"), fav, { text: "수국" }, "remove").flowers, "장미");

  const gifts = { ...emptySection("gifts"), wishlist: [{ title: "에어팟", url: "" }, { title: "에어팟 프로", url: "" }] };
  assert.deepEqual(merge(field("gifts.wishlist"), gifts, { text: "에어팟" }, "remove").wishlist, [{ title: "에어팟 프로", url: "" }]);

  // 코드는 이름("오이")으로 가리킬 수 있고, 그 이름이 들어 있는 다른 음식("오이무침")은 지우지 않는다
  const safety = { ...emptySection("safety"), dislikes: ["cucumber", "오이무침", "국밥"] };
  assert.deepEqual(merge(field("safety.dislikes"), safety, { text: "오이" }, "remove").dislikes, ["오이무침", "국밥"]);
  assert.deepEqual(merge(field("safety.dislikes"), safety, { codes: ["cucumber"] }, "remove").dislikes, ["오이무침", "국밥"]);
  assert.equal(merge(field("safety.dislikes"), safety, { text: "밥" }, "remove"), null);

  const kept = dates(null, [{ label: "결혼기념일", spec: solar(5, 3) }, { label: "연애기념일", spec: solar(8, 1) }]);
  assert.equal(merge(field("dates.anniversary"), kept, { label: "기념일" }, "remove"), null); // 둘 다 맞아서 모호
  assert.deepEqual(merge(field("dates.anniversary"), kept, { label: "결혼" }, "remove").anniversaries.map((a: { label: string }) => a.label), ["연애기념일"]);

  const pets = { pets: [{ name: "콩이", kind: "dog", breed: "", treats: ["고구마", "고구마 말랭이", "닭가슴살"], note: "" }], none: false };
  const out = merge(field("pets.treats"), pets, { label: "콩이", text: "고구마" }, "remove");
  assert.deepEqual(out.pets[0].treats, ["고구마 말랭이", "닭가슴살"]);
  assert.equal(merge(field("pets.treats"), pets, { label: "콩이", text: "닭" }, "remove"), null);
});
