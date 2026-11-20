// 앱 아이콘·실행(스플래시) 화면·스토어 그래픽을 만든다.
//   아이콘: C안 '흘끔 다이어리' — 크림 바탕에서 망고 눈꺼풀의 눈 둘이 오른쪽 테이프 붙은 종이 쪽지(분홍 하트, 파란 줄)를 흘끔 본다
//   실행 화면: 크림(#FBF6EA) 단색 + 가운데 큰 '기억해U' 로고(정지판). 앱이 켜지면 웹이 같은 자리에 움직이는 로딩 덮개를 이어 받는다(apps/web/components/LaunchOverlay.tsx, app/globals.css의 .ry-*)
//   node apps/mobile/scripts/make-assets.mjs        (apps/web의 Playwright 크로미엄으로 그린다. 로고 글꼴은 저장소 안 파일, 그래픽 이미지 글꼴만 구글 폰트에서 받는다)
// 결과: Android mipmap(아이콘)·drawable(스플래시)·iOS AppIcon·Splash 이미지·apps/mobile/store/(Play 아이콘 512, 그래픽 이미지 1024×500)·웹 app/icon.png·apple-icon.png
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const mobile = resolve(here, "..");
const { chromium } = createRequire(resolve(mobile, "../web/package.json"))("@playwright/test");

const INK = "#1F2340";
const CREAM = "#FBF6EA";
const MANGO = "#FFC23D";
const MANGO_DEEP = "#E09A12";
const MUTED = "#5B5F78";

// 로고 글자(기억해)는 앱과 같은 손글씨체(Poor Story)에서 로고 글자만 담은 파일(app/wordmark.css)
const WORDMARK_FONT = readFileSync(resolve(mobile, "../web/public/fonts/wordmark/poor-story-6358b45d.woff2")).toString("base64");
const WORDMARK_CSS = `@font-face{font-family:"Wordmark Hand";font-weight:400;src:url(data:font/woff2;base64,${WORDMARK_FONT}) format("woff2")}`;
const GOOGLE_FONTS = '<link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Poor+Story&display=block" rel="stylesheet">';

