// 앱 아이콘·스플래시·스토어 그래픽을 만든다(기억해유 아이콘: 망고 그라데이션 위에 하트를 그린 메모와 연필 — 누군가를 챙기려고 메모에 적는 앱. 스플래시·그래픽 글자는 남색 기억해유).
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
  '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Gothic+A1:wght@500;800;900&family=Noto+Sans+KR:wght@800;900&display=block" rel="stylesheet">';

/** 1024 기준 아이콘 그림: 하트를 그린 메모(접힌 모서리) + 비스듬한 연필. 선은 앱 캐릭터처럼 굵은 남색 */
const LINE = `stroke="#1F2340" stroke-linejoin="round" stroke-linecap="round"`;
const ICON_ART = `
  <g transform="rotate(-6 480 520)">
    <path d="M220 210 H640 L770 340 V800 Q770 850 720 850 H270 Q220 850 220 800 Z" fill="#fff" ${LINE} stroke-width="42"/>
    <path d="M640 210 V300 Q640 340 680 340 H770" fill="#FFC23D" ${LINE} stroke-width="42"/>
    <path d="M495 470 C445 400 340 430 360 520 C375 590 450 630 495 680 C540 630 615 590 630 520 C650 430 545 400 495 470 Z" fill="#FF7A8A" ${LINE} stroke-width="38"/>
  </g>
  <g transform="rotate(38 760 640)">
    <rect x="700" y="380" width="120" height="430" rx="18" fill="#FFC23D" ${LINE} stroke-width="38"/>
    <path d="M700 810 L760 920 L820 810 Z" fill="#FFE7C2" ${LINE} stroke-width="38"/>
    <path d="M742 885 L760 920 L778 885 Z" fill="#1F2340"/>
    <rect x="700" y="340" width="120" height="70" rx="16" fill="#FF7A8A" ${LINE} stroke-width="38"/>
  </g>`;
const GRAD = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1C2"/><stop offset="0.55" stop-color="#FFD66B"/><stop offset="1" stop-color="#FFC23D"/></linearGradient></defs>`;

/** scale: 그림 크기(1 = 원래), shape: square(꽉 찬 사각)·rounded·circle·none(투명, 안드로이드 적응형 전경) */
function iconSvg({ scale, shape }) {
  const bg =
    shape === "none" ? "" : shape === "circle" ? '<circle cx="512" cy="512" r="512" fill="url(#bg)"/>' : shape === "rounded" ? '<rect width="1024" height="1024" rx="180" fill="url(#bg)"/>' : '<rect width="1024" height="1024" fill="url(#bg)"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  ${GRAD}
  ${bg}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -530)">${ICON_ART}</g>
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
  await icon(48 * k, { scale: 0.96, shape: "rounded" }, `${res}/mipmap-${d}/ic_launcher.png`);
  await icon(48 * k, { scale: 0.86, shape: "circle" }, `${res}/mipmap-${d}/ic_launcher_round.png`);
  // 적응형 아이콘 전경: 108dp 가운데 66dp 안쪽만 항상 보인다(배경은 drawable/ic_launcher_bg.xml 그라데이션)
  await icon(108 * k, { scale: 0.6, shape: "none" }, `${res}/mipmap-${d}/ic_launcher_foreground.png`);
}

// 스플래시: 흰 바탕 가운데 기억해유
function splash(w, h) {
  const fs = Math.round(Math.min(w, h) * 0.16);
  return page(
    `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;background:#fff"><span style="font-family:'Noto Sans KR';font-weight:900;letter-spacing:-0.04em;font-size:${fs}px;color:${INK}">기억해유</span></div>`,
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
await icon(1024, { scale: 1, shape: "square" }, `${xc}/AppIcon.appiconset/AppIcon-512@2x.png`);
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await render(splash(2732, 2732).replace(`font-size:${Math.round(2732 * 0.16)}px`, "font-size:260px"), 2732, 2732, `${xc}/Splash.imageset/${name}`, { transparent: false });
}

// ── Play 스토어 ──
const store = resolve(mobile, "store");
await icon(512, { scale: 1, shape: "square" }, `${store}/icon-512.png`);

// ── 웹(파비콘·홈 화면 추가): Next 파일 규칙 app/icon.png · app/apple-icon.png ──
const webApp = resolve(mobile, "../web/app");
await icon(512, { scale: 1, shape: "rounded" }, `${webApp}/icon.png`);
await icon(180, { scale: 1, shape: "square" }, `${webApp}/apple-icon.png`);

// 그래픽 이미지 1024×500: 왼쪽 기억해유와 한 줄 소개, 오른쪽 달력 한 줄에 빨간 동그라미(날짜에만)
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
      <span style="font-family:'Noto Sans KR';font-weight:900;letter-spacing:-0.04em;font-size:88px;line-height:1;color:${INK}">기억해유</span>
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
