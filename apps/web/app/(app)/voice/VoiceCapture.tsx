"use client";

import type { AvatarConfig, Locale } from "@readme/core";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { captureNote, undoCapture, type CaptureState } from "@/app/actions/capture";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/marks";
import { CaptureBadge, struck, type CaptureBadgeLabels } from "@/components/CaptureBadge";
import { TagChip } from "@/components/PersonRow";
import { insertMention, mentionAt, mentionLabel, resolveMentions, type MentionPerson } from "@/lib/mention";
import { matchesPerson } from "@/lib/search";
import { shellDictation } from "@/lib/dictation";
import { commonPrefix, nextTyped, startDictation, type Dictation, type NativeSpeech } from "@/lib/speech";

/** @로 부를 수 있는 사람(즐겨찾기가 먼저) */
export type MentionOption = MentionPerson & { avatar: AvatarConfig | null };

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
 * 듣는 동안에는 물방울에서 물결 고리가 퍼져 나가고(소리가 클수록 진하게), 밑에 음성 막대가 소리 크기에 맞춰 오르내린다.
 * 소리를 잴 수 없는 앱에서는 받아 적은 글자가 들어올 때마다(beat) 출렁인다.
 * 움직임 줄이기를 켠 사람에게는 멈춘다. 값은 그릴 때마다 DOM에 바로 넣는다(화면을 다시 그리지 않게).
 * 듣는 동안(active)에만 프레임 루프를 돌리고, 가만히 있을 때는 한 번 그리고 멈춘다. 음성 막대는 높이 대신 scaleY(합성만)로 오르내린다
 */
const BARS = [0.55, 0.8, 1, 0.8, 0.55];
const BAR_ROW = 36;
/** 음성 막대 한 줄의 가장 큰 높이(px). 이보다 작게는 scaleY로 */
const BAR_MAX = 34;
const BAR_MIN = 6;

