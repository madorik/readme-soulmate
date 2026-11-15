"use client";

import type { Locale } from "@readme/core";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
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

/** 뭉게구름 하나(가로 w): 납작한 바닥 위에 몽글몽글한 봉우리 넷. 구름 전체에 한 그늘(위는 희고 바닥은 옅은 하늘색)을 씌운다 */
type Puff = { cx: number; cy: number; w: number };

function Cloud({ cx, cy, w, fill }: Puff & { fill: string }) {
  const k = (n: number) => w * n;
  return (
    <g fill={fill}>
      <ellipse cx={cx} cy={cy} rx={k(0.5)} ry={k(0.15)} />
      <circle cx={cx - k(0.27)} cy={cy - k(0.05)} r={k(0.17)} />
      <circle cx={cx - k(0.06)} cy={cy - k(0.15)} r={k(0.23)} />
      <circle cx={cx + k(0.17)} cy={cy - k(0.09)} r={k(0.19)} />
      <circle cx={cx + k(0.34)} cy={cy - k(0.01)} r={k(0.13)} />
    </g>
  );
}

/**
 * 구름 두 겹(멀리 작은 구름 · 가까이 큰 구름). 좌표는 구슬 지름 208 기준 한 장(타일)이고, 세 장을 이어 그려 끝없이 흘러간다.
 * 가까운 구름이 더 빨리 흐르고, 목소리가 클수록 더 빨라진다
 */
const LAYERS: { puffs: Puff[]; speed: number; boost: number; opacity: number; blur: number }[] = [
  {
    puffs: [
      { cx: 34, cy: 66, w: 56 },
      { cx: 118, cy: 50, w: 70 },
      { cx: 182, cy: 82, w: 46 },
    ],
    speed: 4,
    boost: 60,
    opacity: 0.8,
    blur: 1.4,
  },
  {
    puffs: [
      { cx: 62, cy: 146, w: 118 },
      { cx: 168, cy: 126, w: 92 },
    ],
    speed: 8,
    boost: 130,
    opacity: 1,
    blur: 0.6,
  },
];

const TILE = 208;

/**
 * 가운데 하늘 구슬. 평소엔 뭉게구름이 은은하게 흐르고, 목소리가 들리면 그 크기만큼 구름이 빨리 흘러가고 구슬이 살짝 숨 쉰다.
 * 브라우저는 마이크 소리 크기(AnalyserNode)를, 잴 수 없는 곳(앱의 기기 인식)은 듣는 동안 부드럽게 오르내리는 값을 쓴다.
 * 움직임 줄이기를 켠 사람에게는 구름을 멈춘다. 값은 그릴 때마다 DOM에 바로 넣는다(화면을 다시 그리지 않게)
 */
function SkyOrb({ active, measure, size = 208 }: { active: boolean; measure: boolean; size?: number }) {
  const id = useId().replace(/:/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const layers = useRef<(SVGSVGElement | null)[]>([]);
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
    const offsets = LAYERS.map((_, i) => i * TILE * 0.41);
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
      level += (target - level) * 0.12;
      LAYERS.forEach((l, i) => {
        const el = layers.current[i];
        if (!el) return;
        if (!still) offsets[i] = (offsets[i]! + dt * (l.speed + l.boost * level)) % TILE;
        el.style.transform = `translate3d(${(-offsets[i]! * size) / TILE}px, 0, 0)`;
      });
      if (wrap.current) {
        wrap.current.style.transform = `scale(${1 + (still ? 0 : 0.06 * level)})`;
        wrap.current.style.boxShadow = `0 26px 60px -22px rgba(47,111,224,${0.4 + 0.35 * level}), 0 0 0 ${Math.round(10 * level)}px rgba(150,200,255,${0.25 * level})`;
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
      style={{
        width: size,
        height: size,
        background: "linear-gradient(180deg, #5fa9f7 0%, #8ccaff 45%, #a9d9ff 62%, #5b9cf2 100%)",
        boxShadow: "0 26px 60px -22px rgba(47,111,224,0.4)",
      }}
    >
      {LAYERS.map((l, i) => (
        <svg
          key={i}
          ref={(el) => {
            layers.current[i] = el;
          }}
          width={size * 2}
          height={size}
          viewBox={`0 0 ${TILE * 2} ${TILE}`}
          className="absolute left-0 top-0 will-change-transform"
          style={{ opacity: l.opacity }}
        >
          <defs>
            {l.puffs.map((p, j) => (
              <linearGradient key={j} id={`${id}-g${i}-${j}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={p.cy - p.w * 0.38} y2={p.cy + p.w * 0.15}>
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.55" stopColor="#fbfdff" />
                <stop offset="1" stopColor="#d9e8fa" />
              </linearGradient>
            ))}
            <filter id={`${id}-soft-${i}`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={l.blur} />
            </filter>
          </defs>
          <g filter={`url(#${id}-soft-${i})`}>
            {[-TILE, 0, TILE].map((dx) => (
              <g key={dx} transform={`translate(${dx} 0)`}>
                {l.puffs.map((p, j) => (
                  <Cloud key={j} {...p} fill={`url(#${id}-g${i}-${j})`} />
                ))}
              </g>
            ))}
          </g>
        </svg>
      ))}
      {/* 왼쪽 위 빛과 가장자리 깊이(구슬처럼) */}
      <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 30% 18%, rgba(255,255,255,0.35), rgba(255,255,255,0) 38%)" }} />
      <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 -16px 32px rgba(29,78,216,0.3), inset 0 10px 24px rgba(255,255,255,0.3)" }} />
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

  // 가운데: 하늘 구슬(누르면 듣기), 바로 밑에 받아 적는 글(작게 시작해 글만큼 늘어난다). 아래: [지우기] [적기]
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
            <button
              type="button"
              onClick={() => void listen()}
              aria-pressed={listening}
              aria-label={listening ? labels.listening : labels.speak}
              disabled={pending}
              className="shrink-0 rounded-full transition-transform active:scale-95"
            >
              <SkyOrb active={listening} measure={!nativeSpeech()} />
            </button>
            <span className="pt-5 text-[13.5px] font-bold text-muted">{listening ? labels.listening : labels.speak}</span>
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
