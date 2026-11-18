import "server-only";
import { headers } from "next/headers";
import { corsHeaders } from "./toss";

// 서버에서 이 요청이 토스 미니앱에서 왔는지(토스 주소에서 부른 /api/t 요청). 토스 정책 때문에 다르게 줄 것(쿠팡 파트너스 링크 등)에 쓴다
export async function isTossRequest(): Promise<boolean> {
  const origin = (await headers()).get("origin");
  return !!origin && !!corsHeaders(origin)["Access-Control-Allow-Origin"];
}
