// 토스 미니앱(apps/toss) ↔ 서버(/api/t) 사이에 오가는 모양. 화면(브라우저)에서도 가져다 쓰므로 서버 전용 코드를 들이지 않는다

import type { AvatarConfig, Locale, PartialCard, Section, YMD } from "@readme/core";

export interface TPerson {
  id: string;
  /** 부를 이름(내가 정한 부르는 말) */
  name: string;
  avatar: AvatarConfig | null;
  favorite: boolean;
  /** 적어 둔 항목 */
  filled: Section[];
}

export interface TEvent {
  contactId: string;
  /** "엄마 생일", "지수 결혼기념일 10주년" */
  title: string;
  date: YMD;
  daysUntil: number;
  kind: "birthday" | "anniversary";
}

export interface THome {
  today: YMD;
  /** 앞으로 60일 안에 챙길 날 */
  events: TEvent[];
  people: TPerson[];
  /** 말로 적기(AI)를 쓸 수 있는지 */
  ai: boolean;
}

export interface TPersonDetail {
  person: TPerson & { card: PartialCard };
  locale: Locale;
  today: YMD;
  /** 물어볼 때 상대에게 보일 내 이름(아직 안 정했으면 "") */
  me: string;
}

/** 물어보기 링크를 만들었을 때: 토큰(토스 공유 링크에 넣는다)과 같이 보낼 말 */
export interface TAskCreated {
  token: string;
  text: string;
}

/** 물어보기 링크를 연 사람에게 보일 것(로그인 없이) */
export interface TAskOpen {
  state: "active" | "expired" | "used" | "canceled" | "not_found";
  from: string;
  message: string;
  /** 미리 채운 항목 먼저 */
  sections: Section[];
  prefill: PartialCard;
}

export interface TGiftItem {
  id: string;
  name: string;
  image: string;
  reason: string;
  basis: string[];
  /** 쿠팡 일반 검색(파트너스 링크가 아니다. 토스 안에서는 바깥 광고 링크를 쓰지 않는다) */
  search: string;
}

export interface TGifts {
  /** 무엇을 보고 골랐는지 한 문장 */
  note: string;
  groups: { label: string; items: TGiftItem[] }[];
}

export interface TSession {
  token: string;
}

/** 토스판에서 여는 사람 화면 주소 */
export function tossPersonPath(contactId: string): string {
  return `/p/${contactId}`;
}

/** 물어보기 답하는 화면 딥링크(토스 공유 링크로 감싸서 보낸다) */
export function tossAskPath(app: string, token: string): string {
  return `intoss://${app}/r?ask=${encodeURIComponent(token)}`;
}
