import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// 로그인해야 보이는 화면은 세션 쿠키가 없으면 시작 화면으로 보낸다(진짜 확인은 각 화면의 getSession이 한다).
// 로그인 없이 열리는 곳: 시작·로그인·물어보기에 답하기(/r)·로그인 API·앱 로그인 넘기기·크론·약관류·앱 링크 확인 파일
const PUBLIC = [
  /^\/$/,
  /^\/login/,
  /^\/r\//,
  /^\/api\/auth\//,
  /^\/auth\//,
  /^\/api\/cron\//,
  /^\/privacy-policy/,
  /^\/terms/,
  /^\/delete-account/,
  /^\/\.well-known\//,
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.some((p) => p.test(pathname)) || getSessionCookie(request)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon|icon|apple-icon|manifest|robots|og\\.png).*)"],
};
