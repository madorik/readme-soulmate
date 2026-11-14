import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/data";

// 앱이 받은 푸시 토큰을 저장한다(로그인한 사람 것만)
export async function POST(request: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.slice(0, 4096) : "";
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : "web";
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });
  await s.tx((q) => q("insert into push_tokens (user_id, token, platform) values ($1, $2, $3) on conflict (user_id, token) do update set platform = excluded.platform", [s.user.id, token, platform]));
  return NextResponse.json({ ok: true });
}
