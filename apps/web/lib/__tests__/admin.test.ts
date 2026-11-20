import assert from "node:assert/strict";
import { test } from "node:test";
import { adminEmails, isAdminAccount } from "../admin";

const verified = (email: string) => ({ email, emailVerified: true, isAnonymous: false });

test("환경변수가 없거나 비면 아무도 관리자가 아니다", () => {
  assert.deepEqual(adminEmails(undefined), []);
  assert.deepEqual(adminEmails(" , "), []);
  assert.equal(isAdminAccount(verified("a@x.com"), undefined), false);
  assert.equal(isAdminAccount(verified("a@x.com"), ""), false);
});

test("적어 둔 이메일이면 관리자(대소문자·공백 무시, 여러 개)", () => {
  assert.deepEqual(adminEmails("A@x.com, b@Y.com"), ["a@x.com", "b@y.com"]);
  assert.equal(isAdminAccount(verified("a@x.com"), "a@x.com"), true);
  assert.equal(isAdminAccount(verified("A@X.COM"), "a@x.com"), true);
  assert.equal(isAdminAccount(verified(" b@y.com "), "a@x.com, b@y.com"), true);
  assert.equal(isAdminAccount(verified("c@z.com"), "a@x.com, b@y.com"), false);
});

test("이메일이 비슷해도 완전히 같아야 한다", () => {
  assert.equal(isAdminAccount(verified("a@x.com.evil.io"), "a@x.com"), false);
  assert.equal(isAdminAccount(verified("aa@x.com"), "a@x.com"), false);
  assert.equal(isAdminAccount(verified("a@x.co"), "a@x.com"), false);
});

test("로그인 안 한 사람·데모(익명)·이메일 미확인은 같은 이메일이어도 아니다", () => {
  assert.equal(isAdminAccount(null, "a@x.com"), false);
  assert.equal(isAdminAccount(undefined, "a@x.com"), false);
  assert.equal(isAdminAccount({ email: "a@x.com", emailVerified: true, isAnonymous: true }, "a@x.com"), false);
  assert.equal(isAdminAccount({ email: "a@x.com", emailVerified: false, isAnonymous: false }, "a@x.com"), false);
  assert.equal(isAdminAccount({ email: "a@x.com", isAnonymous: false }, "a@x.com"), false);
  assert.equal(isAdminAccount({ email: "", emailVerified: true }, "a@x.com"), false);
});
