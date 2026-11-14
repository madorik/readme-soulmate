// 앱 아이콘·스플래시·스토어 그래픽을 만든다(시안 v2: 흰 종이, 남색 README, 빨간 펜 동그라미).
//   node apps/mobile/scripts/make-assets.mjs        (apps/web의 Playwright 크로미엄으로 그린다. 글꼴은 구글 폰트에서 받는다)
// 결과: Android mipmap·splash, iOS AppIcon·Splash, apps/mobile/store/(Play 아이콘 512, 그래픽 이미지 1024×500)
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const mobile = resolve(here, "..");
const { chromium } = createRequire(resolve(mobile, "../web/package.json"))("@playwright/test");

const INK = "#16224a";
const MARKER = "#e8352c";
const CIRCLE = "M14 58 C6 30 30 8 56 8 C82 8 96 30 93 54 C90 80 66 94 44 92 C20 90 4 72 10 46 C13 32 26 18 42 12";
const FONTS =
  '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Gothic+A1:wght@500;800;900&display=block" rel="stylesheet">';

/** 1024 기준 아이콘 그림: READ / ME 두 줄, ME에 빨간 펜 동그라미("나를 읽어 줘").
 *  scale: 내용 크기(1 = 꽉), shape: square(꽉 찬 사각)·rounded·circle·none(투명), px: 실제 그릴 크기(선 굵기 계산용) */
function iconSvg({ scale, shape, px }) {
  const bg =
    shape === "none" ? "" : shape === "circle" ? '<circle cx="512" cy="512" r="512" fill="#fff"/>' : shape === "rounded" ? '<rect width="1024" height="1024" rx="180" fill="#fff"/>' : '<rect width="1024" height="1024" fill="#fff"/>';
  const stroke = (px * 0.034 * scale).toFixed(2); // non-scaling-stroke는 화면 픽셀 기준
  const word = (y, text, size) =>
    `<text x="512" y="${y}" text-anchor="middle" font-family="Archivo" font-weight="800" font-stretch="80%" font-size="${size}" fill="${INK}" letter-spacing="-8">${text}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  ${bg}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${word(420, "READ", 330)}
    ${word(770, "ME", 330)}
    <g transform="translate(189 435) scale(6.5 4.42)"><path d="${CIRCLE}" fill="none" stroke="${MARKER}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g>
  </g>
</svg>`;
}

function page(body, w, h, bg = "transparent") {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}*{box-sizing:border-box}</style></head><body>${body}</body></html>`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const tab = await ctx.newPage();

async function render(html, w, h, file, { transparent = true } = {}) {
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(html, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, await tab.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } }));
}

async function icon(size, opts, file) {
  await render(page(iconSvg({ ...opts, px: size }), size, size), size, size, file, { transparent: opts.shape !== "square" });
}

// ── Android ──
const res = resolve(mobile, "android/app/src/main/res");
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  await icon(48 * k, { scale: 0.86, shape: "rounded" }, `${res}/mipmap-${d}/ic_launcher.png`);
  await icon(48 * k, { scale: 0.78, shape: "circle" }, `${res}/mipmap-${d}/ic_launcher_round.png`);
  // 적응형 아이콘 전경: 108dp 가운데 66dp 안쪽만 항상 보인다
  await icon(108 * k, { scale: 0.64, shape: "none" }, `${res}/mipmap-${d}/ic_launcher_foreground.png`);
}

// 스플래시: 흰 바탕 가운데 README(빨간 동그라미 없이 담백하게)
function splash(w, h) {
  const fs = Math.round(Math.min(w, h) * 0.16);
  return page(
    `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background:#fff"><span style="font-family:Archivo;font-weight:800;font-stretch:80%;letter-spacing:-0.02em;font-size:${fs}px;color:${INK}">README</span></div>`,
    w,
    h,
    "#fff",
  );
}
const SPLASH = {
  drawable: [480, 320],
  "drawable-land-mdpi": [480, 320],
  "drawable-land-hdpi": [800, 480],
  "drawable-land-xhdpi": [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280],
  "drawable-port-mdpi": [320, 480],
  "drawable-port-hdpi": [480, 800],
  "drawable-port-xhdpi": [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
};
for (const [dir, [w, h]] of Object.entries(SPLASH)) await render(splash(w, h), w, h, `${res}/${dir}/splash.png`, { transparent: false });

// ── iOS ── (앱 아이콘은 투명 없이 꽉 찬 사각, 모서리는 iOS가 깎는다)
const xc = resolve(mobile, "ios/App/App/Assets.xcassets");
await icon(1024, { scale: 0.84, shape: "square" }, `${xc}/AppIcon.appiconset/AppIcon-512@2x.png`);
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await render(splash(2732, 2732).replace(`font-size:${Math.round(2732 * 0.16)}px`, "font-size:260px"), 2732, 2732, `${xc}/Splash.imageset/${name}`, { transparent: false });
}

// ── Play 스토어 ──
const store = resolve(mobile, "store");
await icon(512, { scale: 0.84, shape: "square" }, `${store}/icon-512.png`);

// 그래픽 이미지 1024×500: 왼쪽 README와 한 줄 소개, 오른쪽 달력 한 줄에 빨간 동그라미
const days = [15, 16, 17, 18, 19, 20, 21];
const week = days
  .map((d, i) => {
    const color = i === 0 ? MARKER : i === 6 ? "#2a62d9" : INK;
    const circled = d === 21;
    return `<div style="position:relative;width:62px;display:flex;flex-direction:column;align-items:center;gap:6px">
      <span style="font-family:Archivo;font-weight:800;font-stretch:80%;font-size:44px;line-height:1;color:${circled ? MARKER : color}">${d}</span>
      ${circled ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;left:-9px;top:-11px;width:80px;height:64px;overflow:visible"><path d="${CIRCLE}" fill="none" stroke="${MARKER}" stroke-width="4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>` : ""}
      <span style="font-family:'Gothic A1';font-weight:800;font-size:15px;white-space:nowrap;margin-top:10px;color:${circled ? MARKER : "transparent"}">엄마 생신</span>
    </div>`;
  })
  .join("");
const feature = page(
  `<div style="width:1024px;height:500px;background:#fff;display:flex;align-items:center;padding:0 64px;gap:40px">
    <div style="flex:1;display:flex;flex-direction:column;gap:18px">
      <span style="font-family:Archivo;font-weight:800;font-stretch:80%;letter-spacing:-0.02em;font-size:96px;line-height:1;color:${INK}">README</span>
      <span style="font-family:'Gothic A1';font-weight:900;font-size:40px;letter-spacing:-0.04em;line-height:1.25;color:${INK}">말 안 해도<br>아는 사이처럼</span>
      <span style="font-family:'Gothic A1';font-weight:500;font-size:19px;color:#5d6480">소울메이트 컨닝페이퍼</span>
    </div>
    <div style="display:flex;gap:6px;padding:28px 18px 18px;border-top:2px solid #dadce4;border-bottom:2px solid #dadce4">${week}</div>
  </div>`,
  1024,
  500,
  "#fff",
);
await render(feature, 1024, 500, `${store}/feature-1024x500.png`, { transparent: false });

await browser.close();
console.log("done");
