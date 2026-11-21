import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 검색·AI 로봇: 시작 화면·선물 가이드·약관·llms.txt만 열고, 개인 화면(로그인 뒤)·가족 카드·통계·API는 닫는다(머리글 X-Robots-Tag와 같은 방침)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gifts", "/terms", "/privacy-policy", "/llms.txt"],
        disallow: ["/home", "/people", "/me", "/privacy", "/request", "/voice", "/plan", "/calendar", "/onboarding", "/login", "/delete-account", "/r/", "/g/", "/s/", "/admin", "/api/", "/auth/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
