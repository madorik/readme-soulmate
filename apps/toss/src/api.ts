import { authCode, inToss, loadValue, saveValue } from "./bridge";

// 서버(apps/web의 /api/t) 부르기. 토큰이 없거나 만료됐으면 토스에서 일회용 코드를 받아 한 번 다시 로그인한다.
// 개발(브라우저)에서는 이 기기에 둔 무작위 값으로 개발용 로그인을 한다(운영 서버는 받지 않는다)

// 개발: 이 맥의 웹 개발 서버(휴대폰 샌드박스로 볼 때는 VITE_API_BASE=http://<맥 IP>:3200)
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "") || (import.meta.env.DEV ? "http://localhost:3200" : "https://remember-you.watalabs.com");

const TOKEN_KEY = "ry_token";
const DEV_KEY = "ry_dev";

let token: string | null = null;
let signing: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

async function devId(): Promise<string> {
  let id = await loadValue(DEV_KEY);
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 12)}`;
    await saveValue(DEV_KEY, id);
  }
  return id;
}

async function signIn(): Promise<string | null> {
  const code = inToss() ? await authCode() : null;
  const body = code ? { code } : import.meta.env.DEV ? { dev: await devId() } : null;
  if (!body) return null;
  const res = await fetch(`${API_BASE}/api/t/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return null;
  const j = (await res.json()) as { token?: string };
  if (!j.token) return null;
  token = j.token;
  await saveValue(TOKEN_KEY, token);
  return token;
}

async function currentToken(): Promise<string | null> {
  if (token) return token;
  token = await loadValue(TOKEN_KEY);
  if (token) return token;
  signing ??= signIn().finally(() => (signing = null));
  return signing;
}

/** 로그아웃(기록을 지운 뒤): 다음 부를 때 새로 로그인한다 */
export async function forgetToken(): Promise<void> {
  token = null;
  await saveValue(TOKEN_KEY, null);
}

/** 로그인 없이도 되는 부르기(물어보기 답하기). 이미 로그인돼 있으면 토큰을 같이 보내지만 새로 로그인하지는 않는다 */
export async function publicApi<T>(path: string, json?: unknown): Promise<T> {
  const tok = token ?? (await loadValue(TOKEN_KEY));
  const headers: Record<string, string> = {};
  if (tok) headers.authorization = `Bearer ${tok}`;
  if (json !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${API_BASE}/api/t/${path}`, { method: json !== undefined ? "POST" : "GET", headers, body: json !== undefined ? JSON.stringify(json) : undefined });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && !data.error) throw new ApiError(res.status, "failed");
  return data;
}

export async function api<T>(path: string, init: { method?: string; json?: unknown; body?: BodyInit; type?: string } = {}): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const tok = await currentToken();
    if (!tok) throw new ApiError(401, "login");
    const headers: Record<string, string> = { authorization: `Bearer ${tok}` };
    if (init.json !== undefined) headers["content-type"] = "application/json";
    else if (init.type) headers["content-type"] = init.type;
    const res = await fetch(`${API_BASE}/api/t/${path}`, {
      method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    if (res.status === 401 && attempt === 0) {
      await forgetToken();
      continue;
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new ApiError(res.status, data.error ?? "failed");
    return data;
  }
  throw new ApiError(401, "login");
}
