import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/site";
import { storeTarget } from "@/lib/store";
import { isBot, platformOf, track } from "@/lib/track";

// 앱 받기 주소(/get?from=answer&next=/request): 기기에 맞는 스토어로 보낸다(lib/store). 누른 것은 이용 기록으로(어디서 눌렀는지·기기)

export function GET(request: NextRequest) {
  const ua = request.headers.get("user-agent");
  const q = request.nextUrl.searchParams;
  const from = q.get("from") ?? "";
  const source = /^[a-z_]{2,20}$/.test(from) ? from : "link";
  const { url, os } = storeTarget(ua, { source, next: safeNext(q.get("next"), "/"), appStore: process.env.APP_STORE_URL });
  if (!isBot(ua)) track("app_get", { source, os, platform: platformOf(ua) });
  return NextResponse.redirect(new URL(url, request.url), 302);
}
