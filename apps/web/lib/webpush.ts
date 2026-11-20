import "server-only";
import { sendNotification } from "web-push";
import { parseSubscription } from "./webpush-core";

// 웹 브라우저 푸시(VAPID). 키 세 값이 있을 때만 켠다. 없으면 브라우저 알림 스위치도 숨기고 보내지도 않는다.
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (web-push generate-vapid-keys), VAPID_SUBJECT(mailto:… 또는 https 주소)
// 앱(안드로이드·iOS)은 이걸 쓰지 않는다: 생일 알림은 기기 로컬 알림, 답장 알림은 FCM(lib/push)

export function webPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

/** 브라우저가 구독할 때 쓰는 공개 키(없으면 null) */
export function webPushPublicKey(): string | null {
  return webPushConfigured() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
}

const TIMEOUT_MS = 8000;
/** 못 받은 알림은 12시간까지만 맡겨 둔다(생일 알림이 며칠 뒤에 뜨면 안 된다) */
const TTL_SECONDS = 12 * 60 * 60;

/** 보냈으면 true. 이 구독은 더 못 쓴다고(404·410) 하거나 저장된 모양이 틀리면 "gone", 그 밖의 실패는 false */
export async function sendWebPush(token: string, payload: { title: string; body: string; path: string }): Promise<true | false | "gone"> {
  if (!webPushConfigured()) return false;
  const sub = parseSubscription(token);
  if (!sub) return "gone";
  try {
    await sendNotification(sub, JSON.stringify(payload), {
      TTL: TTL_SECONDS,
      timeout: TIMEOUT_MS,
      vapidDetails: { subject: process.env.VAPID_SUBJECT as string, publicKey: process.env.VAPID_PUBLIC_KEY as string, privateKey: process.env.VAPID_PRIVATE_KEY as string },
    });
    return true;
  } catch (e) {
    const status = (e as { statusCode?: unknown } | null)?.statusCode;
    if (status === 404 || status === 410) return "gone";
    console.warn("web push failed", status ?? (e instanceof Error ? e.message : e));
    return false;
  }
}
