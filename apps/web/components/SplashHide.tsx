"use client";

import { useEffect } from "react";

// 앱(Capacitor) 스플래시는 최대 1.5초(launchShowDuration) 뒤에 사라진다. 웹이 첫 화면을 그리면 그 전에 바로 걷는다.
// 앱 판이 오래됐거나 플러그인이 없으면 아무 일도 하지 않고, 타이머가 알아서 걷는다
export function SplashHide() {
  useEffect(() => {
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { SplashScreen?: { hide?: (o?: { fadeOutDuration?: number }) => Promise<void> } } } };
    if (!w.Capacitor?.isNativePlatform?.()) return;
    // 첫 페인트가 끝난 다음 프레임에 걷는다
    const id = requestAnimationFrame(() => void w.Capacitor?.Plugins?.SplashScreen?.hide?.({ fadeOutDuration: 150 })?.catch(() => {}));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
