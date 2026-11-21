import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeCards, mergeDiffers, pickSections, sanitizeSection, type PartialCard } from "../index";

const taste = (v: object) => sanitizeSection("taste", v);
const safety = (v: object) => sanitizeSection("safety", v);

test("받은 기록 합치기: 유지는 빈 칸만 채우고, 있던 목록에는 없던 것만 더한다", () => {
  const mine: PartialCard = { taste: taste({ likes: ["떡볶이"], spicy: 2, dessert: "", drinks: "" }) };
  const got: PartialCard = { taste: taste({ likes: ["파스타", "떡볶이"], spicy: 4, dessert: "마카롱", drinks: "" }) };
  const { card, changed } = mergeCards(mine, got, "keep");
  assert.deepEqual(card.taste?.likes, ["떡볶이", "파스타"]);
  assert.equal(card.taste?.spicy, 2, "있던 값은 그대로");
  assert.equal(card.taste?.dessert, "마카롱", "빈 칸은 채운다");
  assert.deepEqual(changed, ["taste"]);
});

test("받은 기록 합치기: 덮어쓰기는 받은 값이 있는 칸만 바꾸고, 받은 쪽 빈 칸은 있던 값을 지우지 않는다", () => {
  const mine: PartialCard = { taste: taste({ likes: ["떡볶이"], spicy: 2, dessert: "푸딩", drinks: "커피" }) };
  const got: PartialCard = { taste: taste({ likes: ["파스타"], spicy: 4, dessert: "", drinks: "" }) };
  const { card } = mergeCards(mine, got, "overwrite");
  assert.deepEqual(card.taste?.likes, ["파스타"]);
  assert.equal(card.taste?.spicy, 4);
  assert.equal(card.taste?.dessert, "푸딩");
  assert.equal(card.taste?.drinks, "커피");
});

test("받은 기록 합치기: 받은 기록에 없는 항목은 건드리지 않고, 바뀐 게 없으면 changed가 비어 있다", () => {
  const mine: PartialCard = { taste: taste({ likes: ["떡볶이"] }), safety: safety({ allergens: ["peanut"] }) };
  const same = mergeCards(mine, { taste: taste({ likes: ["떡볶이"] }) }, "keep");
  assert.deepEqual(same.changed, []);
  assert.deepEqual(same.card.safety, mine.safety);
  const none = mergeCards(mine, {}, "overwrite");
  assert.deepEqual(none.card, mine);
  assert.deepEqual(none.changed, []);
});

test("받은 기록 합치기: 알레르기 없음은 다른 알레르기와 같이 있을 수 없다(알레르기가 이긴다)", () => {
  const withNone = (a: string[]) => ({ safety: safety({ allergens: a }) }) as PartialCard;
  const keep = mergeCards(withNone(["none"]), withNone(["peanut"]), "keep");
  assert.deepEqual(keep.card.safety?.allergens, ["peanut"]);
  const keep2 = mergeCards(withNone(["peanut"]), withNone(["none"]), "keep");
  assert.deepEqual(keep2.card.safety?.allergens, ["peanut"], "있던 알레르기를 '없음'이 지우지 않는다");
  const over = mergeCards(withNone(["peanut"]), withNone(["milk", "egg"]), "overwrite");
  assert.deepEqual(over.card.safety?.allergens.sort(), ["egg", "milk"]);
});

test("받은 기록 합치기: 생일은 한 칸으로 보고, 기념일·위시·반려동물은 같은 이름이면 겹치지 않는다", () => {
  const spec = (m: number, d: number) => ({ calendar: "solar", month: m, day: d });
  const dates = (birthday: object | null, anniversaries: object[]) => sanitizeSection("dates", { birthday, anniversaries });
  const a = mergeCards({ dates: dates(spec(1, 24), [{ label: "결혼기념일", spec: spec(5, 1) }]) }, { dates: dates(spec(2, 2), [{ label: "결혼기념일", spec: spec(5, 1) }, { label: "첫 만남", spec: spec(9, 9) }]) }, "keep");
  assert.deepEqual(a.card.dates?.birthday, { calendar: "solar", month: 1, day: 24 }, "생일은 있던 값 유지");
  assert.deepEqual(a.card.dates?.anniversaries.map((x) => x.label), ["결혼기념일", "첫 만남"]);

  const gifts = (titles: string[]) => sanitizeSection("gifts", { wishlist: titles.map((title) => ({ title, url: "" })) });
  const g = mergeCards({ gifts: gifts(["캠핑 의자"]) }, { gifts: gifts(["캠핑 의자", "랜턴"]) }, "keep");
  assert.deepEqual(g.card.gifts?.wishlist.map((x) => x.title), ["캠핑 의자", "랜턴"]);

  const pets = (names: string[]) => sanitizeSection("pets", { pets: names.map((name) => ({ name, kind: "dog", breed: "", treats: [], note: "" })), none: false });
  const p = mergeCards({ pets: pets(["콩이"]) }, { pets: pets(["콩이", "보리"]) }, "keep");
  assert.deepEqual(p.card.pets?.pets.map((x) => x.name), ["콩이", "보리"]);
  assert.equal(p.card.pets?.none, false);
});

test("유지와 덮어쓰기가 다를 때만 묻는다", () => {
  const mine: PartialCard = { taste: taste({ likes: ["떡볶이"], spicy: 2 }) };
  // 빈 기록이거나 받은 것이 이미 다 있으면 같다
  assert.equal(mergeDiffers({}, { taste: taste({ likes: ["파스타"] }) }), false);
  assert.equal(mergeDiffers(mine, { taste: taste({ likes: ["떡볶이"], spicy: 2 }) }), false);
  // 빈 칸만 채우는 경우(겹치는 칸이 없다)도 같다
  assert.equal(mergeDiffers(mine, { taste: taste({ dessert: "마카롱" }) }), false);
  // 같은 칸에 다른 값이 있으면 묻는다
  assert.equal(mergeDiffers(mine, { taste: taste({ spicy: 4 }) }), true);
  assert.equal(mergeDiffers(mine, { taste: taste({ likes: ["파스타"] }) }), true);
});

test("보낼 기록 고르기: 고른 항목 중 적어 둔 것만, 정리해서", () => {
  const card: PartialCard = { taste: taste({ likes: ["떡볶이"] }), safety: safety({}), gifts: sanitizeSection("gifts", { skip: ["향수"] }) };
  const out = pickSections(card, ["taste", "safety", "life"]);
  assert.deepEqual(Object.keys(out), ["taste"], "고르지 않은 항목·빈 항목·없는 항목은 빠진다");
});
