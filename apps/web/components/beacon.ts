"use client";

// 이용 기록 보내기(/api/e): 모았다가 한 번에, 화면을 떠날 때는 바로(sendBeacon, 없으면 keepalive fetch). 실패해도 그만.
// GA4(gtag)·GTM(dataLayer)이 켜져 있으면 같은 이름으로 그쪽에도 보낸다(주소는 사람 id·토큰을 지운 모양만)

export interface UsageEvent {
  n: string;
  /** 화면 주소 모양 */
  p?: string;
  /** 머문 시간(ms) */
  v?: number;
  /** 선물 목록 id */
  i?: string;
  b?: string;
  s?: string;
  /** 들어온 사이트·캠페인(visit) */
  r?: string;
  c?: string;
}

const KEY = "rm_aid";
let memoryAnon = "";

function randomId(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

/** 이 기기의 익명 방문자 id(로그인 전 방문·유입을 가입과 잇는다) */
export function anonId(): string {
  try {
    let a = localStorage.getItem(KEY);
    if (!a || !/^[A-Za-z0-9]{16}$/.test(a)) {
      a = randomId();
      localStorage.setItem(KEY, a);
    }
    return a;
  } catch {
    memoryAnon ||= randomId();
    return memoryAnon;
  }
}

const queue: UsageEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  while (queue.length) {
    const body = JSON.stringify({ a: anonId(), e: queue.splice(0, 30) });
    try {
      if (navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" }))) continue;
      void fetch("/api/e", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    } catch {
      /* 기록 못 해도 그만 */
    }
  }
}

/** 기록 넣기. now면 바로 보낸다(떠나는 중·누름) */
export function send(events: UsageEvent[], now = false): void {
  if (typeof window === "undefined") return;
  queue.push(...events);
  if (now || queue.length >= 20) flush();
  else timer ??= setTimeout(flush, 2000);
}

type Tagged = { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[]; google_tag_manager?: unknown };

/** GA4·GTM에도(켜져 있을 때만) */
export function google(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Tagged;
  try {
    w.gtag?.("event", name, params);
    if (w.google_tag_manager && w.dataLayer) w.dataLayer.push({ event: name, ...params });
  } catch {
    /* 그만 */
  }
}

/** 쿠팡 링크 누름·카드 보내기 */
export function beacon(n: "gift_click" | "card_share", data: { i?: string; b?: string; s?: string } = {}): void {
  send([{ n, ...data }], true);
  google(n, { item_id: data.i, price_band: data.b, from: data.s });
}
