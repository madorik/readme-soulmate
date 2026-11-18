// 앱 화면 주소 표. 웹(Next 페이지)과 토스 미니앱(apps/toss 화면 쌓기)이 같은 주소로 같은 화면을 그린다.
// 서버는 주소 → 데이터 읽기(lib/pages/index.ts), 토스 번들은 주소 → 화면(components/pages/*View)을 이 표로 찾는다

export type PageInput = { params: Record<string, string>; searchParams: Record<string, string | undefined> };

export const ROUTES = [
  "/home",
  "/calendar",
  "/people",
  "/people/new",
  "/people/folder/:id",
  "/people/:id",
  "/people/:id/edit",
  "/people/:id/edit/:section",
  "/people/:id/profile",
  "/people/:id/reminder",
  "/me",
  "/me/edit",
  "/me/edit/:section",
  "/me/avatar",
  "/plan",
  "/plan/gift",
  "/plan/menu",
  "/plan/share",
  "/privacy",
  "/request",
  "/voice",
  "/onboarding/avatar",
  "/onboarding/food",
  "/onboarding/birthday",
] as const;

export type RoutePattern = (typeof ROUTES)[number];

/** "/people/123?x=1" → 패턴과 값. 없는 주소면 null */
export function matchRoute(path: string): { pattern: RoutePattern; input: PageInput } | null {
  const [pathname, query = ""] = path.split("?");
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const searchParams: Record<string, string | undefined> = {};
  for (const [k, v] of new URLSearchParams(query)) if (!(k in searchParams)) searchParams[k] = v;
  for (const pattern of ROUTES) {
    const want = pattern.split("/").filter(Boolean);
    if (want.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < want.length; i++) {
      if (want[i].startsWith(":")) params[want[i].slice(1)] = decodeURIComponent(parts[i]);
      else if (want[i] !== parts[i]) ok = false;
    }
    if (ok) return { pattern, input: { params, searchParams } };
  }
  return null;
}

/** Next 페이지가 받은 searchParams(값이 배열일 수도 있다)를 한 값씩으로 */
export function firstParams(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
