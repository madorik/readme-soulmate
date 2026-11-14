// 초대 링크·코드. 토큰은 해시만 저장하고, 링크가 안 열릴 때(앱을 새로 깔았을 때 등)를 위해 짧은 코드도 같이 준다.
// Web Crypto만 써서 브라우저·Node 둘 다에서 돈다.

export const INVITE_TTL_DAYS = 7;
export type InviteKind = "share" | "request";

// 헷갈리는 글자(0 O 1 I L)는 뺐다
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function randomToken(bytes = 32): string {
  const b = randomBytes(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function randomCode(): string {
  // 256을 알파벳 길이로 나눈 나머지 쏠림을 없애려고 범위 밖 값은 버린다
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const x of randomBytes(CODE_LENGTH * 2)) {
      if (x < limit && out.length < CODE_LENGTH) out += CODE_ALPHABET[x % CODE_ALPHABET.length];
    }
  }
  return out;
}

/** 사용자가 친 코드를 정리한다. 소문자·공백·하이픈은 봐준다. 코드에 없는 글자가 있으면 null */
export function normalizeCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, "");
  if (s.length !== CODE_LENGTH || [...s].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return s;
}

export type InviteStatus = "active" | "expired" | "used" | "canceled";

export function inviteStatus(
  invite: { expires_at: string; used_at: string | null; canceled_at: string | null },
  now: Date = new Date(),
): InviteStatus {
  if (invite.canceled_at) return "canceled";
  if (invite.used_at) return "used";
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return "expired";
  return "active";
}

export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}
