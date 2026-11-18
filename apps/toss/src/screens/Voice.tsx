import { useEffect, useRef, useState } from "react";
import { DropOrb } from "@/components/DropOrb";
import { Icon } from "@/components/marks";
import type { CaptureState } from "@/app/actions/capture";
import { api, ApiError } from "../api";
import { askMicrophone, loadValue, saveValue } from "../bridge";
import { useNav } from "../nav";
import { AiBadge, BottomBar, Page } from "../ui";

// 말로 적기: 녹음해서 글로 받아 적거나(서버 받아쓰기) 직접 적고, '기억하기'를 누르면 AI가 사람 기록·메모로 나눠 넣는다.
// 처음 한 번은 AI가 정리한다는 것을 알린다(생성형 AI 고지)

const AI_NOTICE_KEY = "ry_ai_notice";
const MAX_RECORD_MS = 60_000;

type Phase = "idle" | "recording" | "transcribing" | "saving" | "done";

const ERRORS: Record<string, string> = {
  ai_off: "지금은 말로 적기를 쓸 수 없어요",
  limit: "오늘은 말로 적기를 많이 썼어요. 내일 다시 써 주세요",
  nothing: "기억해 둘 내용을 찾지 못했어요",
  failed: "잠시 연결이 안 돼요. 다시 눌러 주세요",
  mic: "마이크를 쓸 수 없어요. 글로 적어 주세요",
};

function pickType(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) ?? "";
}

