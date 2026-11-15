import "server-only";
import type { Locale } from "@readme/core";
import { captureRequest, parseCapture, type CaptureItem, type CapturePerson } from "./capture-ai";

// 말로 적기: 한 문장을 (누구, 어느 칸, 값) 여러 개로 나눈다. OpenAI Responses API + JSON 스키마(구조화 출력). 요청 몸·응답 풀기는 capture-ai.ts.
// 키(OPENAI_API_KEY)가 없으면 기능을 숨긴다. 모델은 OPENAI_MODEL(기본 gpt-6-luna), 주소는 OPENAI_BASE_URL(기본 api.openai.com/v1, 시험용 가짜 서버로 바꿀 수 있다).

export type { CaptureItem, CapturePerson };

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** 문장 하나를 나눈다. 실패하면 throw */
export async function classifyCapture(text: string, people: CapturePerson[], locale: Locale, about: CapturePerson | null = null): Promise<CaptureItem[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ai_off");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(captureRequest(text, people, locale, process.env.OPENAI_MODEL || "gpt-6-luna", "medium", about)),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`ai_http_${res.status}`);
  return parseCapture(await res.json());
}
