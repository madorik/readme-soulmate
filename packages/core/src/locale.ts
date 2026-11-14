export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(v: unknown): v is Locale {
  return v === "ko" || v === "en";
}

/** Accept-Language 같은 문자열에서 고른다. 한국어가 아니면 영어 */
export function pickLocale(v: string | null | undefined): Locale {
  if (!v) return DEFAULT_LOCALE;
  const first = v.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("ko")) return "ko";
  if (first.startsWith("en")) return "en";
  return v.toLowerCase().includes("ko") ? "ko" : "en";
}

/** 한·영 이름표. 사전 항목은 코드로 저장하고 보는 사람 언어로 보여 준다 */
export type Label = Record<Locale, string>;
