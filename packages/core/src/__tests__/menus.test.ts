import assert from "node:assert/strict";
import { test } from "node:test";
import { ALLERGENS, ALLERGY_NOTE_CODE, allergyBlocks, judgeMenus, mealBrief, MENUS, sanitizeSection, uncheckedAllergies } from "../index";

const SECTIONS = ["safety", "taste"] as const;
const diner = (name: string, safety: object, sections: readonly ("safety" | "taste")[] = SECTIONS) => ({ key: name, name, sections, card: { safety: sanitizeSection("safety", safety) } });
const codes = (name: string, safety: object, status: "ok" | "soft" | "avoid") =>
  judgeMenus([diner(name, safety)])
    .filter((v) => v.status === status)
    .map((v) => v.item.code)
    .sort();

test("메뉴 알레르기: 고등어는 생선이 든 메뉴를 피하고, 생선 알레르기와 같은 결과", () => {
  const avoid = codes("지수", { allergens: ["mackerel"] }, "avoid");
  for (const code of ["sushi", "korean_course", "seafood_stew", "tteokbokki", "pho"]) assert.ok(avoid.includes(code), code);
  assert.ok(!avoid.includes("pizza"));
  assert.deepEqual(codes("지수", { allergens: ["fish"] }, "avoid"), avoid);
  // 거를 수 있는 알레르기라 '확인 필요'는 붙지 않는다
  assert.equal(codes("지수", { allergens: ["mackerel"] }, "soft").length, 0);
  const sushi = judgeMenus([diner("지수", { allergens: ["mackerel"] })]).find((v) => v.item.code === "sushi")!;
  assert.deepEqual(sushi.reasons, [{ kind: "allergy", code: "mackerel", who: ["지수"] }]);
});

test("메뉴 알레르기: 견과류·호두·잣은 서로 거르고, 조개류는 새우·게·오징어와 같이 거른다", () => {
  for (const a of ["tree_nut", "walnut", "pine_nut"]) {
    const avoid = codes("지수", { allergens: [a] }, "avoid");
    assert.ok(avoid.includes("korean_course"), a);
    assert.ok(avoid.includes("salad"), a);
  }
  for (const a of ["shellfish", "shrimp", "crab", "squid"]) {
    const avoid = codes("지수", { allergens: [a] }, "avoid");
    assert.ok(avoid.includes("seafood_stew"), a);
    assert.ok(avoid.includes("sundubu"), a); // 조개류로만 적힌 메뉴
  }
  assert.ok(codes("지수", { allergens: ["shellfish"] }, "avoid").includes("jokbal")); // 새우젓
  assert.ok(!codes("지수", { allergens: ["squid"] }, "avoid").includes("jokbal"));
  assert.deepEqual([...allergyBlocks("mackerel")].sort(), ["fish", "mackerel"]);
  assert.deepEqual(allergyBlocks("peanut"), ["peanut"]);
});

test("메뉴 알레르기: 땅콩·새우처럼 원래 걸러지던 것은 그대로", () => {
  assert.deepEqual(codes("준호", { allergens: ["peanut"] }, "avoid"), ["malatang"]);
  assert.equal(codes("준호", { allergens: ["peanut"] }, "ok").length, MENUS.length - 1);
  assert.deepEqual(codes("지수", { allergens: ["shrimp"] }, "avoid"), ["chinese", "gukbap", "jokbal", "seafood_stew", "sundubu"]);
});

test("메뉴 알레르기: 어느 메뉴에도 안 적힌 재료(복숭아·아황산류·직접 적은 이름)는 메뉴를 내리지 않고 '확인 필요'로 따로 알린다", () => {
  for (const a of ["peach", "sulfite", "키위"]) {
    const d = [diner("지수", { allergens: [a] })];
    const v = judgeMenus(d);
    assert.equal(v.every((x) => x.status === "ok"), true, a); // 목록은 그대로 두고
    assert.deepEqual(uncheckedAllergies(mealBrief(d)), [{ code: a, who: ["지수"] }], a); // 확인 필요로 알린다
  }
  // 메뉴 이름에 맞는 직접 적은 이름은 그 메뉴만 피하고 나머지는 그대로(확인 필요도 아니다)
  assert.deepEqual(codes("아빠", { allergens: ["돈가스"] }, "avoid"), ["tonkatsu"]);
  assert.equal(codes("아빠", { allergens: ["돈가스"] }, "ok").length, MENUS.length - 1);
  assert.deepEqual(uncheckedAllergies(mealBrief([diner("아빠", { allergens: ["돈가스"] })])), []);
});

test("메뉴 알레르기: 표로 못 거르는 알레르기는 복숭아·아황산류뿐이다(다른 코드는 어느 메뉴엔가 걸린다)", () => {
  const unchecked = ALLERGENS.filter((a) => uncheckedAllergies(mealBrief([diner("x", { allergens: [a.code] })])).length > 0).map((a) => a.code);
  assert.deepEqual(unchecked.sort(), ["peach", "sulfite"]);
});

test("메뉴 알레르기: 확인 필요가 있어도 다른 사람의 알레르기는 그대로 거른다", () => {
  const d = [diner("지수", { allergens: ["peach"] }), diner("준호", { allergens: ["peanut"] })];
  const v = judgeMenus(d);
  const by = (code: string) => v.find((x) => x.item.code === code)!;
  assert.equal(by("malatang").status, "avoid");
  assert.deepEqual(by("malatang").reasons.map((r) => r.kind), ["allergy"]);
  assert.equal(by("pizza").status, "ok");
  assert.deepEqual(uncheckedAllergies(mealBrief(d)), [{ code: "peach", who: ["지수"] }]);
});

test("메뉴 알레르기 메모: 글로 적은 메모는 확인 필요로 알리고 메뉴 목록은 그대로(보이는 사람만)", () => {
  const d = [diner("지수", { allergyNote: "땅콩도 안 됨" })];
  assert.equal(judgeMenus(d).every((x) => x.status === "ok"), true);
  assert.deepEqual(uncheckedAllergies(mealBrief(d)), [{ code: ALLERGY_NOTE_CODE, who: ["지수"] }]);
  // 메모가 비었거나 공백뿐이면 알릴 것이 없다
  assert.deepEqual(uncheckedAllergies(mealBrief([diner("지수", { allergyNote: "   " })])), []);
  // 안전 항목을 보여 주지 않은 사람의 메모는 쓰지 않는다
  assert.deepEqual(uncheckedAllergies(mealBrief([diner("지수", { allergyNote: "땅콩도 안 됨" }, ["taste"])])), []);
  // 메모와 코드 알레르기가 같이 있으면 코드가 맞는 메뉴는 피해야 해요
  const both = judgeMenus([diner("지수", { allergens: ["peanut"], allergyNote: "땅콩도 안 됨" })]);
  assert.equal(both.find((x) => x.item.code === "malatang")!.status, "avoid");
  assert.equal(both.find((x) => x.item.code === "pizza")!.status, "ok");
  assert.deepEqual(mealBrief([diner("지수", { allergyNote: "땅콩도 안 됨" }), diner("준호", {})]).allergyNotes, ["지수"]);
});
