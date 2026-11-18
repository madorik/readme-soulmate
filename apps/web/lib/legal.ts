import { isLocale, type Locale } from "@readme/core";
import { requestLocale } from "./i18n";

export { CEO, formatEffective, LEGAL_EFFECTIVE_ON, OPERATOR, SUPPORT_EMAIL } from "./legal-info";

/** 약관류는 ?lang=en|ko 로 언어를 고를 수 있다(스토어 등록 화면에 언어별 주소를 넣으려고) */
export async function legalLocale(lang: string | undefined): Promise<Locale> {
  return isLocale(lang) ? lang : requestLocale();
}