// ───────────────────────── 아이콘(C안) ─────────────────────────
/**
 * 아이콘 그림(100×100 기준, 1024에서는 10.24배): 시안 Icon-Concepts C · 흘끔 다이어리 그대로.
 * 쪽지는 종이 + 파란 줄 + 분홍 하트 + 망고 테이프, 눈은 반쯤 내린 망고 눈꺼풀. 선은 굵은 남색
 */
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
const HEART = "M12 20 C4 14 2 9 5.5 6.5 C8 4.7 11 6 12 8.5 C13 6 16 4.7 18.5 6.5 C22 9 20 14 12 20 Z";
const STAR = "M12 3 L14.2 9 L20.5 9.3 L15.5 13.2 L17.3 19.5 L12 15.8 L6.7 19.5 L8.5 13.2 L3.5 9.3 L9.8 9 Z";
const ART = {
  paper: "M62 29 H83 Q86 29 86 32 V73 Q86 76 83 76 H62 Q59 76 59 73 V32 Q59 29 62 29 Z",
  lines: "M64 56 H80.5 M64 63 H80.5 M64 70 H73",
  heartT: "translate(65.9 36.1) scale(0.55)",
  tape: { x: 60.5, y: 23, w: 24, h: 9, t: "rotate(-4 72.5 27.5)" },
  eyes: `${ell(23, 51, 9.5, 11.5)} ${ell(43, 51, 9.5, 11.5)}`,
  pupils: `${ell(26.6, 53.6, 5.4, 5.4)} ${ell(46.6, 53.6, 5.4, 5.4)}`,
  shine: `${ell(28.3, 51.3, 1.8, 1.8)} ${ell(48.3, 51.3, 1.8, 1.8)}`,
  lids: "M13.6 48 A9.5 11.5 0 0 1 32.4 48 Q23 50.5 13.6 48 Z M33.6 48 A9.5 11.5 0 0 1 52.4 48 Q43 50.5 33.6 48 Z",
  blush: `${ell(19, 66, 4.6, 2.6)} ${ell(47, 66, 4.6, 2.6)}`,
  wrap: "translate(50 52) scale(1.04) translate(-50 -51.5)",
};
/** 색: 기본(크림 바탕)·다크(남색 바탕)·틴트(iOS가 색을 입히는 회색조) */
const PAL = {
  light: { bg: ["#FDF3DA", "#FDF3DA", "#FDF3DA"], ink: INK, eye: "#FFFFFF", paper: "#FFFDF7", lines: "#9DB0E0", heart: "#F59BAE", tape: MANGO, lid: MANGO, blush: "#F59BAE" },
  dark: { bg: ["#2E3360", "#20244A", "#14172E"], ink: INK, eye: "#FFFFFF", paper: "#FFFDF7", lines: "#9DB0E0", heart: "#F59BAE", tape: MANGO, lid: MANGO, blush: "#F59BAE" },
  tinted: { bg: ["#1C1C1C", "#101010", "#000000"], ink: "#111111", eye: "#EDEDED", paper: "#EDEDED", lines: "#8A8A8A", heart: "#8A8A8A", tape: "#BDBDBD", lid: "#BDBDBD", blush: null },
};
function iconArt(p) {
  const line = `stroke="${p.ink}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"`;
  const t = ART.tape;
  return `<g transform="${ART.wrap}">
    <g transform="rotate(-6 72 51)">
      <path d="${ART.paper}" fill="${p.paper}" ${line}/>
      <path d="${ART.lines}" fill="none" stroke="${p.lines}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="${HEART}" transform="${ART.heartT}" fill="${p.heart}" stroke="${p.ink}" stroke-width="3.2" stroke-linejoin="round"/>
      <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" transform="${t.t}" fill="${p.tape}"/>
    </g>
    <path d="${ART.eyes}" fill="${p.eye}" ${line}/>
    <path d="${ART.pupils}" fill="${p.ink}"/>
    <path d="${ART.shine}" fill="${p.eye}"/>
    ${p.blush ? `<path d="${ART.blush}" fill="${p.blush}" fill-opacity="0.85"/>` : ""}
    <path d="${ART.lids}" fill="${p.lid}" ${line}/>
  </g>`;
}
/** 안드로이드 테마 아이콘(단색): 불투명한 곳만 시스템 색으로 칠해진다. 종이·눈 테두리·눈동자·눈꺼풀은 채우고, 글씨 줄·하트·반짝임은 뚫고, 테이프는 반투명 */
const MONO_ART = `<defs><mask id="mono" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
    <rect width="100" height="100" fill="black"/>
    <g transform="${ART.wrap}">
      <g transform="rotate(-6 72 51)">
        <path d="${ART.paper}" fill="white"/>
        <path d="${ART.lines}" fill="none" stroke="black" stroke-width="2.8" stroke-linecap="round"/>
        <path d="${HEART}" transform="${ART.heartT}" fill="black"/>
        <rect x="${ART.tape.x}" y="${ART.tape.y}" width="${ART.tape.w}" height="${ART.tape.h}" transform="${ART.tape.t}" fill="#808080"/>
      </g>
      <path d="${ART.eyes}" fill="none" stroke="white" stroke-width="3.4"/>
      <path d="${ART.pupils}" fill="white"/>
      <path d="${ART.shine}" fill="black"/>
      <path d="${ART.lids}" fill="white" stroke="white" stroke-width="3.4" stroke-linejoin="round"/>
    </g>
  </mask></defs>
  <rect width="100" height="100" fill="#000000" mask="url(#mono)"/>`;

