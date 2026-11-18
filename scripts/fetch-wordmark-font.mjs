// 로고 글자(기억해유 / Remember You)의 손글씨 글꼴(Poor Story, OFL)을 직접 호스팅한다.
// 로고에 쓰는 글자만 담은 작은 woff2 한 개를 구글 폰트에서 받아 public/fonts/wordmark에 두고, @font-face(app/wordmark.css)와 미리 받기용 주소(lib/wordmark-font.ts)를 만든다.
// 사용자 IP가 구글로 가지 않고(빌드·개발 서버도 구글을 부르지 않는다), 로고가 쓰는 글자만 담아 몇 KB다.
//   node scripts/fetch-wordmark-font.mjs   (글꼴을 바꾸거나 앱 이름이 바뀔 때만 다시 돌린다. 이름은 packages/core/src/brand.ts)
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FAMILY = "Poor Story";
// 로고에 나오는 글자: 한국어 이름과 영어 이름
const NAMES = ["기억해유", "Remember You"];
const text = [...new Set(NAMES.join(""))].join("");
const outDir = resolve(import.meta.dirname, "../apps/web/public/fonts/wordmark");
const cssPath = resolve(import.meta.dirname, "../apps/web/app/wordmark.css");
const tsPath = resolve(import.meta.dirname, "../apps/web/lib/wordmark-font.ts");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FAMILY)}&text=${encodeURIComponent(text)}&display=swap`;
const css = await (await fetch(cssUrl, { headers: { "user-agent": UA } })).text();
// 글자를 지정하면(text=) 그 글자만 담은 파일 하나(@font-face 하나)를 준다. 주소는 .woff2로 끝나지 않는다
if ((css.match(/@font-face/g) ?? []).length !== 1) throw new Error("@font-face가 하나가 아니다");
const src = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"]woff2['"]\)/.exec(css)?.[1];
if (!src) throw new Error("woff2 주소를 못 찾았다");

const res = await fetch(src);
const buf = Buffer.from(await res.arrayBuffer());
// 받은 파일이 woff2인지(머리글자 wOF2)와 크기를 확인한다
if (buf.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error("woff2 파일이 아니다");
if (buf.length > 100_000) throw new Error(`글꼴 파일이 너무 크다: ${buf.length}`);

const hash = createHash("sha1").update(buf).digest("hex").slice(0, 8);
const file = `poor-story-${hash}.woff2`;
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, file), buf);

const url = `/fonts/wordmark/${file}`;
writeFileSync(
  cssPath,
  `/* scripts/fetch-wordmark-font.mjs가 만든다(직접 고치지 않는다). 로고 글자(${NAMES.join(" / ")})만 담은 ${FAMILY} */
@font-face {
  font-family: "Wordmark Hand";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(${url}) format("woff2");
}
`,
);
writeFileSync(tsPath, `// scripts/fetch-wordmark-font.mjs가 만든다(직접 고치지 않는다). 로고 글꼴을 첫 화면 전에 받아 두는 데 쓴다\nexport const WORDMARK_FONT_URL = "${url}";\n`);
console.log(`wordmark font: ${text} → ${file} (${buf.length} bytes)`);
