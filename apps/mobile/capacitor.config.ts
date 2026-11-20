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
  appName: "기억해유",
  webDir: "www",
  backgroundColor: "#FBF6EA",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http:"),
    errorPath: "index.html",
  },
  ios: { contentInset: "never", appendUserAgent: "ReadmeApp (ios)" },
  android: { appendUserAgent: "ReadmeApp (android)" },
  plugins: {
    // 화면 끝까지 그리고(웹이 안전 영역만큼 띄운다), 상태바·아래 막대 아이콘은 밝은 바탕에 맞춰 어둡게
    SystemBars: { insetsHandling: "css", style: "LIGHT", initialViewportFitValueHint: "cover" },
    // 실행 화면: 크림 바탕 + 가운데 기억해U 로고 정지판(iOS LaunchScreen.storyboard, 안드로이드 styles.xml의 splash_icon).
    // 웹이 첫 화면(움직이는 로딩 덮개, apps/web/components/LaunchOverlay.tsx)을 그리기 시작하면 웹이 SplashScreen.hide()로 바로 걷는다.
    // launchShowDuration은 그 신호가 안 올 때(웹이 늦거나 못 불러올 때)를 위한 상한일 뿐이다: 안드로이드는 이 시간이 지나야 웹을 그리기 시작하니 너무 길면 안 된다
    SplashScreen: { launchShowDuration: 4000, launchAutoHide: true, launchFadeOutDuration: 200, backgroundColor: "#FBF6EA", showSpinner: false },
    LocalNotifications: { smallIcon: "ic_stat_notify", iconColor: "#F2A900" },
    PushNotifications: { presentationOptions: ["banner", "sound"] },
  },
};

export default config;
