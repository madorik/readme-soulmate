import { APP_ID } from "@readme/core";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";

// 시스템 브라우저에서 로그인이 끝난 곳: 3분짜리 원타임 토큰을 만들어 앱으로 돌려보낸다(lib/native-auth.ts)
export async function GET(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(`${APP_ID}://auth?${q}`);
  if (request.nextUrl.searchParams.get("error")) return back("error=1");
  try {
    const { token } = await getAuth().api.generateOneTimeToken({ headers: request.headers });
    return back(`ott=${encodeURIComponent(token)}`);
  } catch {
    return back("error=1");
  }
}
