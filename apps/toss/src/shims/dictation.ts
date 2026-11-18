import type { Dictation, DictationOptions } from "@/lib/speech";
import { api } from "../api";
import { askMicrophone } from "../bridge";

// lib/dictation 대신: 토스 웹뷰에는 기기 받아쓰기가 없어서 녹음했다가 멈추면 서버(/api/t/transcribe → OpenAI)가 글로 바꾼다. 길어야 60초

const MAX_MS = 60_000;

function pickType(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) ?? "";
}

export const shellDictation: ((o: DictationOptions) => Promise<Dictation>) | null = async (o) => {
  if (!(await askMicrophone()) || !navigator.mediaDevices?.getUserMedia) throw new Error("mic");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = pickType();
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  let cancelled = false;
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stop = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  const timer = window.setTimeout(stop, MAX_MS);
  recorder.onstop = async () => {
    window.clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    if (cancelled) return;
    o.onSettling?.();
    const blobType = (recorder.mimeType || type || "audio/webm").split(";")[0];
    try {
      const { text } = await api<{ text: string }>("transcribe", { body: new Blob(chunks, { type: blobType }), type: blobType });
      if (text) o.onText(text);
      o.onDone(text ?? "");
    } catch {
      o.onDone("");
    }
  };
  recorder.start();
  return {
    stop,
    cancel: () => {
      cancelled = true;
      stop();
    },
  };
};
