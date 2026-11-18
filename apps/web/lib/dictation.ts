import type { Dictation, DictationOptions } from "./speech";

// 기기 받아쓰기도 브라우저 받아쓰기도 없는 곳의 받아쓰기(녹음 → 서버가 글로). 웹·앱은 없다(null).
// 토스 미니앱 번들은 이 파일을 녹음해서 서버(/api/t/transcribe)로 받아쓰는 것으로 바꿔 끼운다
export const shellDictation: ((o: DictationOptions) => Promise<Dictation>) | null = null;
