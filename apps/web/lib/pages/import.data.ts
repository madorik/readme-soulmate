import type { AvatarConfig, Locale } from "@readme/core";

// 메모 가져오기 화면 데이터(lib/pages/import.ts가 만들고 components/pages/ImportView가 그린다). 타입만 둔다

export type ImportScopeData = { kind: "any" } | { kind: "new" } | { kind: "person"; id: string; name: string; avatar: AvatarConfig | null };

export interface ImportData {
  locale: Locale;
  /** any: 메모에 여러 사람이 있을 수 있다 / person: 그 사람 이야기뿐(편집에서) / new: 아직 없는 한 사람(사람 추가에서) */
  scope: ImportScopeData;
  /** 내 사람들(이름·얼굴): 묶음 머리와 같은 이름 고르기에 쓴다 */
  people: { id: string; name: string; avatar: AvatarConfig | null }[];
  /** 닫으면 돌아갈 곳 */
  back: string;
}
