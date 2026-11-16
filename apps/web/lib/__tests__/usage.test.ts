import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePeriod } from "../period";
import { channelOf, normalizePath, pageLabel, uaInfo } from "../usage";

test("화면 주소: 사람 id·토큰·쿼리를 지우고, 통계·API는 남기지 않는다", () => {
  assert.equal(normalizePath("/people/66e88902-1600-448b-a9e2-e17129846116/reminder?skip=a,b#picks"), "/people/:id/reminder");
  assert.equal(normalizePath("/people/66e88902-1600-448b-a9e2-e17129846116/edit/gifts"), "/people/:id/edit/:section");
  assert.equal(normalizePath("/g/2BuRMhGo"), "/g/:token");
  assert.equal(normalizePath("/r/abcDEF123_-xyz"), "/r/:token");
  assert.equal(normalizePath("/home/"), "/home");
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("/admin"), null);
  assert.equal(normalizePath("/api/e"), null);
  assert.equal(pageLabel("/people/:id/reminder"), "선물 힌트(선물 고르기)");
  assert.equal(pageLabel("/gifts/parents"), "선물 가이드 · parents");
});

test("유입 경로: utm → 인앱 브라우저 → 들어온 사이트 → 직접", () => {
  const base = { url: "https://remember-you.watalabs.com/", ua: "Mozilla/5.0 (iPhone) Safari/604.1", ownHost: "remember-you.watalabs.com" };
  assert.deepEqual(channelOf({ ...base, referrer: "" }), { source: "direct", ref: null, campaign: null });
  assert.deepEqual(channelOf({ ...base, referrer: "https://www.google.com/" }), { source: "google", ref: "www.google.com", campaign: null });
  assert.equal(channelOf({ ...base, referrer: "https://m.search.naver.com/search.naver?query=x" }).source, "naver");
  assert.equal(channelOf({ ...base, referrer: "https://remember-you.watalabs.com/home" }).source, "direct");
  assert.equal(channelOf({ ...base, referrer: "", ua: "Mozilla/5.0 (iPhone) KAKAOTALK 10.4.5" }).source, "kakaotalk");
  assert.equal(channelOf({ ...base, referrer: "https://some.example.org/x" }).source, "other");
  assert.deepEqual(channelOf({ ...base, url: "https://remember-you.watalabs.com/gifts?utm_source=Insta-Ad&utm_campaign=dec 2026!", referrer: "https://l.instagram.com/" }), {
    source: "insta_ad",
    ref: "l.instagram.com",
    campaign: "dec_2026_",
  });
});

test("기기: OS와 브라우저(앱·인앱 포함)", () => {
  assert.deepEqual(uaInfo("Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/131 Mobile Safari/537.36 ReadmeApp (android)"), { os: "android", browser: "app" });
  assert.deepEqual(uaInfo("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile/15E148 KAKAOTALK 10.4.5"), { os: "ios", browser: "kakaotalk" });
  assert.deepEqual(uaInfo("Mozilla/5.0 (Linux; Android 14; SM-S921N) SamsungBrowser/26.0 Chrome/122 Mobile Safari/537.36"), { os: "android", browser: "samsung" });
  assert.deepEqual(uaInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Version/18.0 Safari/605.1.15"), { os: "mac", browser: "safari" });
  assert.deepEqual(uaInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131 Safari/537.36 Edg/131"), { os: "windows", browser: "edge" });
  assert.deepEqual(uaInfo(null), { os: "other", browser: "other" });
});

test("통계 기간: 빠른 범위·직접 고른 날·이전 같은 길이 기간", () => {
  assert.deepEqual(parsePeriod({}, "2026-11-16"), { from: "2026-10-18", to: "2026-11-16", days: 30, prevFrom: "2026-09-18", prevTo: "2026-10-17" });
  assert.deepEqual(parsePeriod({ range: "7" }, "2026-11-16"), { from: "2026-11-10", to: "2026-11-16", days: 7, prevFrom: "2026-11-03", prevTo: "2026-11-09" });
  assert.deepEqual(parsePeriod({ range: "1" }, "2026-11-16"), { from: "2026-11-16", to: "2026-11-16", days: 1, prevFrom: "2026-11-15", prevTo: "2026-11-15" });
  assert.deepEqual(parsePeriod({ from: "2026-11-20", to: "2026-11-01" }, "2026-11-16"), { from: "2026-11-01", to: "2026-11-16", days: 16, prevFrom: "2026-10-16", prevTo: "2026-10-31" });
  assert.equal(parsePeriod({ from: "2024-01-01", to: "2026-11-16" }, "2026-11-16").days, 366);
  assert.equal(parsePeriod({ from: "bad", to: "2026-11-01" }, "2026-11-16").days, 30);
});
