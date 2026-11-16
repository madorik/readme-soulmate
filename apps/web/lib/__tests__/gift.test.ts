import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import type { PartialCard } from "@readme/core";
import {
  coupangAuthorization,
  coupangSearchQuery,
  coupangSignedDate,
  coupangUrl,
  giftBasis,
  giftProfile,
  ideasRequest,
  parseCoupangSearch,
  parseIdeas,
  ruleIdeas,
  sanitizeIdeas,
  type GiftContext,
} from "../gift-core";

const card: PartialCard = {
  life: { hobbies: ["캠핑", "등산"], seasons: [], travel: "" },
  gifts: { giftCard: "no", wishlist: [{ title: "블루투스 스피커", url: "" }], skip: ["텀블러"], brands: ["이솝"] },
  favorites: { scent: "우디, 너무 달지 않은 향", flowers: "튤립", colors: ["green"], patterns: [], styles: [], metals: [], vibes: [], places: [], idol: "", character: "", team: "", animal: "" },
  taste: { likes: [], spicy: null, dessert: "마카롱", drinks: "", alcohol: { level: "none", kinds: ["wine"] } },
  safety: { allergens: ["peanut"], allergyNote: "", dislikes: [], diets: [] },
  sizes: { top: "95", bottom: "", shoe: 260, ring: null },
};
const ctx: GiftContext = { call: "아빠", folders: ["가족"], occasion: { kind: "birthday", label: "" }, age: 62 };

test("쿠팡 서명: yyMMddTHHmmssZ(UTC) + HMAC-SHA256(날짜·방법·경로·쿼리)", () => {
  const now = new Date(Date.UTC(2026, 10, 16, 3, 4, 5));
  assert.equal(coupangSignedDate(now), "261116T030405Z");
  const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search";
  const query = coupangSearchQuery("캠핑 머그컵", 6);
  assert.equal(query, "keyword=%EC%BA%A0%ED%95%91%20%EB%A8%B8%EA%B7%B8%EC%BB%B5&limit=6&imageSize=300x300");
  const sig = createHmac("sha256", "secret").update(`261116T030405ZGET${path}${query}`).digest("hex");
  assert.equal(coupangAuthorization("GET", path, query, "access", "secret", now), `CEA algorithm=HmacSHA256, access-key=access, signed-date=261116T030405Z, signature=${sig}`);
  assert.match(coupangSearchQuery("a", 3, "remember you"), /&subId=remember%20you$/);
});

test("쿠팡 응답: 쿠팡 주소인 상품만, 값이 이상하면 뺀다", () => {
  const body = {
    rCode: "0",
    data: {
      landingUrl: "https://link.coupang.com/re/AFFSRP?lptag=AF1&q=x",
      productData: [
        { productId: 1, productName: " 캠핑  머그컵 ", productPrice: 12900.4, productImage: "https://thumbnail6.coupangcdn.com/a.jpg", productUrl: "https://link.coupang.com/re/AFFSDP?itemId=1", isRocket: true },
        { productId: 2, productName: "가짜", productPrice: 1000, productImage: "https://evil.example/a.jpg", productUrl: "https://link.coupang.com/x" },
        { productId: 3, productName: "http", productPrice: 1000, productImage: "http://thumbnail6.coupangcdn.com/a.jpg", productUrl: "https://link.coupang.com/x" },
        { productId: 4, productName: "값 없음", productPrice: 0, productImage: "https://thumbnail6.coupangcdn.com/a.jpg", productUrl: "https://link.coupang.com/x" },
      ],
    },
  };
  const r = parseCoupangSearch(body);
  assert.deepEqual(r, {
    landingUrl: "https://link.coupang.com/re/AFFSRP?lptag=AF1&q=x",
    products: [{ id: "1", name: "캠핑 머그컵", price: 12900, image: "https://thumbnail6.coupangcdn.com/a.jpg", url: "https://link.coupang.com/re/AFFSDP?itemId=1", rocket: true }],
  });
  assert.equal(parseCoupangSearch({ rCode: "400", rMessage: "bad" }), null);
  assert.equal(parseCoupangSearch(null), null);
  assert.equal(coupangUrl("https://notcoupang.com/a"), null);
  assert.equal(coupangUrl("http://127.0.0.1:3299/img.png", "127.0.0.1:3299"), "http://127.0.0.1:3299/img.png");
});

