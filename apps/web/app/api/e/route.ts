import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/data";
import { isBot, track } from "@/lib/track";

// 화면에서 보내는 이용 기록(쿠팡 링크 누름·카드 보내기). 로그인 없이 연 카드에서도 온다. 받는 것은 이름 둘과 선물 id·가격대·어디서뿐
const FROM_CLIENT = ["gift_click", "card_share"] as const;

export async function POST(request: NextRequest) {
  if (isBot(request.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse((await request.text()).slice(0, 1000)) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const name = body.n;
  if (!(FROM_CLIENT as readonly unknown[]).includes(name)) return new NextResponse(null, { status: 400 });
  const session = await getSession().catch(() => null);
  track(name as (typeof FROM_CLIENT)[number], { userId: session?.user.id ?? null, item: String(body.i ?? ""), band: String(body.b ?? ""), source: String(body.s ?? "") });
  return new NextResponse(null, { status: 204 });
}
