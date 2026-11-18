import type { Locale, PartialCard, Section } from "@readme/core";

// 사람 기록 항목 하나 고치기 화면 데이터(lib/pages/person-edit-section.ts가 만들고 components/pages/PersonEditSectionView가 그린다). 타입만 둔다

export interface PersonEditSectionData {
  locale: Locale;
  contactId: string;
  /** 부를 이름 */
  name: string;
  section: Section;
  card: PartialCard;
}
