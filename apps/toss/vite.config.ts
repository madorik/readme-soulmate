import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 기억해유 웹(apps/web)의 화면 조각(기록 칸·편집기·얼굴·아이콘)을 그대로 가져다 쓴다(@/ → apps/web).
// next/link만 평범한 <a>로 바꿔 끼운다. react는 이 앱 것 하나만 쓴다(웹 쪽 react와 둘이 되면 훅이 깨진다)
const web = path.resolve(import.meta.dirname, "../web");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 토스가 번들을 어느 경로에 올리든 열리게 상대 경로로
  base: "./",
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: path.resolve(import.meta.dirname, "src/shims/link.tsx") },
      { find: /^@\//, replacement: `${web}/` },
    ],
    dedupe: ["react", "react-dom"],
  },
  server: { port: 5183 },
  build: { target: "es2019", sourcemap: false },
});
