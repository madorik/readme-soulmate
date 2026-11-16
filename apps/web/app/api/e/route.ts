import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/data";
import { isBot, platformOf, trackMany, type TrackInfo } from "@/lib/track";
import { CLIENT_EVENTS, uaInfo, type ClientEvent } from "@/lib/usage";

// 화면에서 보내는 이용 기록(화면 보기·머문 시간·쿠팡 링크 누름·카드 보내기). 로그인 없이 연 화면(시작·가이드·가족 카드)에서도 온다.
// 한 번에 30개까지 { e: [{ n, p, v, i, b, s, r, c }], a: 익명 id }. 로그인했으면 그 사람으로 남긴다. 기기 OS·브라우저는 머리글에서

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return new NextResponse(null, { status: 204 });
  let body: { e?: unknown; a?: unknown; n?: unknown; i?: unknown; b?: unknown; s?: unknown } = {};
  try {
    body = JSON.parse((await request.text()).slice(0, 16_000)) as typeof body;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  // 예전 모양(하나씩 { n, i, b, s })도 받는다
  const raw = Array.isArray(body.e) ? body.e : [body];
  const session = await getSession().catch(() => null);
  const platform = platformOf(ua);
  const { os, browser } = uaInfo(ua);
  const anon = typeof body.a === "string" ? body.a : null;
  const rows = raw
    .slice(0, 30)
    .map((x) => x as Record<string, unknown>)
    .filter((x) => (CLIENT_EVENTS as readonly unknown[]).includes(x.n))
    .map((x) => ({
      name: x.n as ClientEvent,
      info: {
        userId: session?.user.id ?? null,
        anon,
        platform,
        path: typeof x.p === "string" ? x.p : null,
        value: typeof x.v === "number" ? x.v : null,
        item: typeof x.i === "string" ? x.i : null,
        band: typeof x.b === "string" ? x.b : null,
        source: typeof x.s === "string" ? x.s : null,
        ref: typeof x.r === "string" ? x.r : null,
        campaign: typeof x.c === "string" ? x.c : null,
        os,
        browser,
      } satisfies TrackInfo,
    }));
  if (!rows.length) return new NextResponse(null, { status: 400 });
  trackMany(rows);
  return new NextResponse(null, { status: 204 });
}
