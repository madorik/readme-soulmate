import assert from "node:assert/strict";
import { test } from "node:test";
import { demoEnabled } from "../demo-core";

test("데모로 둘러보기: 운영에서는 닫혀 있고, 개발·시험에서는 열려 있으며, 운영에서 켜려면 DEMO_ENABLED=1", () => {
  assert.equal(demoEnabled({ NODE_ENV: "production" }), false);
  assert.equal(demoEnabled({ NODE_ENV: "production", DEMO_ENABLED: "0" }), false);
  assert.equal(demoEnabled({ NODE_ENV: "production", DEMO_ENABLED: "true" }), false, "정확히 1일 때만");
  assert.equal(demoEnabled({ NODE_ENV: "production", DEMO_ENABLED: "1" }), true);
  assert.equal(demoEnabled({ NODE_ENV: "development" }), true);
  assert.equal(demoEnabled({ NODE_ENV: "test" }), true);
  assert.equal(demoEnabled({}), true);
});
