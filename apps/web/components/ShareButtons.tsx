"use client";

import { translate, type Locale } from "@readme/core";
import { useState } from "react";
import { Icon, KakaoGlyph } from "./marks";

type CapShare = { share: (o: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<unknown> };

/** 앱(Capacitor)이면 네이티브 공유, 아니면 브라우저 공유, 그것도 없으면 false */
export async function nativeShare(text: string, url?: string): Promise<boolean> {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Share?: CapShare } } };
  try {
    if (w.Capacitor?.isNativePlatform?.() && w.Capacitor.Plugins?.Share) {
      await w.Capacitor.Plugins.Share.share({ text, url, dialogTitle: text });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ text, url });
      return true;
    }
  } catch (e) {
    // 사용자가 공유창을 닫은 것도 성공으로 본다
    if (e instanceof Error && e.name === "AbortError") return true;
  }
  return false;
}

type KakaoSdk = { isInitialized: () => boolean; init: (key: string) => void; Share: { sendDefault: (o: unknown) => void } };

async function loadKakao(key: string): Promise<KakaoSdk | null> {
  const w = window as unknown as { Kakao?: KakaoSdk };
  if (!w.Kakao) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("kakao sdk"));
      document.head.appendChild(s);
    }).catch(() => null);
  }
  if (!w.Kakao) return null;
  if (!w.Kakao.isInitialized()) w.Kakao.init(key);
  return w.Kakao;
}

/** 링크 하나를 보내는 버튼 묶음: 카카오톡 · 링크 복사 · 다른 앱 */
export function ShareButtons({ locale, url, text, kakaoLabel }: { locale: Locale; url: string; text: string; kakaoLabel?: string }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const [copied, setCopied] = useState(false);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      const area = document.createElement("textarea");
      area.value = `${text}\n${url}`;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
  };

  const kakao = async () => {
    if (kakaoKey) {
      const sdk = await loadKakao(kakaoKey);
      if (sdk) {
        sdk.Share.sendDefault({ objectType: "text", text, link: { mobileWebUrl: url, webUrl: url }, buttonTitle: locale === "ko" ? "열기" : "Open" });
        return;
      }
    }
    if (!(await nativeShare(text, url))) await copy();
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        readOnly
        value={url}
        aria-label={t("common.copyLink")}
        data-testid="invite-url"
        onFocus={(e) => e.currentTarget.select()}
        className="field mb-2 truncate text-[13px] text-muted"
      />
      <button type="button" onClick={kakao} className="btn-kakao">
        <KakaoGlyph />
        {kakaoLabel ?? t("common.kakao")}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="btn-soft gap-1.5">
          <Icon name={copied ? "check" : "link"} size={17} />
          {copied ? t("common.copied") : t("common.copyLink")}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!(await nativeShare(text, url))) await copy();
          }}
          className="btn-soft gap-1.5"
        >
          <Icon name="share" size={17} />
          {t("common.otherApps")}
        </button>
      </div>
    </div>
  );
}

/** 글만 나누기(예: 생일 준비를 가족에게) */
export function ShareTextButton({ text, label, doneLabel, className = "" }: { text: string; label: string; doneLabel: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (!(await nativeShare(text))) {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            /* 복사도 안 되면 그대로 둔다 */
          }
        }
        setDone(true);
      }}
    >
      {done ? doneLabel : label}
    </button>
  );
}
