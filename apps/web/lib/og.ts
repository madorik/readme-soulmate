import { BRAND, type Locale } from "@readme/core";
import type { Metadata } from "next";

// 링크 미리보기(카카오톡·문자·메신저): 제목·설명·이미지(public/og.png, 1200×630)
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630 };

/** 링크 미리보기 언어: 미리보기 수집기는 언어를 안 보낼 때가 많아, 보낸 사람 이름에 한글이 있으면 한국어로 */
export function previewLocale(locale: Locale, name: string | undefined): Locale {
  return name && /[가-힣]/.test(name) ? "ko" : locale;
}

export function siteDescription(locale: Locale): string {
  return locale === "ko" ? "가까운 사람끼리 취향, 못 먹는 음식, 사이즈, 생일을 나누는 컨닝페이퍼" : "A cheat sheet of favorites, food restrictions, sizes and birthdays, shared only with the people closest to you";
}

/** 화면마다 openGraph를 통째로 다시 적어야 이미지가 빠지지 않는다(Next는 openGraph를 얕게 합친다) */
export function ogMetadata(locale: Locale, title: string, description = siteDescription(locale)): Metadata {
  return {
    title,
    description,
    openGraph: { type: "website", siteName: BRAND[locale].name, title, description, locale: locale === "ko" ? "ko_KR" : "en_US", images: [{ ...OG_IMAGE, alt: BRAND[locale].title }] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
