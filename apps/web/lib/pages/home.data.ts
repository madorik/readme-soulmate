import type { AvatarConfig, DailyQuestion, Locale, YMD } from "@readme/core";
import type { Person, UnreadAnswer } from "@/lib/data";

// 홈 화면 데이터(lib/pages/home.ts가 읽고 components/pages/HomeView가 그린다). 타입만 둔다

export interface HomeData {
  locale: Locale;
  /** 내 얼굴(오른쪽 위 메뉴) */
  avatar: AvatarConfig;
  today: YMD;
  people: Person[];
  /** 오늘의 질문: 내가 등록한 사람 중 아직 답이 없는 칸 하나(사람이 없거나 모두 답했으면 null) */
  question: { contactId: string; q: DailyQuestion } | null;
  /** 건너뛰기를 누른 횟수(?skip=) */
  questionSkip: number;
  /** 아직 안 본 답장 */
  answers: UnreadAnswer[];
  /** 오늘의 질문에 막 답했다(?answered=1) */
  answered: boolean;
  ai: boolean;
}
