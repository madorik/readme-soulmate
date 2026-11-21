import assert from "node:assert/strict";
import { test } from "node:test";
import { SECTIONS_BY_IMPORTANCE, sanitizeSection, type PartialCard } from "@readme/core";
import { composeShareText, sectionShareLines, shareParts } from "../share-record";
import { makeT } from "../t";

const ko = makeT("ko");
const en = makeT("en");

const card: PartialCard = {
  safety: sanitizeSection("safety", { allergens: ["peanut", "shrimp"], dislikes: ["cucumber"], diets: [], allergyNote: "국물도 안 돼요" }),
  taste: sanitizeSection("taste", { likes: ["떡볶이"], spicy: 3, dessert: "마카롱", drinks: "라떼", alcohol: { level: null, kinds: [] } }),
  sizes: sanitizeSection("sizes", { top: "55", bottom: "", shoe: 235, ring: null }),
  gifts: sanitizeSection("gifts", { giftCard: "no", wishlist: [{ title: "에어프라이어", url: "" }], skip: ["향초"], brands: ["이솝"] }),
  favorites: sanitizeSection("favorites", { flowers: "수국", colors: ["pink"] }),
  dates: sanitizeSection("dates", { birthday: { calendar: "lunar", month: 10, day: 12 }, anniversaries: [{ label: "결혼기념일", spec: { calendar: "solar", month: 5, day: 18 } }] }),
};

test("항목 글: 화면과 같은 이름표로, 적어 둔 줄만", () => {
  assert.deepEqual(sectionShareLines("safety", card, "ko", ko), ["알레르기: 땅콩, 새우", "안 먹어요: 오이", "“국물도 안 돼요”"]);
  assert.deepEqual(sectionShareLines("taste", card, "ko", ko), ["좋아해요: 떡볶이", "매운맛: 매운 거 좋아요", "좋아하는 디저트·간식: 마카롱", "요즘 마시는 것: 라떼"]);
  const fav = sectionShareLines("favorites", card, "ko", ko);
  assert.ok(fav.some((l) => l.endsWith(": 수국")) && fav.some((l) => l.endsWith(": 분홍")), fav.join("|"));
  assert.deepEqual(sectionShareLines("safety", card, "en", en)[0], "Allergies: Peanut, Shrimp");
  // 비어 있는 항목은 줄이 없다
  assert.deepEqual(sectionShareLines("pets", card, "ko", ko), []);
  assert.deepEqual(sectionShareLines("culture", {}, "ko", ko), []);
});

test("사이즈·날짜: 환산 설명과 음력 표기가 붙는다", () => {
  const sizes = sectionShareLines("sizes", card, "ko", ko);
  assert.ok(sizes[0]!.startsWith("상의: 55"), sizes[0]);
  assert.ok(sizes.some((l) => l.startsWith("신발: 235")), sizes.join("|"));
  const dates = sectionShareLines("dates", card, "ko", ko);
  assert.ok(dates[0]!.startsWith("생일: 음력 10월 12일"), dates[0]);
  assert.ok(dates[1]!.startsWith("결혼기념일: "), dates[1]);
});

test("선물 칸: 다른 사람 기록의 '해주고 싶은 선물'은 기본으로 빼고(몰래 준비하는 것), 내 기록의 '받고 싶은 것'은 넣는다", () => {
  const person = sectionShareLines("gifts", card, "ko", ko);
  assert.ok(!person.some((l) => l.includes("에어프라이어")), person.join("|"));
  assert.ok(person.some((l) => l.includes("이솝")) && person.some((l) => l.includes("향초")));
  const mine = sectionShareLines("gifts", card, "ko", ko, { wishlist: true });
  assert.ok(mine.some((l) => l.includes("에어프라이어")), mine.join("|"));
});

test("보낼 항목들: 적어 둔 것만, 중요한 순서(생일 → 알레르기 → …)", () => {
  const parts = shareParts(SECTIONS_BY_IMPORTANCE, card, "ko", ko);
  assert.deepEqual(parts.map((p) => p.section), ["dates", "safety", "taste", "gifts", "sizes", "favorites"]);
  assert.equal(parts[1]!.title, "알레르기와 못 먹는 음식");
});

test("보낼 글: 머리 · 항목마다 [이름]과 줄들 · 꼬리", () => {
  const parts = shareParts(["safety", "sizes"], card, "ko", ko);
  const text = composeShareText(parts, "엄마에 대해 기억해 둔 것", "기억해유 · https://example.test/get");
  assert.equal(
    text.split("\n").slice(0, 7).join("\n"),
    ["엄마에 대해 기억해 둔 것", "", "[알레르기와 못 먹는 음식]", "알레르기: 땅콩, 새우", "안 먹어요: 오이", "“국물도 안 돼요”", "", ].join("\n"),
  );
  assert.ok(text.includes("[사이즈]\n상의: 55"));
  assert.ok(text.endsWith("기억해유 · https://example.test/get"));
  // 고른 항목이 없으면 머리와 꼬리만
  assert.equal(composeShareText([], "머리", "꼬리"), "머리\n\n꼬리");
});
