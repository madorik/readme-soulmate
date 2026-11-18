import { defineConfig } from "@apps-in-toss/web-framework/config";

// 기억해유 토스 미니앱(intoss://remember-you). 서버는 apps/web의 /api/t, 로그인은 사용자 식별키(apps/web/lib/toss.ts)
export default defineConfig({
  appName: "remember-you",
  // 망고(주 버튼·D-day 색)
  brand: { primaryColor: "#FFC23D" },
  // 말로 적기: 누를 때만 녹음한다
  permissions: [{ name: "microphone", access: "access" }],
  // 토스 네비게이션 바의 뒤로가기만 쓴다(앱 안에 따로 두지 않는다). 누르면 src/bridge.ts onBack이 받는다
  navigationBar: { withBackButton: true },
  webView: { overScrollMode: "never" },
  webBundleDir: "dist",
});
