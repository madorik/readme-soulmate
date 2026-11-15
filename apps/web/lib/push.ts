import "server-only";
import { createSign } from "node:crypto";
import { isLocale, type Locale } from "@readme/core";
import { asSystem } from "@/lib/db";

// Firebase Cloud Messaging(HTTP v1). 서비스 계정 세 값이 있을 때만 보낸다. 없으면 앱의 기기 로컬 알림만 쓴다.
//   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY(줄바꿈은 \n)

let cached: { token: string; exp: number } | null = null;

export function pushConfigured(): boolean {
  return !!(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
}

function b64url(v: Buffer | string): string {
  return Buffer.from(v).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: process.env.FCM_CLIENT_EMAIL, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign((process.env.FCM_PRIVATE_KEY ?? "").replace(/\\n/g, "\n")));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("fcm auth failed");
  cached = { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** 보냈으면 true. 토큰이 더는 쓸 수 없으면 "gone" */
export async function sendPush(token: string, title: string, body: string, path: string): Promise<true | false | "gone"> {
  if (!pushConfigured()) return false;
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title, body }, data: { path }, apns: { payload: { aps: { sound: "default" } } } } }),
  });
  if (res.ok) return true;
  return res.status === 404 || res.status === 400 ? "gone" : false;
}

/** 한 사람의 모든 기기에 보낸다. 알림을 끈 사람이면 보내지 않는다. 실패는 조용히 넘긴다(본 동작을 막지 않게) */
export async function notifyUser(userId: string, title: string, body: string, path: string): Promise<boolean> {
  if (!pushConfigured()) return false;
  try {
    const tokens = await asSystem((q) => q<{ token: string }>("select t.token from push_tokens t join profiles p on p.id = t.user_id where t.user_id = $1 and p.push_enabled", [userId]));
    let sent = false;
    for (const tk of tokens) {
      const r = await sendPush(tk.token, title, body, path);
      if (r === true) sent = true;
      if (r === "gone") await asSystem((q) => q("delete from push_tokens where user_id = $1 and token = $2", [userId, tk.token]));
    }
    return sent;
  } catch {
    return false;
  }
}

/** 받는 사람의 화면 언어로 제목·내용을 만들어 보낸다 */
export async function notifyUserT(userId: string, make: (locale: Locale) => { title: string; body: string; path: string }): Promise<void> {
  if (!pushConfigured()) return;
  try {
    const p = await asSystem((q) => q.one<{ locale: string | null; system_locale: string | null }>("select locale, system_locale from profiles where id = $1", [userId]));
    const locale: Locale = isLocale(p?.locale) ? p!.locale : isLocale(p?.system_locale) ? p!.system_locale : "ko";
    const m = make(locale);
    await notifyUser(userId, m.title, m.body, m.path);
  } catch {
    /* 알림 실패는 본 동작에 영향을 주지 않는다 */
  }
}

