// 앱 전체 글꼴(Poor Story 손글씨체, OFL)을 직접 호스팅한다: 구글 폰트의 한글 조각(unicode-range) 파일을 public/fonts에 받아 두고 CSS를 만든다.
// 굵기는 400 한 벌뿐이라 굵은 글씨는 브라우저가 두껍게 만든다. 브라우저는 화면에 나온 글자의 조각만 받는다.
// 빌드·개발 서버가 구글 폰트를 부르지 않고, 사용자 IP도 구글로 가지 않는다.
//   node scripts/fetch-fonts.mjs   (글꼴을 바꿀 때만 다시 돌린다. 로고 글자만 담은 작은 파일은 scripts/fetch-wordmark-font.mjs)
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FAMILY = "Poor Story";
const WEIGHTS = "400";
const DIR = "poor-story";
const outDir = resolve(import.meta.dirname, `../apps/web/public/fonts/${DIR}`);
const cssPath = resolve(import.meta.dirname, "../apps/web/app/fonts.css");
// woff2 + unicode-range를 주는 최신 브라우저로 보이게
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FAMILY)}:wght@${WEIGHTS}&display=swap`;
const css = await (await fetch(url, { headers: { "user-agent": UA } })).text();
if (!css.includes("@font-face")) throw new Error("no @font-face in response");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1]);
const jobs = [];
const out = [];
const seen = new Map();
for (const face of faces) {
  const weight = /font-weight:\s*([\d ]+);/.exec(face)?.[1]?.trim();
  const src = /url\((https:[^)]+\.woff2)\)/.exec(face)?.[1];
  const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
  if (!weight || !src || !range) continue;
  // 같은 파일을 여러 번 받지 않는다(가변 글꼴은 굵기마다 같은 파일을 가리킨다)
  let name = seen.get(src);
  if (!name) {
    const slice = /\.(\d+)\.woff2$/.exec(src)?.[1] ?? `x${seen.size}`;
    name = `${slice}.woff2`;
    seen.set(src, name);
    jobs.push({ src, file: resolve(outDir, name) });
  }
  out.push(`@font-face{font-family:"${FAMILY}";font-style:normal;font-weight:${weight};font-display:swap;src:url(/fonts/${DIR}/${name}) format("woff2");unicode-range:${range.trim()}}`);
}

// 동시에 8개씩, 실패하면 세 번까지 다시
let done = 0;
async function worker() {
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(job.src, { headers: { "user-agent": UA } });
        if (!res.ok) throw new Error(`${res.status} ${job.src}`);
        writeFileSync(job.file, Buffer.from(await res.arrayBuffer()));
        done++;
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
      }
    }
  }
}
const total = jobs.length;
await Promise.all(Array.from({ length: 8 }, worker));

writeFileSync(cssPath, `/* scripts/fetch-fonts.mjs 로 만든 파일(${FAMILY}, SIL Open Font License 1.1). 손으로 고치지 않는다 */\n${out.join("\n")}\n`);
console.log(`${done}/${total} files, ${out.length} faces → ${outDir}\nwrote ${cssPath}`);
