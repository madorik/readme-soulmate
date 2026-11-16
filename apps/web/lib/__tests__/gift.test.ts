import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import type { PartialCard } from "@readme/core";
import { GIFT_CATALOG, PRICE_BANDS } from "../gift-catalog";
import {
  bandPicks,
  catalogRequest,
  defaultBand,
  eligibleCatalog,
  headWord,
  ruleCatalogPicks,
  sanitizeCatalogPicks,
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

test("선물 힌트: 기록 전체(사이즈 포함)와 메모, 사양·알레르기·안 마시는 술은 피할 것으로", () => {
  const p = giftProfile(card, ["11월 3일 작년 생일에 지갑 선물함", "  "]);
  assert.ok(p.hints.includes("취미: 캠핑, 등산"));
  assert.ok(p.hints.includes("좋아하는 브랜드: 이솝"));
  assert.ok(p.hints.some((h) => h.startsWith("좋아하는 향: 우디")));
  assert.ok(!p.hints.some((h) => h.includes("와인")), "안 마시면 술 종류는 넣지 않는다");
  assert.ok(p.hints.includes("사이즈(체형 참고): 상의 95, 신발 260mm"));
  assert.deepEqual(p.notes, ["11월 3일 작년 생일에 지갑 선물함"]);
  assert.deepEqual(p.wishes, ["블루투스 스피커"]);
  assert.ok(p.avoid.includes("텀블러") && p.avoid.includes("술") && p.avoid.some((a) => a.includes("알레르기")));
  assert.equal(p.giftCard, "no");
  assert.equal(giftBasis(p, ctx, "ko"), giftBasis(giftProfile(card, ["11월 3일 작년 생일에 지갑 선물함"]), ctx, "ko"));
  assert.notEqual(giftBasis(p, ctx, "ko"), giftBasis(giftProfile(card), ctx, "ko"), "메모가 바뀌면 다시 고른다");
  assert.notEqual(giftBasis(p, ctx, "ko"), giftBasis(p, { ...ctx, occasion: { kind: "anniversary", label: "결혼기념일" } }, "ko"));
});

test("AI 요청 몸: 구조화 출력, 부르는 말·날·힌트·피할 것", () => {
  const body = ideasRequest(giftProfile(card, ["허리가 아프대"]), ctx, "ko", "m");
  assert.match(body.input, /NOTES:\n- 허리가 아프대/);
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
    { keyword: "블루투스 스피커", reason: "아빠에게 해 주고 싶다고 적어 둔 바로 그 선물이에요" },
    { keyword: "캠핑 용품", reason: "캠핑을 좋아하는 아빠에게 잘 어울리는 선물이에요" },
    { keyword: "등산 용품", reason: "등산을 좋아하는 아빠에게 잘 어울리는 선물이에요" },
    { keyword: "우디 향수", reason: "우디 향을 좋아하는 아빠에게 잘 어울리는 선물이에요" },
  ]);
  assert.deepEqual(ruleIdeas({}, ctx, "ko"), [{ keyword: "아빠 생일 선물", reason: "아빠의 생일, 마음을 전하기 좋은 선물이에요" }]);
  assert.deepEqual(ruleIdeas({}, { ...ctx, call: "아내", occasion: { kind: "anniversary", label: "결혼기념일" } }, "en"), [{ keyword: "아내 결혼기념일 선물", reason: "A warm way to mark your anniversary" }]);
  assert.ok(!ruleIdeas({ gifts: { giftCard: null, wishlist: [{ title: "보온 텀블러", url: "" }], skip: ["텀블러"], brands: [] } }, ctx, "ko").some((i) => i.keyword.includes("텀블러")));
});

test("선물 목록: 링크·id·가격대가 바르다", () => {
  assert.ok(GIFT_CATALOG.length >= 80);
  assert.equal(new Set(GIFT_CATALOG.map((x) => x.id)).size, GIFT_CATALOG.length);
  assert.equal(new Set(GIFT_CATALOG.map((x) => x.url)).size, GIFT_CATALOG.length);
  for (const x of GIFT_CATALOG) {
    assert.match(x.url, /^https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9]+$/, x.id);
    assert.ok(x.ages[0] >= 20 && x.ages[1] <= 80 && x.ages[0] < x.ages[1], x.id);
  }
  for (const b of PRICE_BANDS) assert.ok(GIFT_CATALOG.filter((x) => x.band === b).length >= 15, b);
  assert.ok(GIFT_CATALOG.some((x) => x.ages[1] >= 80 && x.ages[0] >= 60), "70·80대 선물도 있다");
});

