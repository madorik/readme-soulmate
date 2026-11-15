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
 * 가운데 물방울. 깨끗하고 투명한 물이 동그라미 안에서 출렁이는 느낌:
 * 속은 거의 투명하고 가장자리만 빛이 꺾이듯 푸르스름하며, 왼쪽 위에 흰 반짝임과 가장자리를 따라 비친 초승달 빛, 오른쪽 아래에 모인 빛, 바닥에 그림자와 물을 지난 밝은 빛.
 * 테두리 모양(border-radius)을 조금씩 바꿔 말랑하게 흔들리고, 속물이 출렁인다. 목소리가 클수록 크고 빠르게 흔들린다.
 * 브라우저는 마이크 소리 크기(AnalyserNode)를, 잴 수 없는 곳(앱의 기기 인식)은 듣는 동안 부드럽게 오르내리는 값을 쓴다.
 * 움직임 줄이기를 켠 사람에게는 멈춘다. 값은 그릴 때마다 DOM에 바로 넣는다(화면을 다시 그리지 않게)
 */
function WaterDrop({ active, measure, size = 210 }: { active: boolean; measure: boolean; size?: number }) {
  const body = useRef<HTMLDivElement>(null);
  const slosh = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stopped = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let data = new Uint8Array(0);
    let level = 0;
    let phase = 0;
    let last = 0;
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
      if (!still) phase += dt * (1.1 + 3.2 * level);
      const a = still ? 0 : 2.2 + 7 * level; // 테두리 출렁임(%)
      const w = (k: number, o: number) => 50 + a * Math.sin(phase * k + o);
      const radius = `${w(1.0, 0)}% ${w(1.3, 1.1)}% ${w(0.9, 2.3)}% ${w(1.2, 3.7)}% / ${w(1.1, 0.6)}% ${w(0.8, 2.0)}% ${w(1.4, 2.9)}% ${w(1.0, 4.4)}%`;
      const squash = still ? 0 : (0.012 + 0.05 * level) * Math.sin(phase * 1.6);
      const grow = 1 + (still ? 0 : 0.06 * level);
      if (body.current) {
        body.current.style.borderRadius = radius;
        body.current.style.transform = `scale(${grow * (1 + squash)}, ${grow * (1 - squash)})`;
      }
      if (slosh.current) slosh.current.style.transform = `translate(${Math.sin(phase * 0.9) * (6 + 14 * level)}px, ${Math.cos(phase * 1.2) * (4 + 10 * level)}px) rotate(${Math.sin(phase * 0.7) * 12}deg)`;
      if (shine.current) shine.current.style.transform = `translate(${-Math.sin(phase * 0.9) * 3}px, ${-Math.cos(phase * 1.2) * 2}px) rotate(-28deg)`;
      if (shadow.current) shadow.current.style.transform = `translateX(-50%) scale(${grow * (1 + squash * 1.5)}, 1)`;
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
  }, [active, measure]);
  return (
    <div aria-hidden="true" className="relative" style={{ width: size, height: size + 26 }}>
      {/* 바닥 그림자와, 물을 지나 모인 밝은 빛 */}
      <div
        ref={shadow}
        className="absolute left-1/2 rounded-[50%]"
        style={{
          bottom: 0,
          width: size * 0.72,
          height: 22,
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at 50% 50%, rgba(160,230,255,0.85) 0%, rgba(120,190,235,0.35) 28%, rgba(40,90,150,0.22) 55%, rgba(40,90,150,0) 75%)",
          filter: "blur(5px)",
        }}
      />
      {/* 물방울 몸 */}
      <div
        ref={body}
        className="absolute left-0 top-0 overflow-hidden will-change-transform"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 48%, rgba(255,255,255,0.06) 0%, rgba(214,240,255,0.16) 45%, rgba(140,200,240,0.5) 78%, rgba(70,145,215,0.8) 100%)",
          boxShadow:
            "inset 0 0 0 1.5px rgba(255,255,255,0.75), inset 0 14px 26px rgba(40,110,180,0.22), inset 0 -18px 30px rgba(255,255,255,0.75), inset 0 -2px 10px rgba(120,200,255,0.5), 0 22px 40px -22px rgba(30,90,160,0.4)",
        }}
      >
        {/* 속에서 출렁이는 물빛 */}
        <div
          ref={slosh}
          className="absolute will-change-transform"
          style={{
            inset: "-15%",
            background: "radial-gradient(ellipse 55% 40% at 50% 78%, rgba(80,170,235,0.28), rgba(80,170,235,0) 70%), radial-gradient(ellipse 40% 30% at 38% 40%, rgba(255,255,255,0.25), rgba(255,255,255,0) 70%)",
          }}
        />
        {/* 오른쪽 아래에 모인 빛(꺾인 빛) */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 34% 22% at 66% 84%, rgba(255,255,255,0.9), rgba(255,255,255,0) 70%)" }} />
      </div>
      {/* 왼쪽 위 반짝임 */}
      <div
        ref={shine}
        className="absolute"
        style={{
          left: size * 0.2,
          top: size * 0.13,
          width: size * 0.28,
          height: size * 0.15,
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0) 62%)",
          transform: "rotate(-28deg)",
        }}
      />
      {/* 가장자리를 따라 비친 가는 초승달 빛 */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: size * 0.07,
          top: size * 0.07,
          width: size * 0.86,
          height: size * 0.86,
          borderTop: `${Math.round(size * 0.022)}px solid rgba(255,255,255,0.7)`,
          borderLeft: `${Math.round(size * 0.012)}px solid rgba(255,255,255,0.35)`,
          borderRight: "0 solid transparent",
          borderBottom: "0 solid transparent",
          transform: "rotate(-20deg)",
          filter: "blur(1.5px)",
        }}
      />
      <div className="absolute rounded-full bg-white/90" style={{ left: size * 0.47, top: size * 0.12, width: size * 0.045, height: size * 0.045, filter: "blur(0.5px)" }} />
    </div>
  );
}

type Labels = {
  speak: string;
  same: string;
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
                    {l.same ? <span className="rounded-full bg-fill px-2 py-[1px] text-[11.5px]">{labels.same}</span> : null}
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
            disabled={undone || pending || !result.undo.length}
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

  // 가운데 물방울(누르면 듣기·멈추기), 바로 밑에 받아 적는 글. 아래: 둥근 마이크 · 기억해 두기
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
          <WaterDrop active={listening} measure={!nativeSpeech()} />
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
