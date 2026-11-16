import "server-only";
import { after } from "next/server";
import { asSystem } from "./db";
import { CATALOG_BY_ID, PRICE_BANDS } from "./gift-catalog";
import { CLIENT_EVENTS, SERVER_EVENTS, normalizePath, type EventName, type ServerEvent } from "./usage";

// 이용 기록(우리 통계, /admin). 내용(이름·기록·메모)은 남기지 않고 무엇을·어디서·얼마나만. 응답을 보낸 뒤에 쓰고, 실패해도 화면에는 영향이 없다

export interface TrackInfo {
  userId?: string | null;
  /** 선물 목록 id */
  item?: string | null;
  band?: string | null;
  /** 어디서·어떤 종류(reminder·plan·card·guide, 기록 항목 이름 등) */
  source?: string | null;
  /** 화면 주소 모양(/people/:id) */
  path?: string | null;
  /** 머문 시간(ms) 같은 숫자 */
  value?: number | null;
  /** 로그인 전 방문자 id(기기에 둔 무작위 값) */
  anon?: string | null;
  platform?: string | null;
  /** 들어온 사이트(도메인만) */
  ref?: string | null;
  campaign?: string | null;
  os?: string | null;
  browser?: string | null;
}

export function isEventName(v: unknown): v is EventName {
  return typeof v === "string" && ((CLIENT_EVENTS as readonly string[]).includes(v) || (SERVER_EVENTS as readonly string[]).includes(v));
}

function clean(e: TrackInfo) {
  const value = typeof e.value === "number" && Number.isFinite(e.value) ? Math.max(0, Math.min(Math.round(e.value), 6 * 3600_000)) : null;
  return {
    userId: e.userId || null,
    item: e.item && CATALOG_BY_ID.has(e.item) ? e.item : null,
    band: e.band && (PRICE_BANDS as readonly string[]).includes(e.band) ? e.band : null,
    source: e.source && /^[a-z_]{1,20}$/.test(e.source) ? e.source : null,
    path: e.path ? normalizePath(e.path) : null,
    value,
    anon: e.anon && /^[A-Za-z0-9]{8,32}$/.test(e.anon) ? e.anon : null,
    platform: e.platform === "ios" || e.platform === "android" || e.platform === "web" ? e.platform : null,
    ref: e.ref && /^[a-z0-9.-]{1,80}$/.test(e.ref) ? e.ref : null,
    campaign: e.campaign && /^[A-Za-z0-9_.-]{1,60}$/.test(e.campaign) ? e.campaign : null,
    os: e.os && ["ios", "android", "windows", "mac", "linux", "other"].includes(e.os) ? e.os : null,
    browser: e.browser && /^[a-z_]{1,20}$/.test(e.browser) ? e.browser : null,
  };
}

/** 여러 개를 한 번에(화면에서 모아 보낸 것) */
export function trackMany(rows: { name: EventName; info: TrackInfo }[]): void {
  const list = rows.filter((r) => isEventName(r.name)).slice(0, 30).map((r) => ({ name: r.name, ...clean(r.info) }));
  if (!list.length) return;
  const write = () =>
    asSystem(async (q) => {
      for (const e of list) {
        await q(
          "insert into app_events (name, user_id, item, band, source, path, value, anon, platform, ref, campaign, os, browser) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
          [e.name, e.userId, e.item, e.band, e.source, e.path, e.value, e.anon, e.platform, e.ref, e.campaign, e.os, e.browser],
        );
      }
    }).then(
      () => undefined,
      (err) => console.warn("track failed", err instanceof Error ? err.message : err),
    );
  try {
    after(write);
  } catch {
    void write();
  }
}

/** 서버에서 기능 하나 */
export function track(name: ServerEvent | EventName, info: TrackInfo = {}): void {
  trackMany([{ name, info }]);
}

/** 미리보기 수집기·검색 로봇이 연 것은 세지 않는다 */
export function isBot(userAgent: string | null): boolean {
  return /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk-scrap|scrap|preview|whatsapp|telegram|discord|line\/|headless|lighthouse/i.test(userAgent ?? "");
}

/** 요청 머리글로 어디서(앱 웹뷰 'ReadmeApp (ios|android)' 아니면 웹) */
export function platformOf(userAgent: string | null): "ios" | "android" | "web" {
  const m = /ReadmeApp \((ios|android)\)/.exec(userAgent ?? "");
  return (m?.[1] as "ios" | "android" | undefined) ?? "web";
}
