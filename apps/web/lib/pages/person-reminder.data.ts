import type { AvatarConfig, DateSpec, Locale, NextOccurrence, PartialCard } from "@readme/core";
import type { GiftPicksData } from "./gift-picks.data";

// 선물 힌트(챙길 날) 화면 데이터(lib/pages/person-reminder.ts가 만들고 components/pages/PersonReminderView가 그린다). 타입만 둔다

export interface PersonReminderData {
  locale: Locale;
  contactId: string;
  avatar: AvatarConfig | null;
  /** 힌트에 쓰는 그 사람 기록 */
  card: PartialCard;
  /** 부를 이름 */
  name: string;
  /** 챙길 날(기념일이 없으면 생일) */
  spec: DateSpec | null;
  next: NextOccurrence | null;
  /** "엄마 생일" 같은 한 줄 */
  event: string;
  /** 지난 메모(힌트 맨 아래) */
  notes: { label: string; body: string }[];
  /** 선물 추천을 보일지(GIFT_PICKS=off면 숨긴다) */
  picksOn: boolean;
  /** 다시 고르기로 넘어온 '지난번에 보인 것' */
  skip: string[];
  /** 다시 고르기 주소의 앞부분(지금 화면 주소) */
  again: string;
  /** 같이 준비하기로 보낼 한 줄(날짜까지) */
  shareText: string;
  /** 선물 완료 메모 이름 */
  doneLabel: string;
  /** 선물 완료로 남긴 것 */
  done: string | null;
  /** 당일 알림을 받는다(설정 > 언제 알릴지) */
  remindOnDay: boolean;
  /** 고른 선물(picksOn일 때만 읽는다) */
  picks: GiftPicksData | null;
}

/** 화면이 받는 것: 웹은 picks를 기다리지 않고 Promise로 넘긴다(화면을 먼저 그리고 Suspense로 채운다). 토스 미니앱은 다 읽은 값 */
export type PersonReminderProps = Omit<PersonReminderData, "picks"> & { picks: GiftPicksData | null | Promise<GiftPicksData | null> };