/** scale: 그림 크기(1 = 원래), shape: square(꽉 찬 사각)·rounded·circle·none(투명, 안드로이드 적응형 전경), pal: 색, mono: 단색 레이어 */
function iconSvg({ scale, shape, pal = "light", mono = false }) {
  const p = PAL[pal];
  const grad = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="0.55" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/></linearGradient></defs>`;
  const bg =
    shape === "none" ? "" : shape === "circle" ? '<circle cx="512" cy="512" r="512" fill="url(#bg)"/>' : shape === "rounded" ? '<rect width="1024" height="1024" rx="229" fill="url(#bg)"/>' : '<rect width="1024" height="1024" fill="url(#bg)"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  ${grad}
  ${bg}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)"><g transform="scale(10.24)">${mono ? MONO_ART : iconArt(p)}</g></g>
</svg>`;
}

// ───────────────────────── 로고(기억해U)와 실행 화면 ─────────────────────────
/**
 * 로고 덩어리(CSS px 기준, 시안 Splash-Static 구도): 큰 '기억해' + 손그림 U(점 둘) 아래 망고 물결선, 둘레에 별·하트.
 * 웹의 움직이는 로딩 덮개(components/LaunchOverlay.tsx + .ry-* 스타일)와 크기·모양이 같아야 한다 — 고치면 둘을 같이 고친다
 */
const LOGO_CSS = `${WORDMARK_CSS}
.ry-stack{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;font-family:"Wordmark Hand",sans-serif;font-weight:400;color:${INK}}
.ry-word{font-size:56px;line-height:1;letter-spacing:-0.01em;-webkit-text-stroke:1px ${INK};display:inline-flex;align-items:flex-end}
.ry-word svg.u{flex-shrink:0;margin:0 0 5px 3px}
.ry-deco{position:absolute}`;
function logoStack({ word = "기억해", decor = true } = {}) {
  return `<div class="ry-stack">
    <span class="ry-word">${word}<svg class="u" viewBox="0 0 26 34" width="44" height="58" aria-hidden="true"><circle cx="4.4" cy="3.6" r="2.4" fill="currentColor"/><circle cx="22.3" cy="3.6" r="2.4" fill="currentColor"/><path d="M4.2 10.6 C3.8 18.5 4.3 24 6.6 27.6 C8.6 30.6 11 31.8 13.4 31.8 C15.8 31.8 18.2 30.6 20.2 27.6 C22.5 24 22.9 18.5 22.5 10.2" fill="none" stroke="currentColor" stroke-width="3.1" stroke-linecap="round"/></svg></span>
    <svg viewBox="0 0 200 14" width="200" height="14" fill="none" stroke="${MANGO_DEEP}" stroke-width="3" stroke-linecap="round" aria-hidden="true" style="display:block"><path d="M3 8 C 15 1, 27 14, 40 7 S 65 1, 78 8 S 103 14, 116 7 S 141 1, 154 8 S 179 14, 197 6"/></svg>
    ${
      decor
        ? `<svg class="ry-deco" viewBox="0 0 24 24" width="26" height="26" fill="${MANGO}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="right:-30px;top:-34px;transform:rotate(14deg)"><path d="${STAR}"/></svg>
    <svg class="ry-deco" viewBox="0 0 24 24" width="28" height="28" fill="#F59BAE" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="left:-34px;bottom:-14px;transform:rotate(-14deg)"><path d="${HEART}"/></svg>
    <svg class="ry-deco" viewBox="0 0 24 24" width="18" height="18" fill="#8FD2EC" stroke="${INK}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="right:-24px;bottom:-10px;transform:rotate(10deg)"><path d="${STAR}"/></svg>`
        : ""
    }
  </div>`;
}
function page(body, w, h, { bg = "transparent", fonts = false } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8">${fonts ? GOOGLE_FONTS : ""}<style>${LOGO_CSS}html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}*{box-sizing:border-box}</style></head><body>${body}</body></html>`;
}

/**
 * 실행 화면 한 장: 로고 덩어리가 한가운데에서 dy(pt)만큼 위(웹 덮개와 같게 기본 -24), opaque: 크림 바탕을 깔지(false면 투명)
 */
