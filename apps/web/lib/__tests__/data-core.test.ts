import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { aad, openWith, sealWith } from "../crypto-core";
import { isLockedPayload, LIMITS } from "../data-core";

const keyA = randomBytes(32);
const keyB = randomBytes(32);
const scope = aad.card("u1", "safety");
const sealed = sealWith(keyA, { allergens: ["shrimp"] }, scope, true);

test("암호화돼 있고 지금 키로 풀리면 잠긴 값이 아니다", () => {
  assert.equal(isLockedPayload(sealed, (p) => openWith(keyA, p, scope)), false);
});

test("암호화돼 있는데 다른 키(키가 다른 환경)면 잠긴 값: 덮어쓰면 안 된다", () => {
  assert.equal(isLockedPayload(sealed, (p) => openWith(keyB, p, scope)), true);
});

test("다른 행에서 옮겨 붙은 값(범위가 다름)도 잠긴 값", () => {
  assert.equal(isLockedPayload(sealed, (p) => openWith(keyA, p, aad.card("u2", "safety"))), true);
});

test("값이 없거나 평문(data)이거나 암호문이 아닌 모양이면 덮어써도 된다", () => {
  const never = () => null;
  assert.equal(isLockedPayload(null, never), false);
  assert.equal(isLockedPayload(undefined, never), false);
  assert.equal(isLockedPayload("x", never), false);
  assert.equal(isLockedPayload({ v: 1, data: { a: 1 } }, never), false);
  assert.equal(isLockedPayload({ v: 1, data: null }, never), false);
  assert.equal(isLockedPayload({ v: 2, enc: sealed && "enc" in sealed ? sealed.enc : "" }, never), false);
  assert.equal(isLockedPayload({ v: 1, enc: 123 }, never), false);
  assert.equal(isLockedPayload({ v: 1, enc: "AAAA" }, never), false, "암호문이 되기엔 너무 짧다");
});

test("한도는 양의 정수", () => {
  for (const v of Object.values(LIMITS)) assert.ok(Number.isInteger(v) && v > 0);
});
