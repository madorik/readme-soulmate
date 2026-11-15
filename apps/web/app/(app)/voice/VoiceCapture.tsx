"use client";

import type { Locale } from "@readme/core";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { captureNote, undoCapture, type CaptureState } from "@/app/actions/capture";
import { Icon } from "@/components/marks";

// 음성 인식: 브라우저는 Web Speech API, 앱(Capacitor)은 SpeechRecognition 플러그인이 있으면 그것.
// 둘 다 없으면 글로 적는다(휴대폰 키보드의 받아쓰기 마이크로도 말할 수 있다).
type WebRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type NativeSpeech = {
  available: () => Promise<{ available: boolean }>;
  requestPermissions: () => Promise<{ speechRecognition: string }>;
  start: (o: { language: string; partialResults: boolean; popup: boolean; maxResults: number }) => Promise<unknown>;
  stop: () => Promise<void>;
  addListener: (event: "partialResults" | "listeningState", fn: (d: { matches?: string[]; status?: string }) => void) => Promise<{ remove: () => Promise<void> }>;
};

function webCtor(): (new () => WebRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function nativeSpeech(): NativeSpeech | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { SpeechRecognition?: NativeSpeech } } }).Capacitor;
  return cap?.isNativePlatform?.() && cap.Plugins?.SpeechRecognition ? cap.Plugins.SpeechRecognition : null;
}

type Labels = {
  speak: string;
  listening: string;
  placeholder: string;
  save: string;
  saved: string;
  isNew: string;
  undo: string;
  undone: string;
  more: string;
  aiOff: string;
  failed: string;
  nothing: string;
  micError: string;
};

export function VoiceCapture({ locale, labels }: { locale: Locale; labels: Labels }) {
  const canListen = useSyncExternalStore(
    () => () => {},
    () => !!webCtor() || !!nativeSpeech(),
    () => false,
  );
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(false);
  const [result, setResult] = useState<CaptureState | null>(null);
  const [undone, setUndone] = useState(false);
  const [pending, start] = useTransition();
  const web = useRef<WebRecognition | null>(null);
  const native = useRef<{ plugin: NativeSpeech; remove: () => Promise<void> } | null>(null);
  const heard = useRef("");

  useEffect(
    () => () => {
      web.current?.stop();
      void native.current?.plugin.stop();
    },
    [],
  );

  const submit = (value: string) => {
    const v = value.trim();
    if (!v || pending) return;
    start(async () => {
      setUndone(false);
      setResult(await captureNote(v));
    });
  };

  const stopListening = async () => {
    if (web.current) web.current.stop();
    if (native.current) {
      const n = native.current;
      native.current = null;
      await n.plugin.stop().catch(() => {});
      await n.remove().catch(() => {});
      setListening(false);
      if (heard.current.trim()) submit(heard.current);
    }
  };

  const listen = async () => {
    if (listening) return stopListening();
    setMicError(false);
    setResult(null);
    heard.current = "";
    setText("");
    const lang = locale === "ko" ? "ko-KR" : "en-US";
    const plugin = nativeSpeech();
    if (plugin) {
      try {
        const perm = await plugin.requestPermissions();
        if (perm.speechRecognition !== "granted") throw new Error("denied");
        const sub = await plugin.addListener("partialResults", (d) => {
          heard.current = d.matches?.[0] ?? heard.current;
          setText(heard.current);
        });
        native.current = { plugin, remove: sub.remove };
        setListening(true);
        await plugin.start({ language: lang, partialResults: true, popup: false, maxResults: 1 });
      } catch {
        setListening(false);
        setMicError(true);
      }
      return;
    }
    const Ctor = webCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      heard.current = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ");
      setText(heard.current);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") setMicError(true);
    };
    r.onend = () => {
      web.current = null;
      setListening(false);
      if (heard.current.trim()) submit(heard.current);
    };
    web.current = r;
    setListening(true);
    r.start();
  };

  const error = result?.error === "ai_off" ? labels.aiOff : result?.error === "failed" ? labels.failed : result?.error === "nothing" ? labels.nothing : micError ? labels.micError : "";

  // 적은 뒤: 어디에 들어갔는지 한 줄씩, 아래에 되돌리기·더 말하기
  if (result && !result.error) {
    return (
      <div className="flex flex-1 flex-col">
        <section className="card mx-4 mt-4 flex flex-col px-5 pb-2 pt-5" aria-live="polite">
          <h2 className="flex items-center gap-2 pb-2 text-[15px] font-bold">
            <Icon name="check" size={18} strokeWidth={2.4} className="text-accent" />
            {undone ? labels.undone : labels.saved}
          </h2>
          <ul className={`flex flex-col ${undone ? "opacity-40" : ""}`}>
            {result.lines.map((l, i) => (
              <li key={i} className="border-t border-rule">
                <Link href={l.href} className="flex min-h-[60px] flex-col justify-center gap-0.5 py-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
                    {l.who}
                    {l.isNew ? <span className="chip-on rounded-full px-2 py-[1px] text-[11.5px]">{labels.isNew}</span> : null}
                    <span aria-hidden="true">·</span>
                    {l.field}
                  </span>
                  <span className="text-[16px] font-bold leading-[1.4]">{l.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="bottom-bar mt-auto grid grid-cols-2 gap-2.5 bg-bg px-4 pt-4">
          <button
            type="button"
            disabled={undone || pending}
            onClick={() =>
              start(async () => {
                const r = await undoCapture(result.undo);
                if (r.ok) setUndone(true);
              })
            }
            className="btn-outline disabled:opacity-40"
          >
            {labels.undo}
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setText("");
            }}
            className="btn-primary"
          >
            {labels.more}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
    >
      {canListen ? (
        <div className="flex flex-col items-center gap-3 pt-8">
          <button
            type="button"
            onClick={() => void listen()}
            aria-pressed={listening}
            aria-label={listening ? labels.listening : labels.speak}
            disabled={pending}
            className={`relative flex h-[120px] w-[120px] items-center justify-center rounded-full grad shadow-[var(--shadow-btn)] transition-transform active:scale-95 ${listening ? "animate-pulse" : ""}`}
          >
            <Icon name="mic" size={46} strokeWidth={1.9} />
          </button>
          <span className="text-[14px] font-bold text-muted">{listening ? labels.listening : labels.speak}</span>
        </div>
      ) : null}

      <div className="mx-4 mt-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="field resize-none !text-[17px] leading-[1.55]"
        />
      </div>
      {error ? (
        <p role="alert" className="px-6 pt-2 text-[14px] text-red">
          {error}
        </p>
      ) : null}

      <div className="bottom-bar mt-auto bg-bg px-4 pt-4">
        <button disabled={pending || listening || !text.trim()} className="btn-primary w-full">
          {pending ? "…" : labels.save}
        </button>
      </div>
    </form>
  );
}
