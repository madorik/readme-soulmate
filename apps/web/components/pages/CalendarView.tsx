import { CalendarPager } from "@/components/CalendarPager";
import type { CalendarData } from "@/lib/pages/calendar.data";

// 월별 달력: 챙길 날의 '이번 주'를 누르면 온다. 좌우로 밀어 달을 옮기고, 공휴일·연휴(대체공휴일 포함)와 챙기는 날이 같이 보인다.
// 그리고 옮기는 건 화면에서 하므로(서버를 다시 부르지 않는다) 그림은 components/CalendarPager(클라이언트)가 맡는다
export function CalendarView(data: CalendarData) {
  return <CalendarPager {...data} />;
}
