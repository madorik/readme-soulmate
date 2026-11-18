"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

// 앱 화면 안에서 오류가 나면(탭 막대 자리까지 화면이 이 안내로 바뀐다). retry는 서버에서 다시 받아 그리고, 없으면 reset
export default function AppError({ reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  return <ErrorScreen retry={retry ?? reset} />;
}
