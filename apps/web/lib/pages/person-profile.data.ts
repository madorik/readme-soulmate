import type { AvatarConfig, Locale } from "@readme/core";

// 사람 프로필 화면 데이터(lib/pages/person-profile.ts가 만들고 components/pages/PersonProfileView가 그린다). 타입만 둔다

export interface PersonProfileData {
  locale: Locale;
  person: {
    contactId: string;
    /** 앱 사용자와 이어진 사람이면 그 사람 id */
    personId: string | null;
    name: string;
    nickname: string;
    avatar: AvatarConfig | null;
  };
}
