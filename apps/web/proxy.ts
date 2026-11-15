import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { LEGACY_HOSTS, SITE_URL } from "@/lib/site";

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

/**
 * 예전 주소(readme.watalabs.com)로 온 브라우저는 지금 주소로 옮긴다(운영 주소가 바뀐 뒤에만).
 * 예전 주소를 띄우는 이미 깔린 앱(웹뷰, 'ReadmeApp')·앱 링크 확인 파일·API는 그대로 둔다
 */
function legacyRedirect(request: NextRequest): NextResponse | null {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (!LEGACY_HOSTS.includes(host) || !SITE_URL.startsWith("https://") || new URL(SITE_URL).host === host) return null;
  const { pathname, search } = request.nextUrl;
  if (/ReadmeApp/.test(request.headers.get("user-agent") ?? "") || pathname.startsWith("/api/") || pathname.startsWith("/.well-known/")) return null;
  return NextResponse.redirect(new URL(pathname + search, SITE_URL), 308);
}

export function proxy(request: NextRequest) {
  const moved = legacyRedirect(request);
  if (moved) return moved;
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