function sceneHtml({ w, h, k, dy = -24, scale = 1, decor = true, opaque = true, word = "기억해" }) {
  const bg = opaque ? `background:${CREAM}` : "";
  return page(
    `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;${bg}"><div style="transform:translateY(${dy * k}px) scale(${k * scale})">${logoStack({ word, decor })}</div></div>`,
    w,
    h,
  );
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
  await render(page(iconSvg(opts), size, size), size, size, file, { transparent: opts.shape !== "square" });
}

// ── Android 아이콘 ──
const res = resolve(mobile, "android/app/src/main/res");
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  await icon(48 * k, { scale: 0.96, shape: "rounded" }, `${res}/mipmap-${d}/ic_launcher.png`);
  await icon(48 * k, { scale: 0.86, shape: "circle" }, `${res}/mipmap-${d}/ic_launcher_round.png`);
  // 적응형 아이콘 전경: 108dp 가운데 66dp 안쪽만 항상 보인다(배경은 drawable/ic_launcher_bg.xml 크림 한 색)
  await icon(108 * k, { scale: 0.64, shape: "none" }, `${res}/mipmap-${d}/ic_launcher_foreground.png`);
  // 테마 아이콘(안드로이드 13+): 같은 자리의 단색 레이어
  await icon(108 * k, { scale: 0.64, shape: "none", mono: true }, `${res}/mipmap-${d}/ic_launcher_monochrome.png`);
}

// ── Android 실행 화면 ──
// 안드로이드 12+ 시스템 스플래시는 크림 바탕(styles.xml의 windowSplashScreenBackground) 가운데에 이 그림(drawable-nodpi/splash_icon.png)을 놓는다.
// 아이콘 자리는 288dp 정사각의 가운데 지름 192dp 원 안만 보이므로, 로고를 그 안에 들어가게 줄이고(0.84) 한가운데에 둔다 — 웹 덮개도 안드로이드 앱에서는 같은 크기·자리(.ry-boot[data-os=android])
const ANDROID_SPLASH_SCALE = 0.84;
await render(sceneHtml({ w: 1152, h: 1152, k: 4, decor: false, dy: 0, scale: ANDROID_SPLASH_SCALE, opaque: false }), 1152, 1152, `${res}/drawable-nodpi/splash_icon.png`, { transparent: true });
// 그림이 없는 쪽을 위한 옛 방식 스플래시 그림(가로·세로 모두 한 장씩, 화면에 꽉 차게 늘려 그린다)
const SPLASH = {
  drawable: [480, 320, 1],
  "drawable-land-mdpi": [480, 320, 1],
  "drawable-land-hdpi": [800, 480, 1.5],
  "drawable-land-xhdpi": [1280, 720, 2],
  "drawable-land-xxhdpi": [1600, 960, 3],
  "drawable-land-xxxhdpi": [1920, 1280, 4],
  "drawable-port-mdpi": [320, 480, 1],
  "drawable-port-hdpi": [480, 800, 1.5],
  "drawable-port-xhdpi": [720, 1280, 2],
  "drawable-port-xxhdpi": [960, 1600, 3],
  "drawable-port-xxxhdpi": [1280, 1920, 4],
};
for (const [dir, [w, h, k]] of Object.entries(SPLASH)) await render(sceneHtml({ w, h, k }), w, h, `${res}/${dir}/splash.png`, { transparent: false });

// ── iOS 아이콘 ── (앱 아이콘은 투명 없이 꽉 찬 사각, 모서리는 iOS가 깎는다)
const xc = resolve(mobile, "ios/App/App/Assets.xcassets");
await icon(1024, { scale: 1, shape: "square" }, `${xc}/AppIcon.appiconset/AppIcon-512@2x.png`);
// iOS 다크·틴트 모양(Contents.json의 appearances)
await icon(1024, { scale: 1, shape: "square", pal: "dark" }, `${xc}/AppIcon.appiconset/AppIcon-dark.png`);
await icon(1024, { scale: 1, shape: "square", pal: "tinted" }, `${xc}/AppIcon.appiconset/AppIcon-tinted.png`);