function WaterDrop({ active, measure, beat = 0, size = 210 }: { active: boolean; measure: boolean; beat?: number; size?: number }) {
  const body = useRef<HTMLDivElement>(null);
  const slosh = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const ripples = useRef<HTMLDivElement>(null);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const kick = useRef(0);
  const firstBeat = useRef(true);
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    kick.current = 1;
  }, [beat]);
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
    // 한 프레임 그리기(루프는 아래 loop가 돈다)
    const paint = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      let target = 0;
      if (active && analyser) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        target = Math.min(1, Math.sqrt(sum / data.length) * 7);
      } else if (active) {
        target = Math.min(1, 0.3 + 0.12 * Math.sin(t / 380) + 0.6 * kick.current);
      }
      kick.current *= 0.9;
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
      if (slosh.current)
        slosh.current.style.transform = `translate(${Math.sin(phase * 0.9) * (6 + 14 * level)}px, ${Math.cos(phase * 1.2) * (4 + 10 * level)}px) rotate(${Math.sin(phase * 0.7) * 12}deg)`;
      if (shine.current) shine.current.style.transform = `translate(${-Math.sin(phase * 0.9) * 3}px, ${-Math.cos(phase * 1.2) * 2}px) rotate(-28deg)`;
      if (shadow.current) shadow.current.style.transform = `translateX(-50%) scale(${grow * (1 + squash * 1.5)}, 1)`;
      if (ripples.current) ripples.current.style.opacity = String(0.6 + 0.4 * level);
      bars.current.forEach((bar, i) => {
        if (!bar) return;
        const wave = still ? 0.8 : 0.55 + 0.45 * Math.abs(Math.sin(phase * 1.9 + i * 1.25));
        const h = active ? BAR_MIN + (BAR_MAX - BAR_MIN) * Math.min(1, (0.25 + level) * wave) * BARS[i]! : BAR_MIN;
        bar.style.transform = `scaleY(${h / BAR_MAX})`;
      });
    };
    const loop = (t: number) => {
      paint(t);
      raf = requestAnimationFrame(loop);
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
      if (stopped) return;
      // 듣는 동안만 계속 그린다. 가만히 있을 때는 한 번만 그려 두고 멈춘다(페인트·배터리 아낌)
      if (active) raf = requestAnimationFrame(loop);
      else paint(0);
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
      void ctx?.close().catch(() => {});
    };
  }, [active, measure]);
  return (
    <div aria-hidden="true" className="relative" style={{ width: size, height: size + 26 + BAR_ROW }}>
      {/* 듣는 동안 물방울에서 퍼져 나가는 물결 고리 */}
      {active ? (
        <div ref={ripples} className="pointer-events-none absolute left-0 top-0" style={{ width: size, height: size }}>
          {[0, 0.8, 1.6].map((delay) => (
            <span
              key={delay}
              className="absolute inset-0 rounded-full opacity-0 motion-safe:animate-[drop-ripple_2.4s_cubic-bezier(0.2,0.6,0.35,1)_infinite]"
              style={{
                animationDelay: `${delay}s`,
                border: "2.5px solid rgba(80,160,230,0.75)",
                background: "radial-gradient(circle, rgba(150,210,250,0) 58%, rgba(150,210,250,0.22) 100%)",
                boxShadow: "0 0 16px rgba(120,195,250,0.4), inset 0 0 20px rgba(140,205,250,0.3)",
              }}
            />
          ))}
        </div>
      ) : null}
      {/* 바닥 그림자와, 물을 지나 모인 밝은 빛 */}
      <div
        ref={shadow}
        className="absolute left-1/2 rounded-[50%]"
        style={{
          bottom: BAR_ROW,
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
          background: "radial-gradient(circle at 50% 48%, rgba(255,255,255,0.06) 0%, rgba(214,240,255,0.16) 45%, rgba(140,200,240,0.5) 78%, rgba(70,145,215,0.8) 100%)",
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
            background:
              "radial-gradient(ellipse 55% 40% at 50% 78%, rgba(80,170,235,0.28), rgba(80,170,235,0) 70%), radial-gradient(ellipse 40% 30% at 38% 40%, rgba(255,255,255,0.25), rgba(255,255,255,0) 70%)",
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
      {/* 음성 막대: 듣는 동안 소리 크기에 맞춰 */}
      <div className={`absolute bottom-0 left-1/2 flex h-9 -translate-x-1/2 items-center gap-1.5 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}>
        {BARS.map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            className="w-1.5 rounded-full will-change-transform"
            style={{ height: BAR_MAX, transform: `scaleY(${BAR_MIN / BAR_MAX})`, background: "linear-gradient(to top, rgba(70,145,215,0.9), rgba(150,210,250,0.95))" }}
          />
        ))}
      </div>
    </div>
  );
}

/** 기억해 두기 단추 안: 저장하는 동안은 돌아가는 고리(움직임 줄이기를 켜면 멈춘 고리)를 글자 앞에 붙인다 */
function SaveLabel({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <>
      {pending ? <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" /> : null}
      {children}
    </>
  );
}

/**
 * 받아 적는 글을 한 글자씩 타자 치듯(on일 때만, 기기는 말을 덩어리로 보낸다). 고쳐 들어 앞이 달라지면 같은 앞부분까지 바로 지우고 다시 친다.
 * 움직임 줄이기를 켠 사람에게는 바로 보인다
 */
function useTyped(target: string, on: boolean): string {
  const [typed, setTyped] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (!on) {
      cur.current = target;
      return;
    }
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const next = still ? target : nextTyped(cur.current.slice(0, commonPrefix(cur.current, target)), target);
      if (next === cur.current) return;
      cur.current = next;
      setTyped(next);
      timer = setTimeout(tick, 42);
    };
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [target, on]);
  return on ? typed.slice(0, commonPrefix(typed, target)) : target;
}

const MODE_KEY = "remember-you.capture-mode";

type Labels = CaptureBadgeLabels & {
  mode: string;
  modeVoice: string;
  modeText: string;
  speak: string;
  clear: string;
  listening: string;
  placeholder: string;
  placeholderText: string;
  mention: string;
  mentionList: string;
  save: string;
  saved: string;
  isNew: string;
  undo: string;
  undone: string;
  more: string;
  done: string;
  aiOff: string;
  failed: string;
  limit: string;
  nothing: string;
  micError: string;
};

export function VoiceCapture({ locale, labels, people = [] }: { locale: Locale; labels: Labels; people?: MentionOption[] }) {
  const canListen = useSyncExternalStore(
    () => () => {},
    () => !!webCtor() || !!nativeSpeech() || !!shellDictation,
    () => false,
  );
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  // 앱: 멈춘 뒤 마지막 말까지 든 최종 결과를 기다리는 중(길어야 1.5초)
  const [settling, setSettling] = useState(false);
  const [micError, setMicError] = useState(false);
  const [result, setResult] = useState<CaptureState | null>(null);
  const [undone, setUndone] = useState(false);
  const [pending, start] = useTransition();
  // 말로 적는 동안(듣기·최종 결과 기다리기·나눠 적기) 받아 적은 글은 한 글자씩
  const shown = useTyped(text, listening || settling || pending);
  const web = useRef<WebRecognition | null>(null);
  const native = useRef<Dictation | null>(null);
  const alive = useRef(true);
  const heard = useRef("");
  // 말로(물방울) / 글로(적는 칸). 마지막에 고른 방식을 기억한다(이 기기에서만). 음성 인식을 못 쓰는 기기는 글로만
  const stored = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(MODE_KEY) === "text" ? "text" : "voice";
      } catch {
        return "voice";
      }
    },
    () => "voice",
  );
  const [picked, setPicked] = useState<"voice" | "text" | null>(null);
  const mode = canListen ? (picked ?? stored) : "text";
  const choose = (m: "voice" | "text") => {
    if (m === "text" && listening) void stopListening();
    setPicked(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {
      /* 다음에는 기본값 */
    }
  };
  const box = useRef<HTMLTextAreaElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // @부름: 커서 앞이 '@낱말'이면 이름·태그로 찾은 사람을 칸 바로 밑에 보이고, 고르면 '@부름 '으로 넣는다
  const [tagged, setTagged] = useState<{ id: string; label: string }[]>([]);
  const [caret, setCaret] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const mention = dismissed || !people.length ? null : mentionAt(text, caret);
  const options = mention ? people.filter((p) => matchesPerson(mention.query, p.name, p.tag)).slice(0, 6) : [];
  const listOpen = options.length > 0;
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));
  const who = resolveMentions(text, people, tagged)
    .ids.map((id) => people.find((p) => p.id === id))
    .filter((p): p is MentionOption => !!p);

  // 글을 바꾼 바로 그 그리기에서 커서를 놓는다(다음 글자가 먼저 들어와도 엉뚱한 자리에 끼지 않게)
  const pendingCaret = useRef<{ el: HTMLTextAreaElement | null; at: number } | null>(null);
  useLayoutEffect(() => {
    const p = pendingCaret.current;
    if (!p) return;
    pendingCaret.current = null;
    p.el?.focus();
    p.el?.setSelectionRange(p.at, p.at);
  }, [text, caret]);
  const placeCaret = (el: HTMLTextAreaElement | null, at: number) => {
    pendingCaret.current = { el, at };
    setCaret(at);
  };
  const pick = (el: HTMLTextAreaElement | null, o: MentionOption) => {
    if (!mention) return;
    const label = mentionLabel(o);
    const r = insertMention(text, mention.start, caret, label);
    setText(r.text);
    setTagged((prev) => [...prev.filter((m) => m.id !== o.id), { id: o.id, label }]);
    setActive(0);
    placeCaret(el, r.caret);
  };
  /** @ 단추: 커서 자리에 @를 넣고 목록을 연다(한글 자판에서는 @가 멀다) */
  const startMention = () => {
    const el = field.current;
    const at = el ? el.selectionStart : text.length;
    const before = text.slice(0, at);
    const ins = before && !/\s$/.test(before) ? " @" : "@";
    setText(before + ins + text.slice(at));
    setDismissed(false);
    setActive(0);
    placeCaret(el, at + ins.length);
  };
  /** 아래 사람 줄에서 얼굴을 누르면 커서 자리에 '@부름 '을 넣는다. 이미 부른 사람이면 글에서 그 부름을 뺀다 */
  const togglePerson = (p: MentionOption) => {
    const el = field.current;
    const label = mentionLabel(p);
    if (who.some((w) => w.id === p.id)) {
      const next = text.replace(new RegExp(`@${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s?`, "g"), "");
      setText(next);
      setTagged((prev) => prev.filter((m) => m.id !== p.id));
      placeCaret(el, Math.min(caret, next.length));
      return;
    }
    // 이름 바로 뒤에 커서(띄어쓰기 없이): '@아내는 …'처럼 조사를 바로 붙여 적는다. 찾기 줄은 다음 글자를 적을 때까지 닫아 둔다
    const at = el ? el.selectionStart : text.length;
    const before = text.slice(0, at);
    const ins = `${before && !/\s$/.test(before) ? " " : ""}@${label}`;
    setText(before + ins + text.slice(at));
    setTagged((prev) => [...prev.filter((m) => m.id !== p.id), { id: p.id, label }]);
    setDismissed(true);
    placeCaret(el, at + ins.length);
  };
  const mentionProps = {
    onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => setCaret(e.currentTarget.selectionStart),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!listOpen || e.nativeEvent.isComposing) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((activeIndex + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(e.currentTarget, options[activeIndex]!);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
      }
    },
    "aria-autocomplete": "list" as const,
    "aria-controls": listOpen ? "mention-list" : undefined,
    "aria-activedescendant": listOpen ? `mention-${options[activeIndex]!.id}` : undefined,
  };
  const onType = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCaret(e.target.selectionStart);
    setDismissed(false);
    setActive(0);
  };
  const mentionList = (which: "field" | "box") =>
    listOpen ? (
      <ul id="mention-list" role="listbox" aria-label={labels.mentionList} className="card flex w-full flex-col p-1.5 text-left">
        {options.map((o, i) => (
          <li key={o.id} role="presentation">
            <button
              type="button"
              id={`mention-${o.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(which === "field" ? field.current : box.current, o)}
              className={`flex min-h-[52px] w-full items-center gap-3 rounded-[16px] px-2.5 text-left ${i === activeIndex ? "bg-fill" : ""}`}
            >
              <Avatar config={o.avatar} size={34} label={mentionLabel(o)} />
              <span className="min-w-0 truncate text-[16px] font-bold">{o.name}</span>
              {o.tag && o.tag !== o.name ? <TagChip>{o.tag}</TagChip> : null}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [shown, result]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      web.current?.stop();
      native.current?.cancel();
    };
  }, []);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v || pending) return;
    start(async () => {
      setUndone(false);
      setResult(await captureNote(v, undefined, tagged));
    });
  };

  // 웹은 멈추면 최종 결과 뒤에 onend가 온다. 앱은 최종 결과를 기다렸다가 onDone(lib/speech)
  const stopListening = async () => {
    if (web.current) web.current.stop();
    native.current?.stop();
  };

  const listen = async () => {
    if (settling) return;
    if (listening) return stopListening();
    setMicError(false);
    setResult(null);
    heard.current = "";
    setText("");
    setTagged([]);
    const lang = locale === "ko" ? "ko-KR" : "en-US";
    const plugin = nativeSpeech();
    if (plugin || shellDictation) {
      try {
        if (plugin) {
          const perm = await plugin.requestPermissions();
          if (perm.speechRecognition !== "granted") throw new Error("denied");
        }
        setListening(true);
        // 말이 끝나 기기가 스스로 멈추거나 멈춤을 누르면, 마지막 말까지 받은 뒤 받아 적은 말로 나눠 적는다.
        // 토스 미니앱은 녹음했다가 멈추면 서버가 글로 바꾼다(lib/dictation)
        const options = {
          language: lang,
          onText: (t: string) => {
            heard.current = t;
            setText(t);
          },
          onSettling: () => {
            setListening(false);
            setSettling(true);
          },
          onDone: (t: string) => {
            native.current = null;
            if (!alive.current) return;
            setSettling(false);
            if (t) heard.current = t;
            setText(heard.current);
            if (heard.current.trim()) submit(heard.current);
          },
        };
        native.current = plugin ? await startDictation(plugin, options) : await shellDictation!(options);
      } catch {
        native.current = null;
        setListening(false);
        setSettling(false);
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

  const error = result?.error === "ai_off" ? labels.aiOff : result?.error === "failed" ? labels.failed : result?.error === "limit" ? labels.limit : result?.error === "nothing" ? labels.nothing : micError ? labels.micError : "";

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
                    {l.isNew ? <span className="chip-on rounded-full px-2 py-[1px] text-[12px]">{labels.isNew}</span> : null}
                    <span aria-hidden="true">·</span>
                    {l.field}
                    <CaptureBadge line={l} labels={labels} />
                  </span>
                  {l.value ? <span className={`text-[16px] font-bold leading-[1.4] ${struck(l)}`}>{l.value}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {/* 되돌리기(아이콘) · 더 말하기(마이크·연필 아이콘, 적는 화면으로) · 완료(홈으로) */}
        <div className="bottom-bar mt-auto flex items-center gap-2.5 bg-bg px-4 pt-4">
          <button
            type="button"
            aria-label={undone ? labels.undone : labels.undo}
            title={labels.undo}
            disabled={undone || pending || !result.undo.length}
            onClick={() =>
              start(async () => {
                const r = await undoCapture(result.undo);
                if (r.ok) setUndone(true);
              })
            }
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:bg-fill disabled:opacity-40"
          >
            <Icon name="undo" size={22} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={labels.more}
            title={labels.more}
            onClick={() => {
              setResult(null);
              setText("");
              setTagged([]);
            }}
            className="flex h-14 shrink-0 items-center justify-center gap-1 rounded-full bg-white px-4 text-ink shadow-[inset_0_0_0_1.5px_var(--color-edge)] active:bg-fill"
          >
            <Icon name="mic" size={21} strokeWidth={2} />
            <Icon name="pencil" size={19} strokeWidth={2} />
          </button>
          <Link href="/home" className="btn-primary flex-1">
            {labels.done}
          </Link>
        </div>
      </div>
    );
  }

  // 말로: 가운데 물방울(누르면 듣기·멈추기), 바로 밑에 받아 적는 글, 아래 둥근 마이크 · 기억해 두기
  // 글로: 적는 칸 하나와 기억해 두기
  const idle = !!text && !listening && !settling && !pending;
  const toggle = canListen ? (
    <div role="radiogroup" aria-label={labels.mode} className="relative z-10 mx-auto mt-4 flex shrink-0 rounded-full bg-fill p-1">
      {(["voice", "text"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => choose(m)}
          className={`relative flex h-10 items-center gap-1.5 rounded-full px-5 text-[14.5px] font-bold transition-colors before:absolute before:-inset-y-1 before:inset-x-0 ${mode === m ? "bg-white text-ink shadow-[0_1px_4px_rgba(31,35,64,0.12)]" : "text-muted"}`}
        >
          <Icon name={m === "voice" ? "mic" : "pencil"} size={16} strokeWidth={2} />
          {m === "voice" ? labels.modeVoice : labels.modeText}
        </button>
      ))}
    </div>
  ) : null;
  const errorLine = error ? (
    <p role="alert" className="text-center text-[14px] text-red">
      {error}
    </p>
  ) : null;

  // 글로: 적는 칸은 위에, 사람 줄(@ · 얼굴들)과 기억해 두기는 아래 막대에 붙여 키보드가 떠도 바로 위에 보인다.
  // '@낱말'을 적는 동안은 같은 줄이 찾은 사람으로 바뀐다(줄 높이가 그대로라 적는 칸을 가리지 않는다)
  if (mode === "text") {
    const row = listOpen ? options : people.filter((p, i) => i < 12 || who.some((w) => w.id === p.id));
    return (
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        {toggle}
        <div data-tour="voice" className="flex flex-col gap-2 px-4 pt-5">
          <textarea
            ref={field}
            value={text}
            onChange={onType}
            {...mentionProps}
            rows={5}
            maxLength={500}
            autoFocus={canListen}
            placeholder={labels.placeholderText}
            aria-label={labels.placeholderText}
            className="card min-h-[168px] w-full resize-none p-5 [html[data-kb]_&]:min-h-[132px] text-[18px] font-medium leading-[1.55] tracking-[-0.01em] outline-none placeholder:text-muted/80 focus:shadow-[inset_0_0_0_2px_var(--color-sky)]"
          />
          <div className="flex min-h-8 items-center justify-center">{errorLine}</div>
        </div>
        <div className="bottom-bar mt-auto flex flex-col gap-2.5 bg-bg px-4 pt-2.5">
          {people.length ? (
            <div
              id={listOpen ? "mention-list" : undefined}
              role={listOpen ? "listbox" : "group"}
              aria-label={labels.mentionList}
              className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={startMention}
                aria-label={labels.mention}
                className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white px-3 text-[19px] font-bold shadow-[inset_0_0_0_1.5px_var(--color-edge)]"
              >
                @
              </button>
              {row.map((p, i) => {
                const on = listOpen ? i === activeIndex : who.some((w) => w.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    id={listOpen ? `mention-${p.id}` : undefined}
                    role={listOpen ? "option" : undefined}
                    aria-selected={listOpen ? on : undefined}
                    aria-pressed={listOpen ? undefined : on}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => (listOpen ? pick(field.current, p) : togglePerson(p))}
                    className={`flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-1 pr-3.5 text-[14.5px] font-bold transition-colors ${
                      on ? "chip-on" : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-edge)]"
                    }`}
                  >
                    <Avatar config={p.avatar} size={34} label={mentionLabel(p)} />
                    {mentionLabel(p)}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button disabled={pending || !text.trim()} aria-busy={pending} className="btn-primary w-full">
            <SaveLabel pending={pending}>{labels.save}</SaveLabel>
          </button>
        </div>
      </form>
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
      {toggle}
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-4">
        <button
          type="button"
          onClick={() => void listen()}
          aria-pressed={listening}
          aria-label={listening ? labels.listening : labels.speak}
          disabled={pending || settling || !canListen}
          // 처음 안내(GuidedTour)가 짚는 곳
          data-tour="voice"
          className="shrink-0 rounded-full transition-transform active:scale-95 disabled:active:scale-100"
        >
          <WaterDrop active={listening || settling} measure={!nativeSpeech() && !shellDictation} beat={shown.length} />
        </button>
        <textarea
          ref={box}
          value={shown}
          onChange={onType}
          {...mentionProps}
          rows={1}
          maxLength={500}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="mt-2 max-h-[30vh] min-h-[84px] w-full resize-none overflow-y-auto bg-transparent text-center text-[20px] font-semibold leading-[1.5] tracking-[-0.02em] outline-none placeholder:font-medium placeholder:text-muted/80"
        />
        {mentionList("box")}
        <div className="flex h-8 items-center">
          {error ? (
            errorLine
          ) : idle ? (
            <button type="button" onClick={() => setText("")} className="relative text-[13.5px] font-bold text-muted underline underline-offset-4 before:absolute before:-inset-x-3 before:-inset-y-3.5">
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
            disabled={pending || settling}
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors ${listening ? "bg-ink text-white" : "bg-white text-ink shadow-[inset_0_0_0_1.5px_var(--color-edge)]"}`}
          >
            {/* 듣는 동안 마이크 둘레로 퍼지는 고리 */}
            {listening || settling ? <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-sky opacity-0 motion-safe:animate-[drop-ripple_1.8s_ease-out_infinite]" /> : null}
            <Icon name="mic" size={24} strokeWidth={2} className="relative" />
          </button>
        ) : null}
        <button disabled={pending || listening || settling || !text.trim()} aria-busy={pending} className="btn-primary flex-1">
          <SaveLabel pending={pending}>{labels.save}</SaveLabel>
        </button>
      </div>
    </form>
  );
}
