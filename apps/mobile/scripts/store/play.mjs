// Google Play Developer API(서비스 계정 RS256 → OAuth 토큰). 맹고와 같은 개발자 계정이라 같은 서비스 계정을 쓴다.
// 키 파일은 저장소 밖: README_PLAY_SA(없으면 ~/.maengo/play-service-account.json). Play Console > 사용자 및 권한에서 이 계정에 리드미 앱 권한이 있어야 한다.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

export const PKG = "kr.readme.app";
const SA_PATH = process.env.README_PLAY_SA || `${homedir()}/.maengo/play-service-account.json`;
const b64u = (b) => Buffer.from(b).toString("base64url");

let tok;
async function token() {
  if (tok) return tok;
  const sa = JSON.parse(readFileSync(SA_PATH, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: sa.token_uri, iat: now, exp: now + 3500 }));
  const s = createSign("RSA-SHA256");
  s.update(`${head}.${body}`);
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${body}.${b64u(s.sign(sa.private_key))}` }),
  });
  tok = (await res.json()).access_token;
  return tok;
}

/** play("POST", "/edits", {}) · 파일 올리기는 { upload: true, contentType } */
export async function play(method, path, body, { upload, contentType } = {}) {
  const base = upload ? "https://androidpublisher.googleapis.com/upload/androidpublisher/v3" : "https://androidpublisher.googleapis.com/androidpublisher/v3";
  const res = await fetch(`${base}/applications/${PKG}${path}${upload ? (path.includes("?") ? "&" : "?") + "uploadType=media" : ""}`, {
    method,
    headers: { authorization: `Bearer ${await token()}`, "content-type": upload ? contentType : "application/json" },
    body: upload ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Play ${method} ${path} → ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : null;
}

/** 새 edit을 열고 fn을 돌린 뒤 커밋한다. 실패하면 edit을 버린다 */
export async function withEdit(fn) {
  const edit = await play("POST", "/edits", {});
  const e = `/edits/${edit.id}`;
  try {
    const out = await fn(e);
    const done = await play("POST", `${e}:commit`);
    return { out, commit: done.id };
  } catch (err) {
    await play("DELETE", e).catch(() => {});
    throw err;
  }
}
