import type { Locale } from "./locale";

// 사이즈 환산. 브랜드마다 달라서 모두 "대략"으로 보여 준다(화면 문구에 About/약).

/** 신발: 한국 mm → 미국 사이즈 */
export function shoeUs(mm: number, fit: "women" | "men" = "women"): string | null {
  if (!Number.isFinite(mm) || mm < 200 || mm > 320) return null;
  // 여성: 220mm = US 5, 5mm마다 0.5. 남성: 250mm = US 7, 5mm마다 0.5
  const base = fit === "women" ? { mm: 220, us: 5 } : { mm: 250, us: 7 };
  const us = base.us + Math.round((mm - base.mm) / 5) * 0.5;
  if (us < 3) return null;
  return String(us);
}

/** 반지: 한국 호수 → 미국 사이즈. 1호 ≈ US 1 에서 대략 2호마다 1씩 */
const RING_US: Record<number, string> = {
  1: "1", 2: "1.5", 3: "2", 4: "2.5", 5: "3", 6: "3.5", 7: "4", 8: "4.5", 9: "5", 10: "5.5",
  11: "6", 12: "6.5", 13: "6.75", 14: "7", 15: "7.5", 16: "8", 17: "8.25", 18: "8.5", 19: "9", 20: "9.5",
  21: "10", 22: "10.25", 23: "10.5", 24: "11", 25: "11.5", 26: "12", 27: "12.5", 28: "13",
};

export function ringUs(kr: number): string | null {
  return RING_US[kr] ?? null;
}

/** 상의: 한국 표기(여성 44~88, 남성 85~110) → 국제 표기 */
const TOP_INTL: Record<string, string> = {
  "44": "XS", "55": "S", "66": "M", "77": "L", "88": "XL",
  "85": "XS", "90": "S", "95": "M", "100": "L", "105": "XL", "110": "XXL",
};

export function topIntl(kr: string): string | null {
  const v = kr.trim().toUpperCase();
  if (TOP_INTL[v]) return TOP_INTL[v]!;
  return ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(v) ? v : null;
}

export const TOP_OPTIONS = ["44", "55", "66", "77", "88", "85", "90", "95", "100", "105", "110", "XS", "S", "M", "L", "XL", "XXL"];

export interface SizeLine {
  value: string;
  unit: string;
  hint: string | null;
}

/** 화면 한 칸에 보일 값·단위·환산(보는 사람 언어 기준) */
export function describeShoe(mm: number | null, locale: Locale): SizeLine | null {
  if (mm == null) return null;
  const us = shoeUs(mm);
  return { value: String(mm), unit: "mm", hint: us ? (locale === "ko" ? `미국 여성 ${us} 정도` : `About US women's ${us}`) : null };
}

export function describeRing(kr: number | null, locale: Locale): SizeLine | null {
  if (kr == null) return null;
  const us = ringUs(kr);
  return locale === "ko"
    ? { value: String(kr), unit: "호", hint: us ? `미국 ${us} 정도` : null }
    : { value: String(kr), unit: "KR", hint: us ? `About US ${us}` : null };
}

export function describeTop(kr: string | null, locale: Locale): SizeLine | null {
  if (!kr) return null;
  const intl = topIntl(kr);
  const isNumeric = /^\d+$/.test(kr.trim());
  if (locale === "ko") return { value: kr, unit: isNumeric && intl ? intl : "", hint: null };
  return { value: kr, unit: isNumeric ? "KR" : "", hint: isNumeric && intl ? `About US ${intl}` : null };
}
