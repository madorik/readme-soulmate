import "server-only";
import { createHash, randomInt } from "node:crypto";
import { request } from "node:https";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { getSession } from "./data";
import { asSystem } from "./db";

// 토스 미니앱(앱인토스) 로그인과 CORS.
// 토스 안에서는 구글·애플 로그인을 쓸 수 없고 토스 로그인은 사업자가 있어야 해서, '사용자 식별키'로 계정을 만든다:
//   미니앱이 SDK로 일회용 코드를 받아(User.createAnonymousKeyAuthCode) 보내면, 서버가 mTLS 인증서로 앱인토스에 바꿔 달라고 해서
//   그 미니앱 안에서 늘 같은 사용자 식별키(anonKey)를 받는다. 그 키로 계정(account.providerId = 'toss')을 찾거나 만들고 세션 토큰을 준다.
//   미니앱은 토큰을 Authorization: Bearer로 보낸다(토스 도메인에서 우리 쿠키를 쓸 수 없다).
// 환경 변수: TOSS_APP_NAME(콘솔에 등록한 미니앱 ID, 기본 remember-you), TOSS_MTLS_CERT·TOSS_MTLS_KEY(PEM, 줄바꿈은 \n 또는 base64)

export const TOSS_APP = process.env.TOSS_APP_NAME || "remember-you";
const API_HOST = "apps-in-toss-api.toss.im";

/** 미니앱이 실행되는 주소(SDK 3.1 이상: 실제 서비스·콘솔 QR 테스트) */
export function tossOrigins(): string[] {
  return [`https://${TOSS_APP}.apps.tossmini.com`, `https://${TOSS_APP}.private-apps.tossmini.com`];
}

/** 개발 중: 이 맥의 Vite 개발 서버, 같은 와이파이의 휴대폰(토스 샌드박스 앱)이 여는 개발 서버 */
function devOrigin(origin: string): boolean {
  return process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1|192\.168(\.\d{1,3}){2}|10(\.\d{1,3}){3}):\d{2,5}$/.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !(tossOrigins().includes(origin) || devOrigin(origin))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function pem(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (s.startsWith("-----")) return s.replace(/\\n/g, "\n");
  try {
    const d = Buffer.from(s, "base64").toString("utf8");
    return d.startsWith("-----") ? d : null;
  } catch {
    return null;
  }
}

export function tossLoginConfigured(): boolean {
  return !!(pem(process.env.TOSS_MTLS_CERT) && pem(process.env.TOSS_MTLS_KEY));
}

/** 개발용: 인증서 없이 정해 둔 키로 들어온다(운영에서는 꺼져 있다) */
export function tossDevLogin(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.TOSS_DEV_LOGIN === "1";
}

type TossReply = { resultType?: string; success?: Record<string, unknown> | null; error?: { errorCode?: string; reason?: string } };

/** 앱인토스 서버 API를 mTLS 인증서로 부른다. 인증서가 없으면 null(업무 오류도 HTTP 200에 resultType FAIL로 온다) */
async function tossPost(path: string, payload: unknown, headers: Record<string, string> = {}): Promise<TossReply | null> {
  const cert = pem(process.env.TOSS_MTLS_CERT);
  const key = pem(process.env.TOSS_MTLS_KEY);
  if (!cert || !key) return null;
  const body = JSON.stringify(payload);
  const text = await new Promise<string>((resolve, reject) => {
    const req = request(
      {
        host: API_HOST,
        path,
        method: "POST",
        cert,
        key,
        headers: { ...headers, "content-type": "application/json", "content-length": Buffer.byteLength(body) },
        timeout: 8000,
      },
      (res) => {
        let d = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => (d += c));
        res.on("end", () => resolve(d));
      },
    );
    req.on("timeout", () => req.destroy(new Error(`toss ${path} timeout`)));
    req.on("error", reject);
    req.end(body);
  });
  try {
    return JSON.parse(text) as TossReply;
  } catch {
    console.warn("toss: bad response", path);
    return null;
  }
}

/** 일회용 코드 → 사용자 식별키. 코드가 틀리거나 만료됐으면 null */
export async function exchangeAnonCode(code: string): Promise<string | null> {
  if (!code || code.length > 512) return null;
  const j = await tossPost("/api-partner/v1/apps-in-toss/users/anon-key/exchange", { code });
  const anonKey = j?.success?.anonKey;
  if (j?.resultType === "SUCCESS" && typeof anonKey === "string" && anonKey) return anonKey;
  if (j) console.warn("toss exchange failed", j.resultType, j.error?.errorCode, j.error?.reason);
  return null;
}

/** 생일·기념일 알림 템플릿 코드(콘솔 푸시알림 > 기능성 캠페인, 문구 검수 승인 뒤에만 보낼 수 있다). 없으면 토스 알림을 쓰지 않는다 */
export function tossReminderTemplate(): string | null {
  const v = (process.env.TOSS_REMINDER_TEMPLATE ?? "").trim();
  return v.startsWith(`${TOSS_APP}-`) ? v : null;
}

/**
 * 기능성 메시지 한 통(사용자 식별키로 받는 사람을 정한다). context는 템플릿 변수 값.
 * 받는 사람 1명에 1분 10통까지라 크론에서 한 사람에게 몇 통씩만 보낸다
 */
export async function sendTossMessage(anonKey: string, templateSetCode: string, context: Record<string, string>): Promise<boolean> {
  try {
    const j = await tossPost("/api-partner/v1/apps-in-toss/messenger/send-message", { templateSetCode, context }, { "x-anon-key": anonKey });
    if (j?.resultType === "SUCCESS") return true;
    console.warn("toss message failed", j?.resultType, j?.error?.errorCode, j?.error?.reason);
  } catch (e) {
    console.warn("toss message error", String(e).slice(0, 120));
  }
  return false;
}

