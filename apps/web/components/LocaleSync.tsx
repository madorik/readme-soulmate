"use client";

import type { Locale } from "@readme/core";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { rememberSystemLocale } from "@/app/actions/auth";

const COOKIE = "readme_sys_locale";

function deviceLocale(): Locale {
  const lang = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  return lang.startsWith("ko") ? "ko" : "en";
}

/**
 * 기본 언어 = 기기(시스템) 언어. 서버는 Accept-Language로 먼저 그리고, 웹뷰처럼 그 값이 없거나 다르면
 * 여기서 기기 언어를 쿠키에 적고 한 번 다시 그린다. 직접 고른 언어가 있으면 건드리지 않는다.
 */
export function LocaleSync({ rendered, chosen, signedIn, stored }: { rendered: Locale; chosen: boolean; signedIn: boolean; stored: Locale | null }) {
  const router = useRouter();
  useEffect(() => {
    const device = deviceLocale();
    const current = document.cookie.match(/(?:^|; )readme_sys_locale=(ko|en)/)?.[1];
    if (current !== device) document.cookie = `${COOKIE}=${device}; path=/; max-age=31536000; samesite=lax`;
    if (signedIn && stored !== device) void rememberSystemLocale(device);
    if (!chosen && device !== rendered) router.refresh();
  }, [rendered, chosen, signedIn, stored, router]);
  return null;
}
