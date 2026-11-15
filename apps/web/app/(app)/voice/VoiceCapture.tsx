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

/**
 * 구슬 속 빛 덩어리 넷(흰빛 · 하늘색 · 파랑 · 청록). 저마다 다른 빠르기·방향으로 가운데를 돌며 흐릿하게 섞인다.
 * size: 구슬 지름 대비 크기, radius: 도는 반지름(구슬 지름 대비), speed: 1초에 도는 각(라디안)
 */
const BLOBS = [
  { color: "rgba(37,99,235,0.95)", size: 1.0, radius: 0.24, speed: 0.22, phase: 4.2 },
  { color: "rgba(103,232,249,0.85)", size: 0.75, radius: 0.26, speed: -0.38, phase: 1.0 },
  { color: "rgba(147,197,253,0.95)", size: 0.9, radius: 0.22, speed: -0.27, phase: 2.4 },
  { color: "rgba(255,255,255,0.95)", size: 0.8, radius: 0.2, speed: 0.33, phase: 0 },
] as const;

/**
 * 가운데 음성 구슬(ChatGPT 음성 모드 같은). 평소엔 빛이 천천히 돌고, 목소리가 들리면 그 크기만큼 빨리 돌며 구슬이 숨 쉬듯 커진다.
 * 브라우저는 마이크 소리 크기(AnalyserNode)를, 잴 수 없는 곳(앱의 기기 인식)은 듣는 동안 부드럽게 오르내리는 값을 쓴다.
 * 움직임 줄이기를 켠 사람에게는 멈춘다. 값은 그릴 때마다 DOM에 바로 넣는다(화면을 다시 그리지 않게)
 */
function VoiceOrb({ active, measure, size = 220 }: { active: boolean; measure: boolean; size?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const blobs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let data = new Uint8Array(0);
    let level = 0;
    let last = 0;
    const angles: number[] = BLOBS.map((b) => b.phase);
    const draw = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      let target = 0;
      if (active && analyser) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        target = Math.min(1, Math.sqrt(sum / data.length) * 7);
      } else if (active) {
        target = 0.35 + 0.25 * Math.sin(t / 380);
      }
      level += (target - level) * 0.14;
      BLOBS.forEach((b, i) => {
        const el = blobs.current[i];
        if (!el) return;
        if (!still) angles[i] = angles[i]! + dt * b.speed * (1 + 4 * level);
        const r = b.radius * size * (1 + 0.35 * level);
        const wobble = 1 + 0.18 * level * Math.sin(t / 220 + i * 1.7);
        el.style.transform = `translate3d(${Math.cos(angles[i]!) * r}px, ${Math.sin(angles[i]!) * r}px, 0) scale(${wobble})`;
      });
      if (wrap.current) {
        const breathe = still ? 1 : 1 + 0.08 * level + (active ? 0.012 * Math.sin(t / 600) : 0);
        wrap.current.style.transform = `scale(${breathe})`;
        wrap.current.style.boxShadow = `0 30px 70px -26px rgba(37,99,235,${0.35 + 0.4 * level}), 0 0 ${Math.round(40 * level)}px rgba(125,190,255,${0.45 * level})`;
      }
      raf = requestAnimationFrame(draw);
    };
    void (async () => {
      if (active && measure && navigator.mediaDevices?.getUserMedia) {
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
    };
  }, [active, measure, size]);
  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className="relative overflow-hidden rounded-full"
      style={{ width: size, height: size, background: "linear-gradient(180deg, #e0efff 0%, #9cc8fb 48%, #3d7cf0 100%)", boxShadow: "0 30px 70px -26px rgba(37,99,235,0.35)" }}
    >
      <div className="absolute inset-0" style={{ filter: `blur(${Math.round(size * 0.08)}px)` }}>
        {BLOBS.map((b, i) => (
          <div
            key={i}
            ref={(el) => {
              blobs.current[i] = el;
            }}
            className="absolute rounded-full will-change-transform"
            style={{
              width: size * b.size,
              height: size * b.size,
              left: (size - size * b.size) / 2,
              top: (size - size * b.size) / 2,
              background: `radial-gradient(circle, ${b.color} 0%, rgba(255,255,255,0) 66%)`,
            }}
          />
        ))}
      </div>
      {/* 유리 같은 윗빛과 가장자리 깊이 */}
      <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 32% 20%, rgba(255,255,255,0.55), rgba(255,255,255,0) 36%)" }} />
      <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 -20px 40px rgba(29,78,216,0.35), inset 0 10px 26px rgba(255,255,255,0.4)" }} />
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

  // ChatGPT 음성 모드처럼: 가운데 구슬(누르면 듣기·멈추기), 바로 밑에 받아 적는 글. 아래: 둥근 마이크 · 기억해 두기
  const idle = !!text && !listening && !pending;
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-4">
        <button
          type="button"
          onClick={() => void listen()}
          aria-pressed={listening}
          aria-label={listening ? labels.listening : labels.speak}
          disabled={pending || !canListen}
          className="shrink-0 rounded-full transition-transform active:scale-95 disabled:active:scale-100"
        >
          <VoiceOrb active={listening} measure={!nativeSpeech()} />
        </button>
        <textarea
          ref={box}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          maxLength={500}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="mt-9 max-h-[30vh] min-h-[84px] w-full resize-none overflow-y-auto bg-transparent text-center text-[20px] font-semibold leading-[1.5] tracking-[-0.02em] outline-none placeholder:font-medium placeholder:text-muted/55"
        />
        <div className="flex h-8 items-center">
          {error ? (
            <p role="alert" className="text-center text-[14px] text-red">
              {error}
            </p>
          ) : idle ? (
            <button type="button" onClick={() => setText("")} className="text-[13.5px] font-bold text-muted underline underline-offset-4">
              {labels.clear}
            </button>
          ) : null}
        </div>
      </div>

      <div className="bottom-bar mt-auto flex items-center gap-3 bg-bg px-5 pt-3">
        {canListen ? (
          <button
            type="button"
            onClick={() => void listen()}
            aria-pressed={listening}
            aria-label={listening ? labels.listening : labels.speak}
            disabled={pending}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${listening ? "bg-ink text-white" : "bg-white text-ink shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
          >
            <Icon name="mic" size={24} strokeWidth={2} />
          </button>
        ) : null}
        <button disabled={pending || listening || !text.trim()} className="btn-primary flex-1">
          {pending ? "…" : labels.save}
        </button>
      </div>
    </form>
  );
}
