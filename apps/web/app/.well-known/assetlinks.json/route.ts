import { APP_ID } from "@readme/core";
import { NextResponse } from "next/server";

// 환경 변수를 요청 때 읽는다(빌드 때 굳히면 값을 바꿔도 다시 빌드 캐시가 옛 값을 낸다)
export const dynamic = "force-dynamic";

// Android 앱 링크: 서명 인증서 SHA-256(콜론 포함, 여러 개면 쉼표)이 ANDROID_SHA256_FINGERPRINTS에 있어야 한다
export function GET() {
  const prints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const body = prints.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: prints } }]
    : [];
  return NextResponse.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
