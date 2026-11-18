// 이 화면이 어디서 그려지는지: 웹·앱(Capacitor)은 "web", 토스 미니앱 번들은 "toss"(apps/toss가 이 파일을 바꿔 끼운다).
// 토스 정책 때문에 다른 것(우리 사이트 링크, 구글·애플 로그인, 공유 방식 등)만 이 값으로 가른다
export const SHELL: "web" | "toss" = "web";

/** 앱 아이콘 주소(화면 조각에 쓰는 작은 아이콘). 토스 번들은 번들 안 파일로 바꿔 끼운다 */
export const APP_ICON = "/icon.png";
