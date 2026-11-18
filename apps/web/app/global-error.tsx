"use client";

import { BRAND } from "@readme/core";
import { ErrorScreen, useUiLocale } from "@/components/ErrorScreen";
// 루트 레이아웃까지 무너졌을 때는 이 파일이 문서 전체를 대신한다. 레이아웃이 넣던 글꼴·스타일을 여기서 다시
import "./fonts.css";
import "./globals.css";

export default function GlobalError({ reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  const locale = useUiLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <title>{BRAND[locale].name}</title>
        <ErrorScreen retry={retry ?? reset} locale={locale} wrap />
      </body>
    </html>
  );
}
