import "server-only";
import { after } from "next/server";
import { asSystem } from "./db";
import { CATALOG_BY_ID, PRICE_BANDS } from "./gift-catalog";

// 이용 기록(우리 통계, /admin). 내용(이름·기록·메모)은 남기지 않고 무엇을·어디서만. 응답을 보낸 뒤에 쓰고, 실패해도 화면에는 영향이 없다

export const TRACK_NAMES = ["gift_picks_view", "gift_reroll", "gift_click", "card_share", "card_open", "gift_done"] as const;
export type TrackName = (typeof TRACK_NAMES)[number];

export interface TrackInfo {
  userId?: string | null;
  /** 선물 목록 id */
  item?: string | null;
  band?: string | null;
  /** 어디서(reminder·plan·card) */
  source?: string | null;
}

function clean(e: TrackInfo) {
  return {
    userId: e.userId || null,
    item: e.item && CATALOG_BY_ID.has(e.item) ? e.item : null,
    band: e.band && (PRICE_BANDS as readonly string[]).includes(e.band) ? e.band : null,
    source: e.source && /^[a-z_]{1,20}$/.test(e.source) ? e.source : null,
  };
}

export function track(name: TrackName, info: TrackInfo = {}): void {
  const e = clean(info);
  const write = () =>
    asSystem((q) => q("insert into app_events (name, user_id, item, band, source) values ($1, $2, $3, $4, $5)", [name, e.userId, e.item, e.band, e.source])).then(
      () => undefined,
      (err) => console.warn("track failed", name, err instanceof Error ? err.message : err),
    );
  try {
    after(write);
  } catch {
    void write();
  }
}

/** 미리보기 수집기·검색 로봇이 연 것은 세지 않는다 */
export function isBot(userAgent: string | null): boolean {
  return /bot|crawl|spider|slurp|facebookexternalhit|kakaotalk-scrap|scrap|preview|whatsapp|telegram|discord|line\//i.test(userAgent ?? "");
}