test("목록 고르기: 알레르기·나이·사양·안 마시는 술·메모에 이미 준 것은 뺀다", () => {
  assert.equal(headWord("가죽 지갑"), "지갑");
  assert.equal(headWord("핸드크림 선물세트"), "핸드크림");
  assert.equal(headWord("14K 귀걸이"), "귀걸이");
  const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const all = ids(eligibleCatalog(GIFT_CATALOG, {}, { ...ctx, age: null }));
  assert.equal(all.size, GIFT_CATALOG.length);
  const e = ids(eligibleCatalog(GIFT_CATALOG, { ...card, safety: { allergens: ["milk"], allergyNote: "", dislikes: [], diets: [] }, gifts: { giftCard: null, wishlist: [], skip: ["머그컵"], brands: [] } }, { ...ctx, age: 30 }, ["작년 생일에 지갑 선물함", "지갑 얘기는 그냥 메모"]));
  assert.ok(!e.has("cookie") && !e.has("chocolate"), "우유 알레르기");
  assert.ok(!e.has("radio") && !e.has("walking-shoes"), "30살에 효도 선물은 빼고");
  assert.ok(!e.has("camping-mug"), "사양하는 머그컵");
  assert.ok(!e.has("beer-glass") && !e.has("wine-glass") && !e.has("liquor"), "술 안 마심");
  assert.ok(!e.has("wallet"), "작년에 준 지갑");
  assert.ok(e.has("card-wallet") && e.has("bouquet"));
  const old = ids(eligibleCatalog(GIFT_CATALOG, {}, { ...ctx, age: 78 }));
  assert.ok(old.has("radio") && old.has("walking-shoes") && !old.has("instant-camera") && !old.has("earbuds"));
});

test("목록 고르기: 처음 가격대는 관계로, 기록만으로는 맞는 취미부터 가격대마다 둘", () => {
  assert.equal(defaultBand({ ...ctx, call: "김 과장", folders: ["회사"] }), "1");
  assert.equal(defaultBand({ ...ctx, call: "아내", folders: [] }), "5");
  assert.equal(defaultBand({ ...ctx, call: "엄마", folders: [] }), "5");
  assert.equal(defaultBand({ ...ctx, call: "민지", folders: ["친구들"] }), "3");
  const eligible = eligibleCatalog(GIFT_CATALOG, card, ctx);
  const picks = ruleCatalogPicks(card, ctx, "ko", eligible);
  assert.equal(picks.length, PRICE_BANDS.length * 2);
  const byId = new Map(GIFT_CATALOG.map((x) => [x.id, x]));
  for (const b of PRICE_BANDS) assert.equal(picks.filter((p) => byId.get(p.id)!.band === b).length, 2);
  assert.ok(picks.some((p) => /^(등산|캠핑)을 좋아하는 아빠에게/.test(p.reason)));
  // AI가 고른 게 모자라면 채우고, 고를 수 없는 것·한 가격대 셋째는 버린다
  const ai = sanitizeCatalogPicks(
    [
      { id: "camp-chair", reason: "캠핑 좋아해서" },
      { id: "no-such", reason: "x" },
      { id: "perfume", reason: "우디 향 좋아해서" },
      { id: "hand-drip", reason: "커피" },
    ],
    eligible,
  );
  assert.deepEqual(ai.map((p) => p.id), ["camp-chair", "perfume"]);
  const bands = bandPicks(ai, picks, eligible);
  assert.equal(bands.length, 4);
  assert.deepEqual(bands.find((b) => b.band === "5")!.items.slice(0, 2).map((i) => i.id), ["camp-chair", "perfume"]);
  const req = catalogRequest(giftProfile(card), ctx, "ko", "m", eligible.slice(0, 3));
  assert.deepEqual(req.text.format.schema.properties.picks.items.properties.id.enum, eligible.slice(0, 3).map((x) => x.id));
  assert.match(req.input, /CATALOG:\n/);
});