// ── iOS 실행 화면 ── LaunchScreen.storyboard: 크림 바탕 한 색 + 로고 그림(SplashLogo, 3배 그림 하나)
//   로고 덩어리(별·하트 포함) 280×170pt, 가운데를 화면 한가운데에서 24pt 위에 맞춘다(웹 덮개와 같은 자리)
await render(sceneHtml({ w: 840, h: 510, k: 3, dy: 0, opaque: false }), 840, 510, `${xc}/SplashLogo.imageset/splash-logo@3x.png`, { transparent: true });

// ── Play 스토어 ──
const store = resolve(mobile, "store");
await icon(512, { scale: 1, shape: "square" }, `${store}/icon-512.png`);

// ── 웹(파비콘·홈 화면 추가): Next 파일 규칙 app/icon.png · app/apple-icon.png ──
const webApp = resolve(mobile, "../web/app");
await icon(512, { scale: 1, shape: "rounded" }, `${webApp}/icon.png`);
await icon(180, { scale: 1, shape: "square" }, `${webApp}/apple-icon.png`);

// ── 그래픽 이미지 1024×500: 크림 단색 위에 왼쪽 기억해U 로고와 한 줄 소개, 오른쪽 C 아이콘과 별·하트 ──
const tilt = (deg) => `transform:rotate(${deg}deg)`;
const featureDeco = (path, fill, size, pos, deg) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="position:absolute;${pos};${tilt(deg)}"><path d="${path}"/></svg>`;
const feature = page(
  `<div style="position:relative;width:1024px;height:500px;display:flex;align-items:center;padding:0 72px;background:${CREAM}">
    <div style="flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:18px;margin-top:-6px">
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:12px">
        <span class="ry-word" style="font-size:112px;-webkit-text-stroke:2px ${INK}">기억해<svg class="u" viewBox="0 0 26 34" width="88" height="116" aria-hidden="true" style="margin:0 0 10px 6px"><circle cx="4.4" cy="3.6" r="2.4" fill="currentColor"/><circle cx="22.3" cy="3.6" r="2.4" fill="currentColor"/><path d="M4.2 10.6 C3.8 18.5 4.3 24 6.6 27.6 C8.6 30.6 11 31.8 13.4 31.8 C15.8 31.8 18.2 30.6 20.2 27.6 C22.5 24 22.9 18.5 22.5 10.2" fill="none" stroke="currentColor" stroke-width="3.1" stroke-linecap="round"/></svg></span>
        <svg viewBox="0 0 200 14" width="400" height="28" preserveAspectRatio="none" fill="none" stroke="${MANGO_DEEP}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" aria-hidden="true"><path vector-effect="non-scaling-stroke" stroke-width="5" d="M3 8 C 15 1, 27 14, 40 7 S 65 1, 78 8 S 103 14, 116 7 S 141 1, 154 8 S 179 14, 197 6"/></svg>
      </div>
      <span style="font-family:'Poor Story';font-size:50px;line-height:1.2;color:${INK};margin-top:14px;letter-spacing:-0.01em">말 안 해도 아는 사이처럼</span>
      <span style="font-family:'Poor Story';font-size:28px;color:${MUTED}">소울메이트 컨닝페이퍼</span>
    </div>
    <div style="position:relative;width:340px;height:340px;margin-right:12px;flex-shrink:0;${tilt(-4)}">
      <div style="width:100%;height:100%;border-radius:22.4%;overflow:hidden;background:#FDF3DA;box-shadow:0 0 0 2px rgba(31,35,64,.14),0 26px 34px -18px rgba(31,35,64,.55)">${iconSvg({ scale: 1, shape: "square" })}</div>
      ${featureDeco(STAR, MANGO, 54, "right:-34px;top:-30px", 14)}
      ${featureDeco(HEART, "#F59BAE", 58, "left:-40px;bottom:-14px", -14)}
      ${featureDeco(STAR, "#8FD2EC", 38, "right:-28px;bottom:26px", 10)}
    </div>
  </div>`,
  1024,
  500,
  { bg: CREAM, fonts: true },
);
await render(feature, 1024, 500, `${store}/feature-1024x500.png`, { transparent: false });

await browser.close();
console.log("done");
