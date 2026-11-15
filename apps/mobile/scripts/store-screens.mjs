// Play 스토어 휴대폰 스크린샷(1080×1920, 9:16). 운영 사이트의 데모 계정으로 찍는다(데모 계정은 7일 뒤 지워진다).
//   node apps/mobile/scripts/store-screens.mjs [사이트 주소=https://remember-you.watalabs.com]
// 결과: apps/mobile/store/screens/{ko,en}/01-….png
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const mobile = resolve(here, "..");
const { chromium } = createRequire(resolve(mobile, "../web/package.json"))("@playwright/test");
const SITE = (process.argv[2] || "https://remember-you.watalabs.com").replace(/\/+$/, "");

const browser = await chromium.launch();
for (const lang of ["ko", "en"]) {
  const out = resolve(mobile, "store/screens", lang);
  mkdirSync(out, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: lang === "ko" ? "ko-KR" : "en-US",
    timezoneId: "Asia/Seoul",
  });
  const page = await ctx.newPage();
  const shot = async (name) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}.png` });
  };
  const L = (ko, en) => (lang === "ko" ? ko : en);

  await page.goto(`${SITE}/`, { waitUntil: "networkidle" });
  await shot("06-start");
  await page.getByRole("button", { name: L("데모로 둘러보기", "Try the demo") }).click();
  await page.waitForURL(/\/home/);
  await page.waitForLoadState("networkidle");
  await shot("01-home");

  // 아내(지수): 알레르기에 빨간 동그라미
  await page.getByRole("link", { name: new RegExp(L("아내", "Wife")) }).first().click();
  await page.waitForURL(/\/people\//);
  await page.waitForLoadState("networkidle");
  await shot("02-person");

  // 엄마 생일 선물 고르기(음력 생일 알림)
  await page.goto(`${SITE}/home`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: L("선물 힌트 보기", "See gift hints") }).first().click();
  await page.waitForURL(/\/reminder/);
  await page.waitForLoadState("networkidle");
  await shot("03-reminder");

  await page.goto(`${SITE}/me`, { waitUntil: "networkidle" });
  await shot("04-me");

  await page.goto(`${SITE}/request`, { waitUntil: "networkidle" });
  await shot("05-request");
  await ctx.close();
}
await browser.close();
console.log("done");
