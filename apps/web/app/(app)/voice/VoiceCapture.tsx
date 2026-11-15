"use client";

import type { Locale } from "@readme/core";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
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

const BARS = 10;

/**
 * 마이크 양옆 음파. 브라우저는 마이크 소리 크기(AnalyserNode)만큼, 소리를 잴 수 없으면(앱의 기기 인식 등) 부드럽게 흔들리는 모양.
 * 막대 높이는 그릴 때마다 DOM에 바로 넣는다(화면을 다시 그리지 않게)
 */
function Waveform({ active, measure, children }: { active: boolean; measure: boolean; children: React.ReactNode }) {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bars = (i: number) => [left.current?.children[BARS - 1 - i], right.current?.children[i]].filter(Boolean) as HTMLElement[];
    const set = (levels: number[]) => levels.forEach((v, i) => bars(i).forEach((b) => (b.style.transform = `scaleY(${Math.max(0.12, Math.min(1, v))})`)));
    if (!active) {
      set(Array(BARS).fill(0.12));
      return;
    }
    let raf = 0;
    let stopped = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let data = new Uint8Array(0);
    // 소리 크기(RMS)를 부드럽게 따라가고, 막대는 그 크기만큼 물결친다. 조용해도 듣는 중에는 조금씩 움직인다
    let level = 0;
    const draw = (t: number) => {
      let target: number;
      if (analyser) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        target = Math.min(1, Math.sqrt(sum / data.length) * 7);
      } else {
        target = 0.45 + 0.25 * Math.sin(t / 320);
      }
      level += (target - level) * 0.25;
      set(Array.from({ length: BARS }, (_, i) => (0.3 + 0.7 * level) * (0.45 + 0.55 * Math.abs(Math.sin(t / 140 + i * 0.9))) * (1 - i / (BARS * 1.8))));
      raf = requestAnimationFrame(draw);
    };
    void (async () => {
      if (measure && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          if (stopped) return stream.getTracks().forEach((tr) => tr.stop());
          ctx = new AudioContext();
          analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          data = new Uint8Array(analyser.frequencyBinCount);
        } catch {
          analyser = null;
        }
      }
      if (!stopped) raf = requestAnimationFrame(draw);
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      void ctx?.close().catch(() => {});
      set(Array(BARS).fill(0.12));
    };
  }, [active, measure]);
  const side = (ref: React.RefObject<HTMLDivElement | null>) => (
    <div ref={ref} aria-hidden="true" className={`flex items-center gap-[4px] transition-opacity ${active ? "opacity-100" : "opacity-20"}`}>
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className="block h-12 w-[4px] origin-center rounded-full bg-ink transition-transform duration-75" style={{ transform: "scaleY(0.12)" }} />
      ))}
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-3.5">
      {side(left)}
      {children}
      {side(right)}
    </div>
  );
}

type Labels = {
  speak: string;
  clear: string;
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
  const box = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, result]);

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

  // 가운데: 음파 사이 마이크, 바로 밑에 받아 적는 글(작게 시작해 글만큼 늘어난다). 아래: [지우기] [적기]
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-6">
        {canListen ? (
          <>
            <Waveform active={listening} measure={!nativeSpeech()}>
              <button
                type="button"
                onClick={() => void listen()}
                aria-pressed={listening}
                aria-label={listening ? labels.listening : labels.speak}
                disabled={pending}
                className="grad flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-btn)] transition-transform active:scale-95"
              >
                <Icon name="mic" size={42} strokeWidth={2} />
              </button>
            </Waveform>
            <span className="pt-3 text-[13.5px] font-bold text-muted">{listening ? labels.listening : labels.speak}</span>
          </>
        ) : null}
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={500}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className={`max-h-[40vh] w-full resize-none overflow-y-auto bg-transparent text-center text-[21px] font-bold leading-[1.5] tracking-[-0.02em] outline-none placeholder:font-semibold placeholder:text-muted/60 ${canListen ? "mt-6 min-h-[96px]" : "mt-2 rounded-2xl bg-white px-4 py-4 text-left shadow-[0_0_0_1px_var(--color-rule)]"}`}
        />
        {error ? (
          <p role="alert" className="pt-3 text-center text-[14px] text-red">
            {error}
          </p>
        ) : null}
      </div>

      <div className={`bottom-bar mt-auto grid gap-2.5 bg-bg px-4 pt-4 ${text && !listening && !pending ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
        {text && !listening && !pending ? (
          <button type="button" onClick={() => setText("")} className="btn-outline !px-6">
            {labels.clear}
          </button>
        ) : null}
        <button disabled={pending || listening || !text.trim()} className="btn-primary w-full">
          {pending ? "…" : labels.save}
        </button>
      </div>
    </form>
  );
}
