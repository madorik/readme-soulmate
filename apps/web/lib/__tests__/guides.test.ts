import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDES, GUIDE_BY_SLUG, bandFaq, guidePicks } from "../guides";

test("선물 가이드: 모든 가이드가 가격대별 선물을 갖고, 대상에 안 맞는 것은 빠진다", () => {
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length);
  for (const g of GUIDES) {
    const picks = guidePicks(g);
    assert.ok(picks.length >= 1, g.slug);
    for (const b of picks) assert.ok(b.items.length >= 1 && b.items.length <= 5, `${g.slug} ${b.band}`);
    assert.ok(g.answer.length > 40 && g.description.length > 30, g.slug);
  }
  const parents = guidePicks(GUIDE_BY_SLUG.get("parents")!);
  assert.equal(parents.length, 4);
  assert.ok(parents.every((b) => b.items.length === 5));
  assert.ok(!parents.flatMap((b) => b.items).some((x) => x.id === "lego" || x.id === "instant-camera"), "부모님 가이드에 20대 선물은 없다");
  const partner = guidePicks(GUIDE_BY_SLUG.get("partner")!).flatMap((b) => b.items);
  assert.ok(!partner.some((x) => x.tags.includes("효도")), "연인 가이드에 효도 선물은 없다");
  const coworkers = guidePicks(GUIDE_BY_SLUG.get("coworkers")!);
  assert.ok(!coworkers.some((b) => b.band === "10"), "직장 동료는 10만원 이상 없이");
});

test("선물 가이드 묻고 답하기: 가격대마다 한 질문, 답에 그 가격대 선물 이름", () => {
  const g = GUIDE_BY_SLUG.get("parents")!;
  const picks = guidePicks(g);
  const faq = bandFaq(g, picks);
  assert.equal(faq.length, picks.length);
  assert.equal(faq[2]!.q, "부모님 선물 5만원대로는 무엇이 좋을까요?");
  assert.ok(picks[2]!.items.every((x) => faq[2]!.a.includes(x.q)));
});
