import type { Locale } from "@readme/core";

// 설정의 토스 미니앱 전용 줄. 웹·앱에는 없다(apps/toss/src/shell/TossSettings.tsx가 바꿔 끼운다)

/** 생일·기념일 알림 스위치(토스 알림 동의). 앱의 '알림 받기' 자리 */
export function TossReminderSwitch(props: { locale: Locale; reminder: { template: string; on: boolean } | null }) {
  void props;
  return null;
}

/** 약관·처리방침·문의(토스 화면 안에서 연다) */
export function TossLegalRows(props: { locale: Locale }) {
  void props;
  return null;
}