test("선물 힌트: 취향·브랜드·향은 넣고 사이즈는 빼며, 사양·알레르기·안 마시는 술은 피할 것으로", () => {
  const p = giftProfile(card);
  assert.ok(p.hints.includes("취미: 캠핑, 등산"));
  assert.ok(p.hints.includes("좋아하는 브랜드: 이솝"));
  assert.ok(p.hints.some((h) => h.startsWith("좋아하는 향: 우디")));
  assert.ok(!p.hints.some((h) => h.includes("와인")), "안 마시면 술 종류는 넣지 않는다");
  assert.ok(!p.hints.some((h) => /260|95/.test(h)), "사이즈는 보내지 않는다");
  assert.deepEqual(p.wishes, ["블루투스 스피커"]);
  assert.ok(p.avoid.includes("텀블러") && p.avoid.includes("술") && p.avoid.some((a) => a.includes("알레르기")));
  assert.equal(p.giftCard, "no");
  assert.equal(giftBasis(p, ctx, "ko"), giftBasis(giftProfile(card), ctx, "ko"));
  assert.notEqual(giftBasis(p, ctx, "ko"), giftBasis(p, { ...ctx, occasion: { kind: "anniversary", label: "결혼기념일" } }, "ko"));
});

test("AI 요청 몸: 구조화 출력, 부르는 말·날·힌트·피할 것", () => {
  const body = ideasRequest(giftProfile(card), ctx, "ko", "m");
  assert.equal(body.text.format.type, "json_schema");
  assert.match(body.input, /CALL: 아빠/);
  assert.match(body.input, /OCCASION: 생일/);
  assert.match(body.input, /AVOID: 텀블러/);
  assert.match(body.input, /GIFT_CARD: no/);
});

test("AI 답 풀기: 겹치거나 빈 것, 피할 것이 든 것은 빼고 네 개까지", () => {
  const ideas = [
    { keyword: "캠핑 머그컵", reason: "캠핑 좋아해서" },
    { keyword: "캠핑  머그컵", reason: "또" },
    { keyword: "보온 텀블러", reason: "텀블러" },
    { keyword: "", reason: "빈칸" },
    { keyword: "튤립 꽃다발", reason: "튤립 좋아해서" },
    { keyword: "이솝 핸드크림", reason: "이솝 좋아해서" },
    { keyword: "등산 양말", reason: "등산 좋아해서" },
    { keyword: "마카롱 세트", reason: "마카롱 좋아해서" },
  ];
  const body = { output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: JSON.stringify({ ideas }) }] }] };
  assert.deepEqual(
    parseIdeas(body, ["텀블러"]).map((i) => i.keyword),
    ["캠핑 머그컵", "튤립 꽃다발", "이솝 핸드크림", "등산 양말"],
  );
  assert.deepEqual(parseIdeas({ output: [] }), []);
  assert.deepEqual(sanitizeIdeas("x"), []);
});

test("기록만으로 고르기: 해주고 싶은 선물이 먼저, 취미·향·꽃 순, 없으면 챙길 날 선물", () => {
  const ideas = ruleIdeas(card, ctx, "ko");
  assert.deepEqual(ideas.slice(0, 4), [
    { keyword: "블루투스 스피커", reason: "해주고 싶었던 선물" },
    { keyword: "캠핑 용품", reason: "캠핑 좋아해서" },
    { keyword: "등산 용품", reason: "등산 좋아해서" },
    { keyword: "우디 향수", reason: "우디 향 좋아해서" },
  ]);
  assert.deepEqual(ruleIdeas({}, ctx, "ko"), [{ keyword: "아빠 생일 선물", reason: "생일 선물로" }]);
  assert.deepEqual(ruleIdeas({}, { ...ctx, call: "아내", occasion: { kind: "anniversary", label: "결혼기념일" } }, "en"), [{ keyword: "아내 결혼기념일 선물", reason: "For your anniversary" }]);
  assert.ok(!ruleIdeas({ gifts: { giftCard: null, wishlist: [{ title: "보온 텀블러", url: "" }], skip: ["텀블러"], brands: [] } }, ctx, "ko").some((i) => i.keyword.includes("텀블러")));
});
