import type { Diner, Locale } from "@readme/core";

// 같이 고르기 > 메뉴 고르기 데이터(lib/pages/plan-menu.ts가 읽고 components/pages/PlanMenuView가 그린다). 타입만 둔다

export interface PlanMenuData {
  locale: Locale;
  /** 같이 먹는 사람들(나도 같이면 맨 앞) */
  diners: Diner[];
  /** 고르기 모드인 '사람들' 화면으로 돌아가는 주소 */
  back: string;
}