/**
 * 사용자 식별키로 계정을 찾아 세션 토큰을 준다. 없으면 create일 때만 새로 만든다(아니면 null: 미니앱이 시작 화면을 보여 준다).
 * 새 계정은 앱처럼 처음 화면(얼굴·음식·생일)부터 시작한다
 */
export async function tossSignIn(anonKey: string, create = true): Promise<string | null> {
  const ctx = await getAuth().$context;
  const found = await ctx.internalAdapter.findAccountByKey({ providerId: "toss", accountId: anonKey });
  let userId = found?.userId ?? null;
  if (!userId) {
    if (!create) return null;
    // 메일 주소는 받지 않는다. 겹치지 않게 키에서 만든 자리 표시
    const tag = createHash("sha256").update(`toss:${anonKey}`).digest("hex").slice(0, 32);
    const { user } = await ctx.internalAdapter.createOAuthUser(
      { email: `${tag}@toss.readme.invalid`, name: "", emailVerified: false },
      { providerId: "toss", accountId: anonKey },
    );
    userId = user.id;
    await asSystem((q) => q("update profiles set locale = coalesce(locale, 'ko') where id = $1", [userId]));
  }
  const session = await ctx.internalAdapter.createSession(userId);
  return session.token;
}

/** 토스에서만 쓰는 계정(시작하기로 만든 것)인지: 메일 자리 표시로 안다 */
export function isTossOnlyEmail(email: string): boolean {
  return email.endsWith("@toss.readme.invalid");
}

/**
 * 토스 미니앱 로그아웃(앱 화면의 로그아웃 메뉴가 부른다). 앱 계정에 연결해 쓰던 것이면 연결을 끊고,
 * 토스에서만 쓰는 계정이면 끊지 않는다(끊으면 그 기록에 다시 들어갈 길이 없다). 세션은 끝내고 시작 화면으로
 */
export async function tossSignOut(): Promise<void> {
  const s = await getSession();
  if (s) {
    if (!isTossOnlyEmail(s.user.email)) await asSystem((q) => q(`delete from account where "userId" = $1 and "providerId" = 'toss'`, [s.user.id]));
    const token = ((await headers()).get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token) await asSystem((q) => q(`delete from session where token = $1`, [token])).catch(() => null);
  }
  redirect("/start");
}

// ── 기존 계정 연결 ─────────────────────────────

/** 헷갈리는 글자(0·O·1·I)를 뺀 8자. 화면에는 4-4로 보인다 */
const LINK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LINK_TTL_MIN = 10;

function linkHash(code: string): string {
  return createHash("sha256").update(`toss-link:${code.toUpperCase().replace(/[^A-Z0-9]/g, "")}`).digest("hex");
}

/** 앱 설정 > 토스에서 쓰기: 이 계정에 이을 코드(10분, 한 번). 새로 만들면 전 코드는 못 쓴다 */
export async function createLinkCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  const raw = Array.from({ length: 8 }, () => LINK_ALPHABET[randomInt(LINK_ALPHABET.length)]).join("");
  const row = await asSystem(async (q) => {
    await q("delete from toss_link_codes where user_id = $1 or expires_at < now()", [userId]);
    return q.one<{ expires_at: Date | string }>(
      `insert into toss_link_codes (code_hash, user_id, expires_at) values ($1, $2, now() + make_interval(mins => $3)) returning expires_at`,
      [linkHash(raw), userId, LINK_TTL_MIN],
    );
  });
  const at = row?.expires_at;
  return { code: `${raw.slice(0, 4)}-${raw.slice(4)}`, expiresAt: at instanceof Date ? at.toISOString() : String(at) };
}

/**
 * 코드로 이 토스 계정(anonKey)을 앱 계정에 잇고 세션 토큰을 준다.
 * 이 토스 계정으로 따로 쓰던 기록이 있으면 섞이지 않게 막는다(비어 있으면 그 토스 전용 계정은 지운다)
 */
export async function linkTossAccount(anonKey: string, code: string): Promise<{ token: string } | { error: "code" | "toss_has_data" }> {
  const target = await asSystem((q) =>
    q.one<{ user_id: string }>("delete from toss_link_codes where code_hash = $1 and expires_at > now() returning user_id", [linkHash(code)]),
  );
  if (!target) return { error: "code" };
  const ctx = await getAuth().$context;
  const found = await ctx.internalAdapter.findAccountByKey({ providerId: "toss", accountId: anonKey });
  if (found && found.userId !== target.user_id) {
    const old = await asSystem((q) =>
      q.one<{ email: string; used: boolean }>(
        `select u.email, (exists (select 1 from contacts where user_id = u.id) or exists (select 1 from card_sections where owner_id = u.id)) as used
           from "user" u where u.id = $1`,
        [found.userId],
      ),
    );
    if (old && isTossOnlyEmail(old.email)) {
      if (old.used) return { error: "toss_has_data" };
      await asSystem((q) => q(`delete from "user" where id = $1`, [found.userId]));
    } else {
      // 다른 앱 계정에 이어져 있던 토스 계정: 이번 계정으로 옮긴다
      await asSystem((q) => q(`delete from account where "providerId" = 'toss' and "accountId" = $1`, [anonKey]));
    }
  }
  if (!found || found.userId !== target.user_id) {
    await asSystem((q) =>
      q(`insert into account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values (gen_random_uuid()::text, $1, 'toss', $2, now(), now())`, [anonKey, target.user_id]),
    );
  }
  const session = await ctx.internalAdapter.createSession(target.user_id);
  return { token: session.token };
}
