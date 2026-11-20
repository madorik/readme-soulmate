import { translate, type Locale, type MessageKey, type Vars } from "@readme/core";

// 번역 함수(서버·화면 어디서나). 서버 전용 코드(lib/i18n)와 나눠 둔다
export type T = (key: MessageKey, vars?: Vars) => string;

export function makeT(locale: Locale): T {
  return (key, vars) => translate(locale, key, vars);
}
