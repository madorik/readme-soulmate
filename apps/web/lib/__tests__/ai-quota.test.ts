import assert from "node:assert/strict";
import { test } from "node:test";
import { AI_DEFAULTS, aiLimits, isAiGate, isMissingQuotaTable } from "../ai-quota-core";

test("환경 변수가 없으면 기본 한도", () => {
  assert.deepEqual(aiLimits("capture", false, {}), { user: AI_DEFAULTS.capture, global: AI_DEFAULTS.global });
  assert.deepEqual(aiLimits("gift", false, {}), { user: AI_DEFAULTS.gift, global: AI_DEFAULTS.global });
  // 메모 가져오기: 하루 5번, 환경 변수로 바꾼다(데모 계정도 5번을 넘지 못한다)
  assert.deepEqual(aiLimits("import", false, {}), { user: 5, global: AI_DEFAULTS.global });
  assert.equal(aiLimits("import", false, { AI_IMPORT_DAILY_LIMIT: "2" }).user, 2);
  assert.equal(aiLimits("import", true, { AI_IMPORT_DAILY_LIMIT: "50" }).user, AI_DEFAULTS.demo);
});

test("데모(익명) 계정은 종류별 한도와 데모 한도 중 낮은 쪽", () => {
  assert.equal(aiLimits("capture", true, {}).user, AI_DEFAULTS.demo);
  assert.equal(aiLimits("gift", true, {}).user, AI_DEFAULTS.demo);
  assert.equal(aiLimits("capture", true, { AI_CAPTURE_DAILY_LIMIT: "3" }).user, 3);
  assert.equal(aiLimits("capture", true, { AI_DEMO_DAILY_LIMIT: "0" }).user, 0);
  assert.equal(aiLimits("capture", true, { AI_DEMO_DAILY_LIMIT: "100" }).user, AI_DEFAULTS.capture);
});

test("환경 변수로 바꾼다. 0은 그 기능을 막는다", () => {
  const env = { AI_CAPTURE_DAILY_LIMIT: "10", AI_GIFT_DAILY_LIMIT: "0", AI_GLOBAL_DAILY_LIMIT: "500" };
  assert.deepEqual(aiLimits("capture", false, env), { user: 10, global: 500 });
  assert.deepEqual(aiLimits("gift", false, env), { user: 0, global: 500 });
});

test("이상한 값(빈 칸·음수·소수·글자)은 기본값으로", () => {
  for (const bad of ["", "  ", "-1", "1.5", "abc", "NaN"]) {
    assert.equal(aiLimits("capture", false, { AI_CAPTURE_DAILY_LIMIT: bad }).user, AI_DEFAULTS.capture, JSON.stringify(bad));
    assert.equal(aiLimits("capture", false, { AI_GLOBAL_DAILY_LIMIT: bad }).global, AI_DEFAULTS.global, JSON.stringify(bad));
  }
});

test("함수가 돌려주는 값만 받는다", () => {
  assert.ok(isAiGate("ok") && isAiGate("user_limit") && isAiGate("global_limit"));
  assert.ok(!isAiGate("error") && !isAiGate(null) && !isAiGate("OK"));
});

test("표·함수가 없는 오류만 마이그레이션 전으로 본다", () => {
  assert.ok(isMissingQuotaTable({ code: "42P01" }));
  assert.ok(isMissingQuotaTable({ code: "42883" }));
  assert.ok(!isMissingQuotaTable({ code: "57014" }));
  assert.ok(!isMissingQuotaTable(new Error("boom")));
  assert.ok(!isMissingQuotaTable(null));
});
