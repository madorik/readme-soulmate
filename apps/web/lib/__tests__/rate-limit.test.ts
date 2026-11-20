import assert from "node:assert/strict";
import { test } from "node:test";
import { isUuid } from "../uuid";

// rate-limit.ts는 server-only라 여기서 불러오지 않고, 같은 규칙의 순수 부분(uuid 검사)만 본다. 속도 제한 SQL은 db/tests에서 본다

test("uuid 모양: 8-4-4-4-12 16진수만", () => {
  assert.equal(isUuid("0b0c8f5e-3a4d-4c8e-9f1a-2b3c4d5e6f70"), true);
  assert.equal(isUuid("0B0C8F5E-3A4D-4C8E-9F1A-2B3C4D5E6F70"), true);
  for (const bad of ["", "abc", "------------------------------------", "0b0c8f5e3a4d4c8e9f1a2b3c4d5e6f70", "0b0c8f5e-3a4d-4c8e-9f1a-2b3c4d5e6f7", "0b0c8f5e-3a4d-4c8e-9f1a-2b3c4d5e6f70x", "g0b0c8f5e-3a4d-4c8e-9f1a-2b3c4d5e6f70", null, 1, {}]) {
    assert.equal(isUuid(bad), false, String(bad));
  }
});
