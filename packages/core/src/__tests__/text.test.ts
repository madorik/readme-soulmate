import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAnswer, captureField, clip, emptySection, mergeCapture, sanitizeSection, type TasteData } from "../index";

/** 짝 없는 서로게이트가 있는지 */
const lone = (s: string) => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s);

test("clip: 글자(코드 포인트) 단위로 자르고, 이모지를 반으로 가르지 않는다", () => {
  assert.equal(clip("abc", 5), "abc");
  assert.equal(clip("abcdef", 3), "abc");
  assert.equal(clip("a😀b", 2), "a😀");
  assert.equal(clip("a😀b", 1), "a");
  assert.equal(clip("😀😀😀", 2), "😀😀");
  assert.equal(clip("가나다", 0), "");
  // 이미 깨진 글(짝 없는 서로게이트)은 버린다
  assert.equal(clip("a\ud83d", 5), "a");
  assert.equal(clip("\ude00b", 5), "b");
  assert.equal(lone(clip("😀".repeat(10).slice(0, 7), 100)), false);
  // 사람 이름이나 한글은 그대로
  assert.equal(clip("정민균", 3), "정민균");
});

test("카드 정리: 길이 한도에 이모지가 걸려도 저장할 수 있는 글이 남는다", () => {
  const edge = "가".repeat(119) + "😀"; // 글자 120개, UTF-16으로는 121칸
  const taste = sanitizeSection("taste", { dessert: edge });
  assert.equal(taste.dessert, edge);
  assert.equal(lone(JSON.stringify(taste)), false);
  // 한도를 넘는 자리에서 이모지가 시작해도 반쪽이 남지 않는다
  const over = sanitizeSection("taste", { dessert: "가".repeat(120) + "😀" });
  assert.equal(over.dessert, "가".repeat(120));
  assert.equal(lone(JSON.stringify(over)), false);
  // 알레르기 이름(30자), 목록 항목(60자), 반려동물 이름(30자), 메모(400자)
  assert.equal(lone(JSON.stringify(sanitizeSection("safety", { allergens: ["나".repeat(29) + "😀😀"] }))), false);
  assert.equal(lone(JSON.stringify(sanitizeSection("taste", { likes: ["나".repeat(59) + "😀😀"] }))), false);
  assert.equal(lone(JSON.stringify(sanitizeSection("pets", { pets: [{ name: "콩".repeat(29) + "🐶🐶", kind: "dog" }] }))), false);
  assert.equal(lone(JSON.stringify(sanitizeSection("safety", { allergyNote: "메".repeat(399) + "🥜🥜" }))), false);
  // 들어올 때부터 깨진 글도 정리된다
  assert.equal(sanitizeSection("favorites", { scent: "우디\ud83d" }).scent, "우디");
});

test("말로 적기·오늘의 질문: 이모지가 한도에 걸려도 저장 모양이 멀쩡하다", () => {
  const out = mergeCapture(captureField("taste.drinks")!, emptySection("taste"), { text: "라".repeat(119) + "🍵🍵" }) as TasteData | null;
  assert.ok(out);
  assert.equal(out.drinks, "라".repeat(119) + "🍵");
  assert.equal(lone(JSON.stringify(out)), false);
  const answered = applyAnswer({}, "flowers", "튤".repeat(59) + "🌷🌷");
  assert.equal(lone(JSON.stringify(answered)), false);
});
