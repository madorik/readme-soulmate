import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/data";
import { canonicalSubscription, parseSubscription } from "@/lib/webpush-core";

// 기기가 받은 푸시 토큰을 저장·지운다(로그인한 사람 것만).
// 앱(안드로이드·iOS)은 FCM 토큰 글을, 웹 브라우저는 푸시 구독(JSON 글)을 보낸다. 구독은 알려진 푸시 서비스 주소만 받고, 같은 구독이면 같은 글로 저장한다
const MAX_PER_USER = 20;

async function readToken(request: NextRequest): Promise<{ token: string; platform: "ios" | "android" | "web" } | null> {
  const body = (await request.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : "web";
  if (platform === "web") {
    const sub = parseSubscription(body?.token);
    return sub ? { token: canonicalSubscription(sub), platform } : null;
  }
  const token = typeof body?.token === "string" ? body.token.slice(0, 4096) : "";
  return token ? { token, platform } : null;
}

export async function POST(request: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const t = await readToken(request);
  if (!t) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await s.tx(async (q) => {
    // 한 사람이 끝없이 쌓지 못하게(오래된 것부터 밀려난다)
    const n = await q.one<{ n: number }>("select count(*)::int as n from push_tokens where user_id = $1 and token <> $2", [s.user.id, t.token]);
    if ((n?.n ?? 0) >= MAX_PER_USER) await q("delete from push_tokens where ctid in (select ctid from push_tokens where user_id = $1 order by created_at limit 1)", [s.user.id]);
    await q("insert into push_tokens (user_id, token, platform) values ($1, $2, $3) on conflict (user_id, token) do update set platform = excluded.platform", [s.user.id, t.token, t.platform]);
    return true;
  });
  return NextResponse.json({ ok });
}

/** 이 기기(브라우저)의 알림을 끈다 */
export async function DELETE(request: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const t = await readToken(request);
  if (!t) return NextResponse.json({ ok: false }, { status: 400 });
  await s.tx((q) => q("delete from push_tokens where user_id = $1 and token = $2", [s.user.id, t.token]));
  return NextResponse.json({ ok: true });
}
