import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/core는 빌드 없이 TS 소스를 그대로 내보낸다
  transpilePackages: ["@readme/core"],
  // 개발 서버만: 안드로이드 에뮬레이터(호스트 = 10.0.2.2)·같은 와이파이의 휴대폰에서 띄운 앱이 개발 서버 스크립트를 받게
  allowedDevOrigins: ["10.0.2.2", "192.168.*.*"],
  poweredByHeader: false,
  async headers() {
    // 리드미는 개인 정보 화면이라 다른 사이트 안에 넣지 못하게 하고, 검색에도 안 나오게 한다(시작 화면 제외)
    const base = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
    ];
    return [
      { source: "/:path*", headers: base },
      { source: "/((?!$).*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // 폰트 조각은 파일 이름이 안 바뀌면 내용도 안 바뀐다(바꿀 땐 scripts/fetch-fonts.mjs가 통째로 다시 만든다)
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
