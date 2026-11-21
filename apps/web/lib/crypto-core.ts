import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// 저장 값 형식. 민감한 항목은 AES-256-GCM으로 암호화하고, 어느 행의 값인지(AAD)를 같이 묶어서
// 다른 사람·다른 항목 행으로 옮겨 붙이면 풀리지 않게 한다.
export type Payload = { v: 1; data: unknown } | { v: 1; enc: string };

export function sealWith(key: Buffer, data: unknown, aad: string, encrypt: boolean): Payload {
  if (!encrypt) return { v: 1, data };
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (base64)");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 1, enc: Buffer.concat([iv, tag, ct]).toString("base64") };
}

/** 풀 수 없으면(키가 다르거나, 다른 행에서 옮겨 왔거나, 모양이 틀리면) null */
export function openWith(key: Buffer, payload: unknown, aad: string): unknown | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== 1) return null;
  if ("data" in p && !("enc" in p)) return p.data ?? null;
  if (typeof p.enc !== "string" || key.length !== 32) return null;
  try {
    const raw = Buffer.from(p.enc, "base64");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(aad, "utf8"));
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 암호화 범위(AAD) 이름 */
export const aad = {
  card: (ownerId: string, section: string) => `card:${ownerId}:${section}`,
  guest: (inviteId: string, section: string) => `guest:${inviteId}:${section}`,
  note: (authorId: string, contactId: string) => `note:${authorId}:${contactId}`,
  prefill: (tokenHash: string) => `prefill:${tokenHash}`,
  /** 링크로 보내는 내 기록(record_shares): 그 링크(토큰 해시)에서만 풀린다 */
  share: (tokenHash: string) => `share:${tokenHash}`,
  /** 내가 직접 적어 둔 사람의 리드미(contact_cards) */
  contact: (authorId: string, contactId: string, section: string) => `contact:${authorId}:${contactId}:${section}`,
};
