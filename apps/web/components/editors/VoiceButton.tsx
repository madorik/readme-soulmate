"use client";

import type { Locale } from "@readme/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../marks";
import { useT } from "./shared";

// 말로 입력. 브라우저 음성 인식(Web Speech API)을 쓰고, 앱(Capacitor)에서는 앱이 같은 이름의 인식기를 웹뷰에 넣어 준다.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceButton({ locale, onHeard, onError, label }: { locale: Locale; onHeard: (text: string) => void; onError: (message: string) => void; label?: string }) {
  const t = useT(locale);
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!recognitionCtor(),
    () => false,
  );
  const ref = useRef<Recognition | null>(null);
  const heard = useRef("");

  useEffect(() => () => ref.current?.stop(), []);

  const toggle = () => {
    if (listening) {
      ref.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) {
      onError(t("input.voiceUnsupported"));
      return;
    }
    const r = new Ctor();
    r.lang = locale === "ko" ? "ko-KR" : "en-US";
    r.interimResults = false;
    r.continuous = true;
    heard.current = "";
    r.onresult = (e) => {
      heard.current = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ");
    };
    r.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") onError(t("input.voiceUnsupported"));
    };
    r.onend = () => {
      setListening(false);
      if (heard.current.trim()) onHeard(heard.current);
    };
    ref.current = r;
    setListening(true);
    r.start();
  };

  if (!supported) return null;
  return (
    <button type="button" onClick={toggle} aria-pressed={listening} className={`pill self-start ${listening ? "grad !shadow-none" : ""}`}>
      <Icon name="mic" size={17} />
      {listening ? t("input.voiceListening") : (label ?? t("input.voice"))}
    </button>
  );
}
