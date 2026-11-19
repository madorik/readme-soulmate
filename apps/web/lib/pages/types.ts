import type { AvatarConfig, DateSpec, Locale, PartialCard, ReminderOffset, SafetyData, Section, YMD } from "@readme/core";

// 화면마다 서버가 읽어 주는 데이터 모양(lib/pages/<화면>.ts가 만들고 components/pages/<화면>View가 그린다).
// 토스 미니앱 번들도 읽으므로 타입만 둔다(서버 전용 코드를 들이지 않는다)

export interface MeData {
  locale: Locale;
  name: string;
  avatar: AvatarConfig;
  card: PartialCard;
  today: YMD;
  ai: boolean;
}

export interface MeEditData {
  locale: Locale;
  name: string;
  /** 이름 옆 작은 얼굴 */
  avatar: AvatarConfig;
  card: PartialCard;
  open: Section | null;
}

export interface MeEditSectionData {
  locale: Locale;
  section: Section;
  card: PartialCard;
}

export interface MeAvatarData {
  locale: Locale;
  name: string;
  avatar: AvatarConfig;
}

export interface OnboardingAvatarData {
  locale: Locale;
  name: string;
  avatar: AvatarConfig;
  next: string;
}

export interface OnboardingFoodData {
  locale: Locale;
  safety: SafetyData | null;
  spicy: number | null;
  next: string;
}

export interface OnboardingBirthdayData {
  locale: Locale;
  birthday: DateSpec | null;
  offsets: ReminderOffset[];
  next: string;
}

export interface PrivacyData {
  locale: Locale;
  isAnonymous: boolean;
  invites: { id: string; recipientName: string }[];
  localeChoice: Locale | null;
  appLock: boolean;
  pushEnabled: boolean;
  reminderOffsets: ReminderOffset[];
  ai: boolean;
  /** 토스 미니앱 생일·기념일 알림(템플릿 승인 전이면 null) */
  tossReminder: { template: string; on: boolean } | null;
}

export interface AskPersonData {
  id: string;
  name: string;
  tag: string;
  label: string;
  avatar: AvatarConfig | null;
  missing: Section[];
}

/** 가입 직후 체험 중이면 몇 번째 단계/전체(말로 적기 → 물어보기, AI가 꺼지면 물어보기만) */
export interface TourInfo {
  n: number;
  total: number;
}

export interface RequestData {
  locale: Locale;
  people: AskPersonData[];
  fixed: AskPersonData | null;
  initialName: string;
  defaults: Section[];
  tour: TourInfo | null;
}

export interface VoiceData {
  locale: Locale;
  people: { id: string; name: string; tag: string; avatar: AvatarConfig | null }[];
  tour: TourInfo | null;
}
