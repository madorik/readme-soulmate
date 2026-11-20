// 말로 적기: 듣다가 스스로 멈추는 때를 정한다(웹 브라우저·iOS·안드로이드 모두 같은 규칙).
// 기기가 알려 주는 '새 중간 결과'만 보고 정하므로 플랫폼을 가리지 않는다(웹은 onresult, 앱은 partialResults).
// - 말소리가 들어온 뒤 silenceMs 동안 새 결과가 없으면 멈춘다("silence").
// - 시작하고 noSpeechMs 동안 아무 말이 없으면 멈춘다("no-speech").
// - 한 번에 길어야 maxMs까지만 듣는다("max").
// 멈추라는 알림(onStop)은 한 번만, 그 뒤에는 타이머가 모두 꺼진다. 직접 멈추거나 화면을 떠날 때는 dispose()

export const SILENCE_MS = 1800;
export const NO_SPEECH_MS = 8000;
export const MAX_LISTEN_MS = 60_000;

export type StopReason = "silence" | "no-speech" | "max";

export interface ListenGuardOptions {
  /** 멈춰야 할 때(한 번만) */
  onStop: (reason: StopReason) => void;
  silenceMs?: number;
  noSpeechMs?: number;
  maxMs?: number;
}

export interface ListenGuard {
  /** 받아 적은 글이 새로 들어왔다(같은 글이 다시 오거나 빈 글은 새 말소리로 치지 않는다) */
  heard: (text: string) => void;
  /** 멈췄거나 끝났다: 타이머를 모두 끈다(onStop은 부르지 않는다) */
  dispose: () => void;
}

export function startListenGuard(o: ListenGuardOptions): ListenGuard {
  const silenceMs = o.silenceMs ?? SILENCE_MS;
  const noSpeechMs = o.noSpeechMs ?? NO_SPEECH_MS;
  const maxMs = o.maxMs ?? MAX_LISTEN_MS;
  let over = false;
  let last = "";
  let noSpeech: ReturnType<typeof setTimeout> | null = null;
  let silence: ReturnType<typeof setTimeout> | null = null;
  let max: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (noSpeech) clearTimeout(noSpeech);
    if (silence) clearTimeout(silence);
    if (max) clearTimeout(max);
    noSpeech = silence = max = null;
  };
  const stop = (reason: StopReason) => {
    if (over) return;
    over = true;
    clear();
    o.onStop(reason);
  };

  noSpeech = setTimeout(() => stop("no-speech"), noSpeechMs);
  max = setTimeout(() => stop("max"), maxMs);

  return {
    heard: (text) => {
      if (over) return;
      const t = text.trim();
      if (!t || t === last) return;
      last = t;
      if (noSpeech) clearTimeout(noSpeech);
      noSpeech = null;
      if (silence) clearTimeout(silence);
      silence = setTimeout(() => stop("silence"), silenceMs);
    },
    dispose: () => {
      over = true;
      clear();
    },
  };
}
