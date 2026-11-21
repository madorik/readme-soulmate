import type { AvatarConfig, Locale, PartialCard, Section } from "@readme/core";

// 사람 정보 수정 화면 데이터(lib/pages/person-edit.ts가 만들고 components/pages/PersonEditView가 그린다). 타입만 둔다

export interface PersonEditData {
  locale: Locale;
  contactId: string;
  /** 부를 이름 */
  name: string;
  /** 이름 옆 작은 얼굴 */
  avatar: AvatarConfig | null;
  card: PartialCard;
  /** 메모 가져오기를 쓸 수 있나(AI 키가 있을 때) */
  ai: boolean;
  /** 주소 ?open=…: 펼쳐 둘 항목 */
  open: Section | null;
}
