import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { BRAND } from "@readme/core";
import { KeyboardInset } from "@/components/KeyboardInset";
import { LocaleSync } from "@/components/LocaleSync";
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
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7fb",
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
        <LocaleSync rendered={locale} chosen={chosen} signedIn={!!session} stored={session?.profile.systemLocale ?? null} />
      </body>
    </html>
  );
}
