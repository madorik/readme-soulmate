import { translate, type Locale } from "@readme/core";
import { useState } from "react";
import { Icon } from "@/components/marks";
import { tossAskPath } from "@/lib/toss-api";
import { APP_NAME, shareDeepLink } from "../bridge";

// components/ShareButtons 대신: 토스 공유 시트(Share.sendMessage)로 보낸다. 물어보기 링크(/r/토큰)는 토스에서 열리는 공유 링크로 바꾼다.
// 우리 사이트 주소를 화면에 늘어놓지 않는다(LinkField는 그리지 않음)

function deepLink(url?: string): string | undefined {
  if (!url) return undefined;
  const ask = url.match(/\/r\/([\w-]{8,128})/);
  return ask ? tossAskPath(APP_NAME, ask[1]) : url;
}

export async function nativeShare(text: string, url?: string): Promise<boolean> {
  const link = deepLink(url);
  const r = link ? await shareDeepLink(link, text) : await shareDeepLink("", text);
  return r !== "failed";
}

export function LinkField(_: { url: string; label: string }) {
  return null;
}

export function ShareButtons({ locale, url, text, sendLabel }: { locale: Locale; url: string; text: string; sendLabel?: string }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={async () => {
          const r = await shareDeepLink(deepLink(url) ?? "", text);
          setState(r === "copied" ? "copied" : r === "failed" ? "failed" : "idle");
        }}
        className="btn-primary w-full"
      >
        <Icon name="share" size={19} strokeWidth={2} />
        {sendLabel ?? t("common.send")}
      </button>
      {state === "copied" ? (
        <p role="status" className="flex items-center justify-center gap-1.5 text-[14px] font-medium text-ok">
          <Icon name="check" size={15} strokeWidth={2.4} />
          {t("common.copied")}
        </p>
      ) : state === "failed" ? (
        <p role="alert" className="text-center text-[13.5px] text-red">
          {t("common.error")}
        </p>
      ) : null}
    </div>
  );
}

export function ShareTextButton({ text, label, doneLabel, className = "" }: { text: string; label: string; doneLabel: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await nativeShare(text);
        setDone(true);
      }}
    >
      {done ? doneLabel : label}
    </button>
  );
}
