import "server-only";
import { createPrivateKey, createSign } from "node:crypto";
import { asSystem } from "./db";

// 애플로 로그인: 클라이언트 시크릿(ES256 JWT, 최대 6개월)을 키로 그때그때 만든다(손으로 바꿔 넣지 않게).
//   APPLE_CLIENT_ID(Services ID, kr.readme.app.web) · APPLE_TEAM_ID · APPLE_KEY_ID · APPLE_PRIVATE_KEY(.p8, 줄바꿈은 \n)
//   예전처럼 APPLE_CLIENT_SECRET을 직접 넣었으면 그것을 쓴다.

const b64url = (v: Buffer | string) => Buffer.from(v).toString("base64url");
let cached: { secret: string; at: number } | null = null;
const DAY = 24 * 60 * 60;

export function appleClientSecret(): string | null {
  if (process.env.APPLE_CLIENT_SECRET) return process.env.APPLE_CLIENT_SECRET;
  const { APPLE_PRIVATE_KEY: key, APPLE_KEY_ID: kid, APPLE_TEAM_ID: team, APPLE_CLIENT_ID: client } = process.env;
  if (!key || !kid || !team || !client) return null;
  const now = Math.floor(Date.now() / 1000);
  // 150일짜리를 만들고 30일마다 새로(오래 사는 서버도 만료 전에 바뀐다)
  if (cached && now - cached.at < 30 * DAY) return cached.secret;
  try {
    const head = b64url(JSON.stringify({ alg: "ES256", kid }));
    const body = b64url(JSON.stringify({ iss: team, iat: now, exp: now + 150 * DAY, aud: "https://appleid.apple.com", sub: client }));
    const sig = createSign("SHA256").update(`${head}.${body}`).sign({ key: createPrivateKey(key.replace(/\\n/g, "\n")), dsaEncoding: "ieee-p1363" });
    cached = { secret: `${head}.${body}.${b64url(sig)}`, at: now };
    return cached.secret;
  } catch (e) {
    console.warn("apple client secret failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** 계정을 지울 때 애플 로그인 권한도 끊는다(Apple 요구). 실패해도 계정 삭제는 계속한다 */
export async function revokeApple(userId: string): Promise<void> {
  const secret = appleClientSecret();
  const client = process.env.APPLE_CLIENT_ID;
  if (!secret || !client) return;
  try {
    const rows = await asSystem((q) => q<{ refreshToken: string | null; accessToken: string | null }>(`select "refreshToken", "accessToken" from account where "userId" = $1 and "providerId" = 'apple'`, [userId]));
    for (const r of rows) {
      const token = r.refreshToken ?? r.accessToken;
      if (!token) continue;
      await fetch("https://appleid.apple.com/auth/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: client, client_secret: secret, token, token_type_hint: r.refreshToken ? "refresh_token" : "access_token" }),
        signal: AbortSignal.timeout(5000),
      });
    }
  } catch (e) {
    console.warn("apple revoke failed", e instanceof Error ? e.message : e);
  }
}
