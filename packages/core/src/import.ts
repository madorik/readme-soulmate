import { clip } from "./text";

// 메모 가져오기: 사람들이 따로 적어 둔 메모(붙여넣은 글, 받아쓴 글)를 AI가 나눌 수 있게 다듬고 조각으로 자른다. 순수 함수라 서버·시험이 같이 쓴다.

/** 한 번에 가져올 수 있는 글자 수 */
export const IMPORT_MAX = 6000;
/** 조각 하나의 글자 수(AI 한 번에 읽히는 양) */
export const IMPORT_CHUNK = 1200;
/** 조각 수 위쪽 한도(동시에 부르는 수) */
export const IMPORT_CHUNKS_MAX = 6;

/** 줄바꿈은 살리고(사람·줄 구분이 거기 있다) 나머지 공백·제어 문자는 정리한다. 길이 한도 안으로 */
export function cleanMemo(raw: unknown, max = IMPORT_MAX): string {
  const text = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    // 탭·제어 문자·폭 없는 문자는 공백으로
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‍﻿]/g, " ")
    .replace(/\t/g, " ")
    .split("\n")
    .map((l) => l.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clip(text, max).trim();
}

/** 줄 하나가 한도보다 길면 문장·공백에서 잘라 한도 안의 토막으로 */
function pieces(line: string, size: number): string[] {
  if (line.length <= size) return [line];
  const out: string[] = [];
  let rest = line;
  while (rest.length > size) {
    const head = rest.slice(0, size);
    const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("。"), head.lastIndexOf("! "), head.lastIndexOf("? "), head.lastIndexOf(", "), head.lastIndexOf(" "));
    const at = cut > size * 0.4 ? cut + 1 : size;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** 줄 단위로 모아 한도 안의 조각들로: 빈 줄(사람·묶음 사이)에서 끊기를 좋아하고, 조각이 너무 많으면 조각을 키운다 */
export function splitMemo(memo: string, size = IMPORT_CHUNK, maxChunks = IMPORT_CHUNKS_MAX): string[] {
  const text = cleanMemo(memo);
  if (!text) return [];
  let limit = Math.max(200, size);
  for (;;) {
    const chunks: string[] = [];
    let cur: string[] = [];
    let len = 0;
    const flush = () => {
      const joined = cur.join("\n").trim();
      if (joined) chunks.push(joined);
      cur = [];
      len = 0;
    };
    for (const line of text.split("\n").flatMap((l) => pieces(l, limit))) {
      // 빈 줄은 묶음 사이: 조각이 어느 정도 찼으면 여기서 끊는다
      if (!line) {
        if (len >= limit * 0.6) flush();
        else if (cur.length) cur.push("");
        continue;
      }
      if (len + line.length + 1 > limit) flush();
      cur.push(line);
      len += line.length + 1;
    }
    flush();
    if (chunks.length <= maxChunks || limit >= text.length) return chunks.slice(0, Math.max(1, chunks.length));
    limit = Math.ceil(limit * 1.4);
  }
}
