import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/core는 빌드 없이 TS 소스를 그대로 내보낸다
  transpilePackages: ["@readme/core"],
  // 개발 서버만: 안드로이드 에뮬레이터(호스트 = 10.0.2.2)·같은 와이파이의 휴대폰에서 띄운 앱이 개발 서버 스크립트를 받게
  allowedDevOrigins: ["10.0.2.2", "192.168.*.*"],
  poweredByHeader: false,
  // 운영 DB 마이그레이션 경로(/api/cron/migrate)가 저장소의 db/migrations를 읽도록 함께 싣는다
  outputFileTracingIncludes: { "/api/cron/migrate": ["../../db/migrations/*.sql"] },
  // 탭 막대가 미리 받아 둔 탭 화면은 1분 동안 다시 받지 않는다(서버 액션으로 고치면 바로 새로 받는다).
  // 그냥 본 화면(dynamic)은 기억하지 않는다: 온보딩 전 '홈 → 온보딩' 넘기기 같은 결과를 다시 쓰면 안 된다
  experimental: { staleTimes: { static: 60 } },
  async headers() {
    // 기억해유는 개인 정보 화면이라 다른 사이트 안에 넣지 못하게 하고, 검색에도 안 나오게 한다.
    // 검색에 열어 두는 곳: 시작 화면·선물 가이드(/gifts)·약관류·robots·sitemap·llms.txt(가족에게 보낸 카드 /g·통계 /admin은 닫는다)
    const base = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
    ];
    return [
      { source: "/:path*", headers: base },
      { source: "/((?!$|gifts|terms|privacy-policy|support$|robots\\.txt|sitemap\\.xml|llms\\.txt).*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // 폰트 조각은 파일 이름이 안 바뀌면 내용도 안 바뀐다(바꿀 땐 scripts/fetch-fonts.mjs가 통째로 다시 만든다)
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
