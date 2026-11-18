"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNativeApp } from "./native";

// 앱·탭을 다시 열었을 때 화면을 새로 받는다: 가려져 있는 동안 온 답장이 수동 새로고침 없이 보이게
// (탭 화면은 staleTimes로 1분 동안 다시 받지 않는다). 30초에 한 번까지만, 글을 적는 중에는 하지 않는다.
// 앱(Capacitor)은 화면이 다시 보이는 이벤트가 안 오는 경우가 있어 appStateChange도 듣는다(native.tsx와 같은 방식으로 불러온다)
const MIN_GAP_MS = 30_000;

/** 지금 입력 칸(글·선택)에 포커스가 있는지 */
function typing(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el instanceof HTMLElement && el.isContentEditable);
}

export function ResumeRefresh() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (Date.now() - last < MIN_GAP_MS || typing()) return;
      last = Date.now();
      router.refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    let cancelled = false;
    let remove: (() => void) | undefined;
    if (isNativeApp()) {
      void (async () => {
        const { App } = await import("@capacitor/app");
        const h = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refresh();
        });
        if (cancelled) void h.remove();
        else remove = () => void h.remove();
      })();
    }
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      remove?.();
    };
  }, [router]);
  return null;
}
