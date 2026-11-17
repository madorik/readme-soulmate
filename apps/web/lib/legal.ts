import { isLocale, type Locale } from "@readme/core";
import { requestLocale } from "./i18n";

// 약관·처리방침의 운영자. 맹고와 같은 개발자 계정(개인사업자 와타랩스)이라 같은 연락처를 쓴다.
// 처리 항목·위탁처가 바뀌면(푸시 켜기, 분석 도구 등) 처리방침과 시행일을 같이 고친다.
export const OPERATOR = { ko: "와타랩스", en: "WataLabs" } as const;
export const CEO = { ko: "정민균", en: "Mingyun Jeong" } as const;
export const SUPPORT_EMAIL = "watalabs.help@gmail.com";
export const LEGAL_EFFECTIVE_ON = "2026-11-17";

/** 약관류는 ?lang=en|ko 로 언어를 고를 수 있다(스토어 등록 화면에 언어별 주소를 넣으려고) */
export async function legalLocale(lang: string | undefined): Promise<Locale> {
  return isLocale(lang) ? lang : requestLocale();
}

export function formatEffective(locale: Locale): string {
  const [y, m, d] = LEGAL_EFFECTIVE_ON.split("-").map(Number);
  return locale === "ko" ? `${y}년 ${m}월 ${d}일` : new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
