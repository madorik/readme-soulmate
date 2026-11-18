import assert from "node:assert/strict";
import { test } from "node:test";
import type { GiftsData, PartialCard } from "@readme/core";
import { keepAskerWishes, prefillForRecipient } from "../ask-core";

const gifts = (g: Partial<GiftsData>): GiftsData => ({ giftCard: null, wishlist: [], skip: [], brands: [], ...g });
const wish = (title: string, url = "") => ({ title, url });

test("상대에게 미리 채워 보낼 때 해주고 싶은 선물(wishlist)은 뺀다", () => {
  const card: PartialCard = { gifts: gifts({ giftCard: "yes", skip: ["꽃"], brands: ["무인양품"], wishlist: [wish("에어팟", "https://example.com/a")] }) };
  const out = prefillForRecipient(card);
  assert.deepEqual(out.gifts, { giftCard: "yes", wishlist: [], skip: ["꽃"], brands: ["무인양품"] });
  assert.equal(JSON.stringify(out).includes("에어팟"), false);
  assert.equal(JSON.stringify(out).includes("example.com"), false);
});

test("원본은 바꾸지 않는다", () => {
  const card: PartialCard = { gifts: gifts({ giftCard: "no", wishlist: [wish("시계")] }) };
  prefillForRecipient(card);
  assert.equal(card.gifts?.wishlist.length, 1);
});

test("wishlist만 있던 선물 칸은 칸째 뺀다(빈 칸을 '맞아요?'로 묻지 않게)", () => {
  const out = prefillForRecipient({ gifts: gifts({ wishlist: [wish("가방")] }), taste: undefined });
  assert.equal("gifts" in out, false);
});

test("선물 칸이 없거나 다른 칸은 그대로", () => {
  const card: PartialCard = { sizes: { top: "L", bottom: "", shoe: 270, ring: null } };
  assert.equal(prefillForRecipient(card), card);
  assert.deepEqual(prefillForRecipient({}), {});
  const both: PartialCard = { sizes: card.sizes, gifts: gifts({ skip: ["향수"], wishlist: [wish("x")] }) };
  const out = prefillForRecipient(both);
  assert.deepEqual(out.sizes, card.sizes);
  assert.deepEqual(out.gifts?.skip, ["향수"]);
});

test("상대가 답해 칸이 바뀌어도 내가 적어 둔 wishlist는 남고, 상대가 적은 것은 뒤에 더해진다(중복은 한 번)", () => {
  const existing = gifts({ wishlist: [wish("에어팟"), wish("시계", "https://example.com/w")] });
  const answer = gifts({ giftCard: "yes", wishlist: [wish("시계", "https://example.com/w"), wish("책")] });
  const out = keepAskerWishes(answer, existing);
  assert.deepEqual(out.wishlist.map((w) => w.title), ["에어팟", "시계", "책"]);
  assert.equal(out.giftCard, "yes");
});

test("내 wishlist가 없으면 상대 답 그대로", () => {
  const answer = gifts({ wishlist: [wish("책")] });
  assert.equal(keepAskerWishes(answer, undefined), answer);
  assert.equal(keepAskerWishes(answer, null), answer);
  assert.equal(keepAskerWishes(answer, gifts({})), answer);
});
