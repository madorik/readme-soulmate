import type { Locale, YMD } from "@readme/core";
import type { Person } from "@/lib/data";

// 같이 고르기 > 선물 고르기 데이터(lib/pages/plan-gift.ts가 읽고 components/pages/PlanGiftView가 그린다). 타입만 둔다

export interface PlanGiftData {
  locale: Locale;
  today: YMD;
  /** 고른 사람들(한 명 이상) */
  people: Person[];
  /** 고르기 모드인 '사람들' 화면으로 돌아가는 주소 */
  back: string;
  /** 선물 추천을 보일지(GIFT_PICKS) */
  picksOn: boolean;
  /** 이 화면을 열면 읽은 것으로 바꿀 안 본 답장이 있는 사람들(홈 연말 카드·알림에서 답이 온 사람의 선물 고르기로 곧장 왔을 때) */
  answeredIds: string[];
}
