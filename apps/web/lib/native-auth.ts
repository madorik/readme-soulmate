"use client";

import { APP_ID } from "@readme/core";
import { authClient } from "./auth-client";

// 앱(웹뷰)에서 구글·애플 로그인: 구글은 웹뷰 안 로그인을 막아서 시스템 브라우저로 한다.
// 1) 시스템 브라우저로 /auth/app/start?provider=… 를 연다 → 거기서 평소처럼 로그인
// 2) 로그인이 끝나면 /auth/app/done 이 원타임 토큰을 만들어 kr.readme.app://auth?ott=… 로 앱을 연다
// 3) 앱이 토큰을 확인하면(웹뷰에서 /api/auth/one-time-token/verify) 웹뷰에 세션 쿠키가 생긴다

export const APP_AUTH_PREFIX = `${APP_ID}://auth`;

export async function appSignIn(provider: "google" | "apple", next: string): Promise<boolean> {
  const [{ Browser }, { App }] = await Promise.all([import("@capacitor/browser"), import("@capacitor/app")]);
  return new Promise((resolve) => {
    let settled = false;
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      for (const h of handles) void h.then((x) => x.remove());
      resolve(ok);
    };
    handles.push(
      App.addListener("appUrlOpen", async ({ url }) => {
        if (!url.startsWith(APP_AUTH_PREFIX)) return;
        await Browser.close().catch(() => {});
        const token = new URL(url.replace(`${APP_ID}://`, "https://app/")).searchParams.get("ott");
        if (!token) return finish(false);
        const r = await authClient.oneTimeToken.verify({ token });
        if (r.error) return finish(false);
        finish(true);
        window.location.assign(next);
      }),
    );
    // 사용자가 브라우저를 닫았다(딥링크로 돌아오며 닫힌 것일 수도 있어 잠깐 기다린다)
    handles.push(Browser.addListener("browserFinished", () => setTimeout(() => finish(false), 1500)));
    Browser.open({ url: `${window.location.origin}/auth/app/start?provider=${provider}` }).catch(() => finish(false));
  });
}
