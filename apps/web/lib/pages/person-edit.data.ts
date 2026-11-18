import type { Locale, PartialCard, Section } from "@readme/core";

// 사람 정보 수정 화면 데이터(lib/pages/person-edit.ts가 만들고 components/pages/PersonEditView가 그린다). 타입만 둔다

export interface PersonEditData {
  locale: Locale;
  contactId: string;
  /** 부를 이름 */
  name: string;
  card: PartialCard;
  /** 주소 ?open=…: 펼쳐 둘 항목 */
  open: Section | null;
}
