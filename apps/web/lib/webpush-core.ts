// 브라우저 푸시 구독(Web Push) 검사(서버 전용 모듈을 들이지 않는 순수 함수).
// 구독의 endpoint는 브라우저가 알려 주는 주소인데 서버가 거기로 요청을 보내므로, 아무 주소나 받으면 서버가 엉뚱한 곳(내부 주소 등)을 두드리게 된다.
// 그래서 알려진 푸시 서비스(크롬·엣지·삼성 = FCM, 파이어폭스, 사파리, 윈도우)의 https 주소만 받는다.

export interface WebSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const HOSTS: RegExp[] = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** 푸시 서비스 주소로 믿을 수 있는지: https, 기본 포트, 아이디·비밀번호 없음, 알려진 호스트 */
export function pushEndpointAllowed(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return false;
  return HOSTS.some((h) => h.test(u.hostname));
}

/** 저장해 둔(또는 브라우저가 보낸) 구독 글을 풀어 검사한다. 모양이 틀리거나 허락하지 않는 주소면 null */
export function parseSubscription(raw: unknown): WebSubscription | null {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } | null };
  const p256dh = o.keys?.p256dh;
  const auth = o.keys?.auth;
  if (!pushEndpointAllowed(o.endpoint)) return null;
  // p256dh는 65바이트 공개키(base64url 약 87자), auth는 16바이트(약 22자)
  if (typeof p256dh !== "string" || typeof auth !== "string" || !B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length < 80 || p256dh.length > 100 || auth.length < 16 || auth.length > 32) return null;
  return { endpoint: o.endpoint, keys: { p256dh, auth } };
}

/** 같은 구독이면 같은 글이 되게(키 순서 상관없이) 저장·비교하는 모양 */
export function canonicalSubscription(sub: WebSubscription): string {
  return JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}
