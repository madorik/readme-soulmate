import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalSubscription, parseSubscription, pushEndpointAllowed } from "../webpush-core";

const P256DH = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM"; // 87자(실제 구독 공개키 길이)
const AUTH = "tBHItJI5svbpez7KI4CCXg"; // 22자

test("푸시 서비스 주소: 알려진 https 호스트만", () => {
  for (const ok of [
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com/wp/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QWxs",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ]) assert.equal(pushEndpointAllowed(ok), true, ok);
  for (const bad of [
    "http://fcm.googleapis.com/fcm/send/abc", // https 아님
    "https://fcm.googleapis.com.evil.example/x", // 호스트가 다르다
    "https://evil.example/fcm.googleapis.com",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/x",
    "https://fcm.googleapis.com:8443/x", // 기본 포트가 아니다
    "https://user:pw@fcm.googleapis.com/x", // 아이디·비밀번호
    "https://notpush.apple.com.evil.example/x",
    "javascript:alert(1)",
    "",
    42,
    null,
  ]) assert.equal(pushEndpointAllowed(bad), false, String(bad));
});

test("구독 풀기: 모양이 맞아야 하고, 같은 구독은 키 순서와 상관없이 같은 글이 된다", () => {
  const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: P256DH, auth: AUTH } };
  const parsed = parseSubscription(JSON.stringify(sub));
  assert.deepEqual(parsed, sub);
  assert.deepEqual(parseSubscription(sub), sub);
  // 브라우저가 키를 다른 순서로 보내도 저장·비교 글은 같다
  const shuffled = JSON.stringify({ keys: { auth: AUTH, p256dh: P256DH }, endpoint: sub.endpoint, expirationTime: null });
  assert.equal(canonicalSubscription(parseSubscription(shuffled)!), canonicalSubscription(parsed!));
  // 틀린 것들
  assert.equal(parseSubscription("not json"), null);
  assert.equal(parseSubscription(null), null);
  assert.equal(parseSubscription({ endpoint: sub.endpoint }), null);
  assert.equal(parseSubscription({ endpoint: sub.endpoint, keys: { p256dh: "짧음", auth: AUTH } }), null);
  assert.equal(parseSubscription({ endpoint: sub.endpoint, keys: { p256dh: P256DH, auth: "x" } }), null);
  assert.equal(parseSubscription({ endpoint: "https://evil.example/x", keys: sub.keys }), null);
  // 저장해 둔 글이 아닌 토큰(앱 FCM 토큰 글)은 구독이 아니다
  assert.equal(parseSubscription("fAbC123:APA91bExample"), null);
});
