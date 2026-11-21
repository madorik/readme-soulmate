import type { Locale } from "@readme/core";

// 직접 적어 두기 화면 데이터(lib/pages/person-new.ts가 만들고 components/pages/PersonNewView가 그린다). 타입만 둔다

export interface PersonNewData {
  locale: Locale;
  /** 처음 넣을 폴더 고르기(이름은 화면 언어로) */
  folders: { id: string; name: string }[];
  /** 주소 ?error=name: 이름이 비었다 */
  error: string | null;
  /** 주소 ?name=…: 미리 채울 이름 */
  name: string | null;
  /** 메모 가져오기를 쓸 수 있나(AI 키가 있을 때) */
  ai: boolean;
  /** 주소 ?xmas=1: 홈 연말 카드에서 왔다(만든 뒤 곧바로 그 사람에게 받고 싶은 것을 물어보기로) */
  xmas: boolean;
}
