"use client";

import { translate, type Locale } from "@readme/core";
import { useState } from "react";
import { Icon } from "./marks";

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

/** 보낼 링크(읽기 전용). 눌러서 고를 수 있다 */
export function LinkField({ url, label }: { url: string; label: string }) {
  return (
    <input
      readOnly
      value={url}
      aria-label={label}
      data-testid="invite-url"
      onFocus={(e) => e.currentTarget.select()}
      className="field !h-11 truncate !bg-fill text-[13px] text-muted !shadow-none"
    />
  );
}

/** 링크 보내기: 휴대폰 공유창(카카오톡·문자·메일 등 어떤 앱이든) · 링크 복사. 공유창이 없으면 복사한다 */
export function ShareButtons({ locale, url, text, sendLabel }: { locale: Locale; url: string; text: string; sendLabel?: string }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={async () => {
          if (!(await nativeShare(text, url))) await copy();
        }}
        className="btn-primary w-full"
      >
        <Icon name="share" size={19} strokeWidth={2} />
        {sendLabel ?? t("common.send")}
      </button>
      <button type="button" onClick={copy} className="btn-soft !h-12 w-full gap-1.5">
        <Icon name={copied ? "check" : "link"} size={17} />
        {copied ? t("common.copied") : t("common.copyLink")}
      </button>
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
