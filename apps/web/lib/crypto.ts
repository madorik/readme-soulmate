import "server-only";
import { SENSITIVE_SECTIONS, type Section } from "@readme/core";
import { aad, openWith, sealWith, type Payload } from "./crypto-core";

let cached: Buffer | null = null;
function key(): Buffer {
  if (!cached) {
    cached = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
    if (cached.length !== 32) throw new Error("DATA_ENCRYPTION_KEY is missing or not 32 bytes (run pnpm env:local)");
  }
  return cached;
}

export { aad };

export function sealSection(section: Section, data: unknown, scope: string): Payload {
  return sealWith(key(), data, scope, SENSITIVE_SECTIONS.includes(section));
}

export function seal(data: unknown, scope: string): Payload {
  return sealWith(key(), data, scope, true);
}

export function open(payload: unknown, scope: string): unknown | null {
  return openWith(key(), payload, scope);
}
