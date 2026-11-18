import assert from "node:assert/strict";
import { test } from "node:test";
import { fcmTokenGone } from "../push-core";

const fcm = (errorCode: string, extra: Record<string, unknown> = {}) => ({ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode, ...extra });

test("404는 더 못 쓰는 토큰", () => {
  assert.equal(fcmTokenGone(404, null), true);
  assert.equal(fcmTokenGone(404, { error: { status: "NOT_FOUND", details: [fcm("UNREGISTERED")] } }), true);
});

test("400 + UNREGISTERED는 더 못 쓰는 토큰", () => {
  assert.equal(fcmTokenGone(400, { error: { code: 400, details: [fcm("UNREGISTERED")] } }), true);
});

test("400 + INVALID_ARGUMENT가 등록 토큰(message.token)을 짚으면 못 쓰는 토큰", () => {
  const body = {
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "The registration token is not a valid FCM registration token",
      details: [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field: "message.token" }] }, fcm("INVALID_ARGUMENT")],
    },
  };
  assert.equal(fcmTokenGone(400, body), true);
  // 필드 정보 없이 메시지만 토큰을 말해도
  assert.equal(fcmTokenGone(400, { error: { message: "The registration token is not a valid FCM registration token", details: [fcm("INVALID_ARGUMENT")] } }), true);
});

test("400이라도 알림 내용·데이터 오류는 멀쩡한 토큰이니 지우지 않는다", () => {
  const payload = {
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      message: "Invalid value at 'message.data[0].value'",
      details: [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field: "message.data[0].value" }] }, fcm("INVALID_ARGUMENT")],
    },
  };
  assert.equal(fcmTokenGone(400, payload), false);
  assert.equal(fcmTokenGone(400, null), false);
  assert.equal(fcmTokenGone(400, {}), false);
  assert.equal(fcmTokenGone(400, { error: { details: "x" } }), false);
});

test("그 밖의 상태(401·403·429·5xx)는 토큰 문제가 아니다", () => {
  for (const status of [401, 403, 429, 500, 503]) assert.equal(fcmTokenGone(status, { error: { details: [fcm("UNREGISTERED")] } }), false);
});
