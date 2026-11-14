import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { aad, openWith, sealWith } from "../crypto-core";

const key = randomBytes(32);

test("암호화한 값은 같은 범위에서만 풀린다", () => {
  const data = { allergens: ["shrimp"], allergyNote: "국물도 안 돼요" };
  const sealed = sealWith(key, data, aad.card("u1", "safety"), true);
  assert.ok("enc" in sealed);
  assert.equal(JSON.stringify(sealed).includes("shrimp"), false, "저장 값에 내용이 보이지 않는다");
  assert.deepEqual(openWith(key, sealed, aad.card("u1", "safety")), data);
  assert.equal(openWith(key, sealed, aad.card("u2", "safety")), null, "다른 사람 행으로 옮기면 안 풀린다");
  assert.equal(openWith(key, sealed, aad.card("u1", "sizes")), null, "다른 항목으로 옮기면 안 풀린다");
  assert.equal(openWith(randomBytes(32), sealed, aad.card("u1", "safety")), null, "다른 키로는 안 풀린다");
});

test("조작된 값은 버린다", () => {
  const sealed = sealWith(key, { a: 1 }, "x", true) as { v: 1; enc: string };
  const raw = Buffer.from(sealed.enc, "base64");
  raw[raw.length - 1] = (raw[raw.length - 1] ?? 0) ^ 1;
  assert.equal(openWith(key, { v: 1, enc: raw.toString("base64") }, "x"), null);
  assert.equal(openWith(key, { v: 2, data: 1 }, "x"), null);
  assert.equal(openWith(key, "nope", "x"), null);
});

test("민감하지 않은 항목은 그대로 저장한다", () => {
  const sealed = sealWith(key, { birthday: null }, "x", false);
  assert.deepEqual(sealed, { v: 1, data: { birthday: null } });
  assert.deepEqual(openWith(key, sealed, "anything"), { birthday: null });
});
