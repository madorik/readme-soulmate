import "server-only";
import { isLocale, pickLocale, type Locale } from "@readme/core";
import { cookies, headers } from "next/headers";

/** 사람이 직접 고른 언어(로그인 전에도 남는다) */
export const LOCALE_COOKIE = "readme_locale";
/** 기기(시스템) 언어. 웹뷰가 Accept-Language를 안 보내는 경우가 있어서 화면이 뜬 뒤 브라우저가 적어 둔다(components/LocaleSync) */
export const SYSTEM_LOCALE_COOKIE = "readme_sys_locale";

/** 직접 고른 언어(쿠키)가 있으면 그것 */
export async function chosenLocale(): Promise<Locale | null> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : null;
}

/** 직접 고른 게 없을 때 쓰는 언어: 고른 쿠키 → 기기 언어 쿠키 → 브라우저 언어 */
export async function detectLocale(): Promise<Locale> {
  const jar = await cookies();
  const chosen = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  const system = jar.get(SYSTEM_LOCALE_COOKIE)?.value;
  if (isLocale(system)) return system;
  return pickLocale((await headers()).get("accept-language"));
}

/** 로그인했으면 프로필이 정한 언어(직접 고른 것 또는 시스템), 아니면 detectLocale */
export async function requestLocale(profileLocale?: string | null): Promise<Locale> {
  if (isLocale(profileLocale)) return profileLocale;
  return detectLocale();
}

export { makeT, type T } from "./t";
