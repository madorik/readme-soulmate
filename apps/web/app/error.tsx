"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

// 앱 화면 틀 밖(시작·로그인·온보딩·(app) 레이아웃 자체)에서 난 오류
export default function RootError({ reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  return <ErrorScreen retry={retry ?? reset} wrap />;
}
