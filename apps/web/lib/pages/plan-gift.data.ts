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
}
