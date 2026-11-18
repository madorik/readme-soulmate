import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// 기억해유 앱(apps/web)의 화면을 그대로 그린다(@/ → apps/web). Next 전용인 것만 바꿔 끼운다:
//   next/link·next/navigation → 미니앱 화면 쌓기(src/nav.tsx), @/lib/shell → "toss", components/native(Capacitor) → 빈 것,
//   components/shell/* → src/shell/*(토스에만 있는 줄), 받아쓰기 → 녹음+서버, 공유 → 토스 공유 시트,
//   @/app/actions/<모듈>(서버 액션) → /api/t/action으로 부르는 함수(아래 플러그인).
// react는 이 앱 것 하나만 쓴다(웹 쪽 react와 둘이 되면 훅이 깨진다)
const web = path.resolve(import.meta.dirname, "../web");
const here = (p: string) => path.resolve(import.meta.dirname, p);

/** 서버 액션 모듈을 같은 이름의 함수들(서버로 부르기)로 바꾼다. 이름은 원본 파일의 export async function에서 읽는다 */
function serverActions(): Plugin {
  const PREFIX = "\0server-action:";
  return {
    name: "readme-server-actions",
    enforce: "pre",
    resolveId(id) {
      const m = id.match(/^@\/app\/actions\/(\w+)$/);
      return m ? PREFIX + m[1] : null;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const mod = id.slice(PREFIX.length);
      const file = path.join(web, "app/actions", `${mod}.ts`);
      this.addWatchFile(file);
      const names = [...readFileSync(file, "utf8").matchAll(/export async function (\w+)/g)].map((m) => m[1]);
      return [
        `import { callAction } from ${JSON.stringify(here("src/actions.ts"))};`,
        ...names.map((n) => `export const ${n} = (...args) => callAction(${JSON.stringify(mod)}, ${JSON.stringify(n)}, args);`),
      ].join("\n");
    },
  };
}

/** 웹 글꼴 파일(app/fonts.css)은 사이트 맨 위 주소(/fonts/…)를 가리킨다. 번들이 함께 싣게 실제 파일 자리(../public/fonts/…)로 바꾼다 */
function webFonts(): Plugin {
  return {
    name: "readme-web-fonts",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/app/fonts.css")) return null;
      return code.replaceAll("url(/fonts/", "url(../public/fonts/");
    },
  };
}

export default defineConfig({
  plugins: [serverActions(), webFonts(), react(), tailwindcss()],
  // 토스가 번들을 어느 경로에 올리든 열리게 상대 경로로
  base: "./",
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: here("src/shims/link.tsx") },
      { find: /^next\/navigation$/, replacement: here("src/shims/navigation.ts") },
      { find: /^@\/components\/native$/, replacement: here("src/shims/native.ts") },
      { find: /^@\/lib\/shell$/, replacement: here("src/shims/shell.ts") },
      { find: /^@\/lib\/dictation$/, replacement: here("src/shims/dictation.ts") },
      { find: /^@\/components\/ShareButtons$/, replacement: here("src/shims/share.tsx") },
      { find: /^@\/components\/shell\/(.*)$/, replacement: `${here("src/shell")}/$1` },
      { find: /^@\/(?!app\/actions\/)/, replacement: `${web}/` },
    ],
    dedupe: ["react", "react-dom"],
  },
  server: { port: 5183 },
  build: { target: "es2019", sourcemap: false },
});
