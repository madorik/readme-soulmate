"use client";

import { Analytics } from "@vercel/analytics/next";

// 방문·유입 경로·페이지 통계(Vercel 웹 분석, 쿠키 없이 모아서 본다). 물어보기·가족 카드 주소의 토큰과 쿼리는 빼고 보낸다
export function WebAnalytics() {
  return <Analytics beforeSend={(e) => ({ ...e, url: e.url.replace(/\/(g|r)\/[^/?#]+/, "/$1/[token]").replace(/\?.*$/, "") })} />;
}
