import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { BRAND } from "@readme/core";
import { KeyboardInset } from "@/components/KeyboardInset";
import { LocaleSync } from "@/components/LocaleSync";
import { SplashHide } from "@/components/SplashHide";
import { Tags } from "@/components/Tags";
import { UsageTracker } from "@/components/UsageTracker";
import { WebAnalytics } from "@/components/WebAnalytics";
import { getSession } from "@/lib/data";
import { chosenLocale, requestLocale } from "@/lib/i18n";
import { ogMetadata } from "@/lib/og";
import { SITE_URL } from "@/lib/site";
// 한글 본문(Noto Sans KR)은 조각을 직접 호스팅한다(scripts/fetch-fonts.mjs). 숫자·로고는 Manrope
import "./fonts.css";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  const locale = await requestLocale(session?.profile.locale);
  return {
    metadataBase: new URL(SITE_URL),
    ...ogMetadata(locale, BRAND[locale].title),
    applicationName: BRAND[locale].name,
    appleWebApp: { capable: true, title: BRAND[locale].name, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    // 구글 서치 콘솔·네이버 서치어드바이저 사이트 확인(값은 환경 변수로)
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : undefined,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7fb",
  // 안드로이드 자동 다크·삼성 인터넷 다크 모드가 화면을 뒤집지 않게(앱은 밝은 화면 하나만)
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const locale = await requestLocale(session?.profile.locale);
  const chosen = !!(session?.profile.localeChoice ?? (await chosenLocale()));
  return (
    // 앱 웹뷰(Capacitor)가 화면 여백 값을 <html style>에 넣어서 서버가 그린 것과 다를 수 있다
    <html lang={locale} className={manrope.variable} suppressHydrationWarning>
      <body>
        <div aria-hidden="true" className="bar-mask-top" />
        {children}
        <div aria-hidden="true" className="bar-mask-bottom" />
        <KeyboardInset />
        <SplashHide />
        <LocaleSync rendered={locale} chosen={chosen} signedIn={!!session} stored={session?.profile.systemLocale ?? null} />
        <WebAnalytics />
        <UsageTracker />
        <Tags />
      </body>
    </html>
  );
}
