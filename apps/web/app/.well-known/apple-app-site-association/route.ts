import { APP_ID } from "@readme/core";
import { NextResponse } from "next/server";

// 환경 변수를 요청 때 읽는다(빌드 때 굳히면 값을 바꿔도 다시 빌드 캐시가 옛 값을 낸다)
export const dynamic = "force-dynamic";

// iOS 유니버설 링크: 물어보기(/r/*) 링크를 앱이 있으면 앱으로 연다. APPLE_TEAM_ID가 있어야 한다
export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  const body = {
    applinks: {
      details: team ? [{ appIDs: [`${team}.${APP_ID}`], components: [{ "/": "/r/*" }] }] : [],
    },
    webcredentials: { apps: team ? [`${team}.${APP_ID}`] : [] },
  };
  return NextResponse.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