export function Voice({ about }: { about?: string }) {
  const { push, back, bump } = useNav();
  const [notice, setNotice] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureState | null>(null);
  const [undone, setUndone] = useState(false);
  const rec = useRef<{ recorder: MediaRecorder; stream: MediaStream; timer: number } | null>(null);

  useEffect(() => {
    void loadValue(AI_NOTICE_KEY).then((v) => setNotice(v !== "1"));
    return () => {
      const r = rec.current;
      if (r) {
        window.clearTimeout(r.timer);
        r.recorder.onstop = null;
        if (r.recorder.state !== "inactive") r.recorder.stop();
        r.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const okNotice = () => {
    setNotice(false);
    void saveValue(AI_NOTICE_KEY, "1");
  };

  const startRecording = async () => {
    setError(null);
    if (!(await askMicrophone()) || !navigator.mediaDevices?.getUserMedia) return setError("mic");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError("mic");
    }
    const type = pickType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      const blob = new Blob(chunks, { type: (recorder.mimeType || type || "audio/webm").split(";")[0] });
      void transcribe(blob);
    };
    recorder.start();
    rec.current = { recorder, stream, timer: window.setTimeout(() => recorder.state !== "inactive" && recorder.stop(), MAX_RECORD_MS) };
    setPhase("recording");
  };

  const stopRecording = () => {
    const r = rec.current;
    if (!r) return;
    window.clearTimeout(r.timer);
    setPhase("transcribing");
    if (r.recorder.state !== "inactive") r.recorder.stop();
  };

  const transcribe = async (blob: Blob) => {
    setPhase("transcribing");
    try {
      const { text: heard } = await api<{ text: string }>("transcribe", { body: blob, type: blob.type || "audio/webm" });
      if (heard) setText((v) => (v.trim() ? `${v.trim()} ${heard}` : heard));
      else setError("nothing");
    } catch (e) {
      setError(e instanceof ApiError && ERRORS[e.code] ? e.code : "failed");
    }
    setPhase("idle");
  };

  const save = async () => {
    if (!text.trim() || phase !== "idle") return;
    setPhase("saving");
    setError(null);
    try {
      const r = await api<CaptureState>("capture", { json: { text, about } });
      if (r.error) {
        setError(r.error);
        setPhase("idle");
        return;
      }
      bump();
      setResult(r);
      setUndone(false);
      setPhase("done");
    } catch {
      setError("failed");
      setPhase("idle");
    }
  };

  const undo = async () => {
    if (!result) return;
    try {
      await api("capture/undo", { json: { ops: result.undo } });
      bump();
      setUndone(true);
    } catch {
      setError("failed");
    }
  };

  const again = () => {
    setText("");
    setResult(null);
    setUndone(false);
    setError(null);
    setPhase("idle");
  };

  if (phase === "done" && result) {
    return (
      <Page>
        <div className="flex items-center gap-2 px-6 pt-1">
          <h1 className="headline text-[22px]">{undone ? "되돌렸어요" : "기억해 뒀어요"}</h1>
          {undone ? null : <AiBadge>AI 정리</AiBadge>}
        </div>
        <ul className={`card mx-4 mt-4 flex flex-col px-[18px] ${undone ? "opacity-50" : ""}`}>
          {result.lines.map((l, i) => {
            const id = l.href.match(/\/people\/([0-9a-f-]{36})/)?.[1];
            return (
              <li key={i} className="border-t border-rule first:border-t-0">
                <button type="button" disabled={!id || undone} onClick={() => id && push({ name: "person", id })} className="flex min-h-[60px] w-full flex-col justify-center gap-0.5 py-3 text-left">
                  <span className="text-[13px] font-bold text-accent">
                    {l.who}
                    {l.isNew ? " · 새 사람" : ""} · {l.field}
                  </span>
                  <span className={`text-[15.5px] leading-[1.45] ${l.op === "remove" ? "text-muted line-through" : ""}`}>{l.value}</span>
                  {l.same ? <span className="text-[12.5px] text-muted">이미 적혀 있었어요</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {error ? <p role="alert" className="px-6 pt-3 text-[13.5px] text-red">{ERRORS[error] ?? ERRORS.failed}</p> : null}
        <div className="h-6" />
        <BottomBar>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => void undo()} disabled={undone} aria-label="되돌리기" className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-rule disabled:opacity-40">
              <Icon name="undo" size={22} strokeWidth={2} />
            </button>
            <button type="button" onClick={again} aria-label="더 적기" className="flex h-[54px] shrink-0 items-center justify-center gap-1 rounded-full bg-white px-5 ring-1 ring-rule">
              <Icon name="mic" size={20} strokeWidth={2} />
              <Icon name="pencil" size={18} strokeWidth={2} />
            </button>
            <button type="button" onClick={back} className="btn-primary flex-1">
              완료
            </button>
          </div>
        </BottomBar>
      </Page>
    );
  }

  const recording = phase === "recording";
  const busy = phase === "transcribing" || phase === "saving";
  return (
    <Page>
      {notice ? (
        <div className="mx-4 flex flex-col gap-3 rounded-2xl bg-sky-soft px-4 py-3.5">
          <p className="flex items-start gap-2 text-[14px] leading-[1.55] text-ink-2">
            <AiBadge />
            <span>말로 적기와 선물 추천은 AI가 만들어요. 틀릴 수 있으니 결과를 확인해 주세요.</span>
          </p>
          <button type="button" onClick={okNotice} className="self-end px-1 text-[14px] font-bold text-accent">
            확인
          </button>
        </div>
      ) : null}
      <div className="px-4 pt-3">
        <textarea
          aria-label="기억해 둘 말"
          className="field min-h-[160px] resize-none leading-[1.6]"
          value={text}
          maxLength={500}
          disabled={busy || recording}
          placeholder="예: 와이프는 바닐라라떼를 좋아해"
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex flex-col items-center gap-3 pt-6">
        <button
          type="button"
          onClick={() => (recording ? stopRecording() : void startRecording())}
          disabled={busy}
          aria-label={recording ? "녹음 멈추기" : "말로 적기"}
          aria-pressed={recording}
          className="relative flex h-[96px] w-[96px] items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60"
        >
          {recording ? <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-sky/40" /> : null}
          <span className="relative flex items-center justify-center">
            <DropOrb size={88} />
            <span aria-hidden="true" className="absolute text-ink">
              {recording ? <span className="block h-5 w-5 rounded-[5px] bg-ink" /> : <Icon name="mic" size={30} strokeWidth={2} />}
            </span>
          </span>
        </button>
        <p role="status" aria-live="polite" className="min-h-6 text-[14px] font-medium text-muted">
          {recording ? "듣는 중" : phase === "transcribing" ? "받아 적는 중…" : phase === "saving" ? "AI가 정리하는 중…" : ""}
        </p>
        {error ? <p role="alert" className="px-6 text-center text-[13.5px] text-red">{ERRORS[error] ?? ERRORS.failed}</p> : null}
      </div>
      <div className="h-6" />
      <BottomBar>
        <button type="button" onClick={() => void save()} disabled={!text.trim() || phase !== "idle"} className="btn-primary w-full">
          기억하기
        </button>
      </BottomBar>
    </Page>
  );
}
