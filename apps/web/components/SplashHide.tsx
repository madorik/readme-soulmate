"use client";

import { useEffect } from "react";

// 앱(Capacitor) 스플래시는 웹이 로딩 덮개를 그리기 시작하면 lib/launch-boot.ts의 스크립트가 먼저 걷는다. 여기는 그게 안 돌았을 때를 위한 보험:
// 웹이 hydrate된 뒤 한 번 더 걷는다(이미 걷혔으면 아무 일도 안 한다). 앱 판이 오래됐거나 플러그인이 없으면 아무 일도 하지 않고, 타이머(launchShowDuration)가 알아서 걷는다
export function SplashHide() {
  useEffect(() => {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { SplashScreen?: { hide?: (o?: { fadeOutDuration?: number }) => Promise<void> } } } };
    if (!w.Capacitor?.isNativePlatform?.()) return;
    // 첫 페인트가 끝난 다음 프레임에 걷는다
    const id = requestAnimationFrame(() => void w.Capacitor?.Plugins?.SplashScreen?.hide?.({ fadeOutDuration: 200 })?.catch(() => {}));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
