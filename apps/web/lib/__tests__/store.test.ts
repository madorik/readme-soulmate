import assert from "node:assert/strict";
import test from "node:test";
import { playPublic, storeTarget } from "../store";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148";
const ANDROID = "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36";
const PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36";

test("앱 받기: Play가 공개되기 전에는 안드로이드·PC도 막다른 길 대신 웹(next)으로", () => {
  const before = process.env.PLAY_PUBLIC;
  delete process.env.PLAY_PUBLIC;
  try {
    assert.equal(playPublic(), false);
    assert.deepEqual(storeTarget(ANDROID, { source: "answer", next: "/request" }), { url: "/request", os: "android" });
    assert.deepEqual(storeTarget(PC, { source: "share", next: "/" }), { url: "/", os: "other" });
    // 아이폰은 그대로: App Store 주소가 있으면 거기, 없으면 웹
    assert.equal(storeTarget(IPHONE, { source: "share", next: "/", appStore: "https://apps.apple.com/kr/app/id1" }).url, "https://apps.apple.com/kr/app/id1");
    assert.equal(storeTarget(IPHONE, { source: "answer", next: "/request" }).url, "/request");
  } finally {
    if (before === undefined) delete process.env.PLAY_PUBLIC;
    else process.env.PLAY_PUBLIC = before;
  }
});

test("앱 받기: PLAY_PUBLIC=1이면 안드로이드·PC는 Play 스토어(출처 utm 포함)", () => {
  const before = process.env.PLAY_PUBLIC;
  process.env.PLAY_PUBLIC = "1";
  try {
    assert.equal(playPublic(), true);
    const t = storeTarget(ANDROID, { source: "answer", next: "/request" });
    assert.equal(t.os, "android");
    assert.match(t.url, /^https:\/\/play\.google\.com\/store\/apps\/details\?id=kr\.readme\.app&referrer=utm_source%3Danswer/);
    assert.equal(storeTarget(PC, { source: "share", next: "/" }).os, "other");
  } finally {
    if (before === undefined) delete process.env.PLAY_PUBLIC;
    else process.env.PLAY_PUBLIC = before;
  }
});
