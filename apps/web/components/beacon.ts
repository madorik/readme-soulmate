"use client";

// 이용 기록 보내기(/api/e): 화면을 떠나도 가게 sendBeacon, 없으면 keepalive fetch. 실패해도 그만
export function beacon(n: "gift_click" | "card_share", data: { i?: string; b?: string; s?: string } = {}): void {
  try {
    const body = JSON.stringify({ n, ...data });
    if (navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/e", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {
    /* 기록 못 해도 그만 */
  }
}
