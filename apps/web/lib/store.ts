// 앱 받기: 기기에 맞는 스토어로. 안드로이드·PC는 Play 스토어(PC에서는 폰으로 설치를 보낼 수 있다), 아이폰은 App Store 주소(appStore)가 있으면 거기, 없으면 웹으로 이어 쓰게 next로.
// 지금은 Play 비공개 테스트(테스터만 설치) 중이라 정식 출시 전에는 테스터가 아니면 Play에서 찾을 수 없다고 나온다.
// 그래서 Play가 공개되기 전(PLAY_PUBLIC이 1이 아닐 때)에는 안드로이드·PC도 막다른 길 대신 웹으로 이어 준다. Play를 정식 출시하면 Vercel에 PLAY_PUBLIC=1을 넣는다.

export const ANDROID_APP_ID = "kr.readme.app";

/** App Store 앱 화면(2026-11-20 1.0.1 출시). 앱 공유하기(from=share)가 쓴다 */
export const APP_STORE_URL = "https://apps.apple.com/kr/app/id6834970170";

/** Play 스토어 앱 화면. referrer의 utm은 Play 콘솔 유입 보고에 잡힌다 */
export function playUrl(source: string): string {
  const referrer = encodeURIComponent(`utm_source=${source}&utm_medium=web&utm_campaign=app_get`);
  return `https://play.google.com/store/apps/details?id=${ANDROID_APP_ID}&referrer=${referrer}`;
}

/** Play 스토어에 앱이 공개돼 있나(정식 출시 뒤 PLAY_PUBLIC=1). 아니면 테스터만 설치할 수 있어 일반 방문자에게는 막다른 길이다 */
export function playPublic(): boolean {
  return process.env.PLAY_PUBLIC === "1";
}

/** 기기에 맞는 곳: 아이폰·아이패드는 App Store(없으면 next), 그 밖에는 Play 스토어(공개 전이면 웹 next) */
export function storeTarget(userAgent: string | null, o: { source: string; next: string; appStore?: string }): { url: string; os: "ios" | "android" | "other" } {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/.test(ua)) return { url: o.appStore || o.next, os: "ios" };
  return { url: playPublic() ? playUrl(o.source) : o.next, os: /Android/.test(ua) ? "android" : "other" };
}
