import assert from "node:assert/strict";
import { test } from "node:test";
import { IMPORT_CHUNK, IMPORT_CHUNKS_MAX, IMPORT_MAX, captureField, cleanMemo, emptySection, mergeImport, sanitizeSection, splitMemo, type CardData } from "../index";

const field = (key: string) => captureField(key)!;

test("메모 정리: 줄바꿈은 살리고 공백·제어 문자는 정리하며 길이 한도 안으로", () => {
  assert.equal(cleanMemo("엄마 \t 좋아하는 것:  수국\r\n\r\n\r\n\r\n아빠: 등산​"), "엄마 좋아하는 것: 수국\n\n아빠: 등산");
  assert.equal(cleanMemo(null), "");
  assert.equal(cleanMemo("가".repeat(IMPORT_MAX + 50)).length, IMPORT_MAX);
});

test("메모 쪼개기: 짧으면 한 조각, 길면 한도 안의 조각들(빈 줄에서 끊기를 좋아한다)", () => {
  assert.deepEqual(splitMemo("엄마: 수국\n아빠: 등산"), ["엄마: 수국\n아빠: 등산"]);
  assert.deepEqual(splitMemo("  "), []);
  const person = (n: number) => `사람${n}\n좋아하는 음식: ${"떡볶이, 파스타, 김밥, ".repeat(8)}\n알레르기: 땅콩`;
  const memo = Array.from({ length: 20 }, (_, i) => person(i)).join("\n\n");
  const chunks = splitMemo(memo);
  assert.ok(chunks.length >= 2 && chunks.length <= IMPORT_CHUNKS_MAX, String(chunks.length));
  for (const c of chunks) assert.ok(c.length <= IMPORT_CHUNK * 1.5, String(c.length));
  // 사람 한 묶음이 두 조각으로 갈라지지 않는다(빈 줄에서 끊는다)
  for (const c of chunks) assert.ok(/^사람\d+\n/.test(c), c.slice(0, 20));
  // 내용이 빠지지 않는다
  assert.equal(chunks.join("\n").replace(/\n+/g, "\n"), cleanMemo(memo).replace(/\n+/g, "\n"));
});

test("메모 쪼개기: 줄 하나가 한도보다 길어도 한도 안으로 자르고, 조각 수는 위쪽 한도를 넘지 않는다", () => {
  const long = "좋아해요. ".repeat(900);
  const chunks = splitMemo(long.trim());
  assert.ok(chunks.length >= 1 && chunks.length <= IMPORT_CHUNKS_MAX);
  assert.ok(chunks.every((c) => c.length <= IMPORT_CHUNK * 2.2));
});

test("메모 가져오기 합치기: 없는 것만 더한다(있는 한 칸짜리와 같은 이름의 기념일은 그대로)", () => {
  const taste = sanitizeSection("taste", { likes: ["떡볶이"], spicy: 2, dessert: "푸딩", drinks: "" }) as CardData["taste"];
  // 목록: 없는 것만 더함
  const likes = mergeImport(field("taste.likes"), taste, { text: "파스타, 떡볶이" });
  assert.deepEqual((likes as CardData["taste"]).likes, ["떡볶이", "파스타"]);
  // 글: 이어 붙이되 같은 말은 안 늘린다
  assert.equal((mergeImport(field("taste.dessert"), taste, { text: "마카롱" }) as CardData["taste"]).dessert, "푸딩, 마카롱");
  assert.equal(mergeImport(field("taste.dessert"), taste, { text: "푸딩" }), null);
  // 있는 수는 바꾸지 않는다, 비어 있으면 채운다
  assert.equal(mergeImport(field("taste.spicy"), taste, { number: 4 }), null);
  assert.equal((mergeImport(field("taste.spicy"), emptySection("taste"), { number: 4 }) as CardData["taste"]).spicy, 4);
  // 생일: 있으면 그대로
  const dates = sanitizeSection("dates", { birthday: { calendar: "solar", month: 1, day: 24 }, anniversaries: [{ label: "결혼기념일", spec: { calendar: "solar", month: 5, day: 1 } }] });
  assert.equal(mergeImport(field("dates.birthday"), dates, { date: { calendar: "solar", month: 2, day: 2 } }), null);
  assert.equal(mergeImport(field("dates.anniversary"), dates, { label: "결혼기념일", date: { calendar: "solar", month: 6, day: 6 } }), null);
  const more = mergeImport(field("dates.anniversary"), dates, { label: "첫 만남", date: { calendar: "solar", month: 9, day: 9 } }) as CardData["dates"];
  assert.deepEqual(more.anniversaries.map((a) => a.label), ["결혼기념일", "첫 만남"]);
  // 사이즈 글(바꿔 쓰는 칸): 있으면 그대로
  const sizes = sanitizeSection("sizes", { top: "55", bottom: "", shoe: null, ring: null });
  assert.equal(mergeImport(field("sizes.top"), sizes, { text: "66" }), null);
  assert.equal((mergeImport(field("sizes.bottom"), sizes, { text: "27" }) as CardData["sizes"]).bottom, "27");
});
