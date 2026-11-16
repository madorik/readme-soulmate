"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { flush, google, send } from "@/components/beacon";
import { channelOf, normalizePath } from "@/lib/usage";

// 화면 보기·머문 시간·유입 경로(우리 통계와 GA4·GTM).
// - 이번 방문의 첫 화면: visit(어디서 왔는지: utm·인앱 브라우저·들어온 사이트)
// - 화면이 바뀔 때마다: page_view(주소 모양만) + 앞 화면에 실제로 보고 있던 시간(page_time, 앱을 내리거나 탭을 숨기면 멈춘다)
// /admin·/api는 남기지 않는다

const MAX_MS = 30 * 60_000;
// 같은 화면을 1초 안에 두 번 세지 않는다(개발 모드에서 효과가 두 번 도는 것 등)
let lastView = { p: "", t: 0 };

export function UsageTracker() {
  const pathname = usePathname();
  const page = useRef<{ path: string; since: number | null; acc: number } | null>(null);

  // 이번 방문의 첫 화면과 유입 경로(브라우저 탭마다 한 번)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("rm_visit")) return;
      sessionStorage.setItem("rm_visit", "1");
    } catch {
      /* 저장소를 못 쓰면 매번 보낸다 */
    }
    const p = normalizePath(window.location.pathname);
    if (!p) return;
    const ch = channelOf({ referrer: document.referrer, url: window.location.href, ua: navigator.userAgent, ownHost: window.location.hostname });
    send([{ n: "visit", p, s: ch.source, r: ch.ref ?? undefined, c: ch.campaign ?? undefined }], true);
    google("visit", { landing: p, channel: ch.source, campaign: ch.campaign ?? undefined });
  }, []);

  // 화면 바뀜: 앞 화면 머문 시간 + 새 화면 보기
  useEffect(() => {
    const prev = page.current;
    if (prev) {
      if (prev.since) prev.acc += Date.now() - prev.since;
      if (prev.acc > 1000) send([{ n: "page_time", p: prev.path, v: Math.min(prev.acc, MAX_MS) }]);
    }
    const p = normalizePath(pathname);
    page.current = p ? { path: p, since: document.visibilityState === "visible" ? Date.now() : null, acc: 0 } : null;
    if (!p) return;
    const now = Date.now();
    if (lastView.p === p && now - lastView.t < 1000) return;
    lastView = { p, t: now };
    send([{ n: "page_view", p }]);
    google("page_view", { page_path: p, page_location: `${window.location.origin}${p}`, page_title: document.title });
  }, [pathname]);

  // 숨기면 그때까지 시간을 보내고 멈추고, 다시 보이면 이어서 센다
  useEffect(() => {
    // 숨김·떠남(새로 고침·다른 주소로 이동 포함): 그때까지 시간을 보내고 멈춘다
    const hide = () => {
      const cur = page.current;
      if (cur) {
        if (cur.since) cur.acc += Date.now() - cur.since;
        cur.since = null;
        if (cur.acc > 1000) send([{ n: "page_time", p: cur.path, v: Math.min(cur.acc, MAX_MS) }]);
        cur.acc = 0;
      }
      flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hide();
      else if (page.current) page.current.since = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", hide);
    };
  }, []);

  return null;
}
