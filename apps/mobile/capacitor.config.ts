import type { CapacitorConfig } from "@capacitor/cli";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// 앱은 배포된 웹을 띄운다(apps/web). 운영 빌드 전에 CAP_SERVER_URL=https://<운영 도메인> 으로 sync 한다.
// 개발: iOS 시뮬레이터는 http://localhost:3200, Android 에뮬레이터는 http://10.0.2.2:3200, 실제 기기는 http://<맥 IP>:3200
const serverUrl = (process.env.CAP_SERVER_URL || "http://localhost:3200").replace(/\/+$/, "");

// 웹을 못 불러올 때 보이는 안내 화면(www는 gitignore). "다시 시도"가 돌아갈 주소를 넣어 만든다
mkdirSync(resolve("www"), { recursive: true });
writeFileSync(resolve("www/index.html"), readFileSync(resolve("offline.html"), "utf8").replace("__SERVER_URL__", JSON.stringify(serverUrl)));

const config: CapacitorConfig = {
  appId: "kr.readme.app",
  appName: "리드미",
  webDir: "www",
  backgroundColor: "#FFFFFF",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http:"),
    errorPath: "index.html",
  },
  ios: { contentInset: "never", appendUserAgent: "ReadmeApp (ios)" },
  android: { appendUserAgent: "ReadmeApp (android)" },
  plugins: {
    // 화면 끝까지 그리고(웹이 안전 영역만큼 띄운다), 상태바·아래 막대 아이콘은 흰 바탕에 맞춰 어둡게
    SystemBars: { insetsHandling: "css", style: "LIGHT", initialViewportFitValueHint: "cover" },
    SplashScreen: { launchShowDuration: 1500, launchAutoHide: true, backgroundColor: "#FFFFFF", showSpinner: false },
    LocalNotifications: { iconColor: "#E8352C" },
    PushNotifications: { presentationOptions: ["banner", "sound"] },
  },
};

export default config;
