import assert from "node:assert/strict";
import { test } from "node:test";
import { keepDays } from "../housekeeping-core";

test("보관 일수: 90 이상의 정수만, 아니면 180", () => {
  assert.equal(keepDays({}), 180);
  assert.equal(keepDays({ APP_EVENTS_KEEP_DAYS: "" }), 180);
  assert.equal(keepDays({ APP_EVENTS_KEEP_DAYS: "89" }), 180);
  assert.equal(keepDays({ APP_EVENTS_KEEP_DAYS: "90" }), 90);
  assert.equal(keepDays({ APP_EVENTS_KEEP_DAYS: "365" }), 365);
  assert.equal(keepDays({ APP_EVENTS_KEEP_DAYS: "1.5" }), 180);
  assert.equal(keepDays({ APP_EVENTS_KEEP_DAYS: "abc" }), 180);
});
