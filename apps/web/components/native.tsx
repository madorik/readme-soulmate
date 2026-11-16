"use client";

import { translate, type Locale } from "@readme/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Wordmark } from "./chrome";
import { Icon } from "./marks";

// 앱(Capacitor) 안에서만 하는 일: 푸시 토큰 등록, 기기 로컬 생일 알림, Face ID·지문 앱 잠금, 링크로 앱 열기.
// 웹 브라우저에서는 아무것도 하지 않는다.

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return !!w.Capacitor?.isNativePlatform?.();
}

const noop = () => () => {};

/** 앱 안인지(서버 렌더링과 어긋나지 않게 처음엔 false) */
export function useIsNative(): boolean {
  return useSyncExternalStore(noop, isNativeApp, () => false);
}

export interface LocalReminder {
  /** 겹치지 않는 숫자 id(같은 알림을 다시 예약할 때 덮어쓴다) */
  id: number;
  title: string;
  body: string;
  /** 알릴 날짜(기기 시간 오전 9시) */
  y: number;
  m: number;
  d: number;
  path: string;
}

const LOCK_AFTER_MS = 60_000;

export function NativeBridge({ locale, appLock, reminders, pushEnabled }: { locale: Locale; appLock: boolean; reminders: LocalReminder[]; pushEnabled: boolean }) {
  const router = useRouter();
  const native = useIsNative();
  const [unlocked, setUnlocked] = useState(false);
  const locked = native && appLock && !unlocked;
  const hiddenAt = useRef<number | null>(null);
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);

  const unlock = useCallback(async () => {
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const ok = await NativeBiometric.isAvailable({ useFallback: true });
      if (!ok.isAvailable) {
        setUnlocked(true);
        return;
      }
      await NativeBiometric.verifyIdentity({ reason: t("lock.title"), title: t("app.name"), useFallback: true });
      setUnlocked(true);
    } catch {
      // 실패·취소하면 잠긴 채로 둔다
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // 앱 잠금: 처음 열 때와, 1분 넘게 다른 앱에 있다가 돌아올 때
  useEffect(() => {
    if (!native || !appLock) return;
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      void unlock();
      const h = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) hiddenAt.current = Date.now();
        else if (hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS) {
          setUnlocked(false);
          void unlock();
        }
      });
      remove = () => void h.remove();
    })();
    return () => remove?.();
  }, [native, appLock, unlock]);

  // 링크(유니버설 링크·앱 링크)로 열리면 그 화면으로
  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      const h = await App.addListener("appUrlOpen", ({ url }) => {
        if (url.startsWith("kr.readme.app://auth")) return;
        try {
          const u = new URL(url);
          const path = u.protocol.startsWith("http") ? u.pathname + u.search : `/${u.host}${u.pathname}${u.search}`;
          if (path.startsWith("/")) router.push(path);
        } catch {
          /* 모르는 주소는 무시 */
        }
      });
      remove = () => void h.remove();
    })();
    return () => remove?.();
  }, [router]);

  // 바깥 링크(쿠팡 파트너스·지도·적어 둔 링크)는 앱 웹뷰 안에서 열지 않고 인앱 브라우저(사파리·크롬)로.
  // 쿠팡은 웹뷰에서 열면 '권한 없음'으로 막는다. 앱 주소·http 아닌 링크(tel: 등)는 그대로
  useEffect(() => {
    if (!isNativeApp()) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;
      e.preventDefault();
      void import("@capacitor/browser")
        .then(({ Browser }) => Browser.open({ url: url.toString() }))
        .catch(() => window.open(url.toString(), "_blank"));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 푸시 토큰 등록: 서버에 FCM 키가 있을 때만(Firebase 설정 없이 등록하면 Android 앱이 멈출 수 있다)
  useEffect(() => {
    if (!isNativeApp() || !pushEnabled) return;
    void (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { Capacitor } = await import("@capacitor/core");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;
        await PushNotifications.addListener("registration", (token) => {
          void fetch("/api/push", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
          });
        });
        await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
          const path = (a.notification.data as { path?: string } | undefined)?.path;
          if (path?.startsWith("/")) router.push(path);
        });
        await PushNotifications.register();
      } catch {
        /* 푸시 설정이 없는 빌드(Firebase 파일 없음)면 조용히 넘어간다 */
      }
    })();
  }, [router, pushEnabled]);

  // 기기 로컬 알림: 서버 푸시가 없어도 생일 알림이 오게. 다가오는 것만 다시 예약한다
  useEffect(() => {
    if (!isNativeApp()) return;
    void (async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
        const now = Date.now();
        const list = reminders
          .map((r) => ({ ...r, at: new Date(r.y, r.m - 1, r.d, 9, 0, 0) }))
          .filter((r) => r.at.getTime() > now)
          .slice(0, 60)
          // 생일 아침 알림은 몇 분 늦어도 괜찮다. 정확한 알람을 바라면 안드로이드가 '알람 및 리마인더' 설정 화면을 띄우므로 끈다
          .map((r) => ({ id: r.id, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true }, isExactNotification: false, extra: { path: r.path } }));
        if (list.length) await LocalNotifications.schedule({ notifications: list });
        await LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
          const path = (a.notification.extra as { path?: string } | undefined)?.path;
          if (path?.startsWith("/")) router.push(path);
        });
      } catch {
        /* 권한이 없거나 웹이면 넘어간다 */
      }
    })();
  }, [reminders, router]);

  if (!locked) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t("lock.title")} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white px-6">
      <Wordmark locale={locale} />
      <Icon name="lock" size={40} />
      <p className="text-[18px] font-bold">{t("lock.title")}</p>
      <button type="button" onClick={() => void unlock()} className="btn-primary w-full max-w-[320px]">
        {t("lock.unlock")}
      </button>
    </div>
  );
}
