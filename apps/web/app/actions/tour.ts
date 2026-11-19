"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/data";
import { track } from "@/lib/track";

// 가입 직후 체험(말로·글로 적기 → 물어보기)의 이용 기록과 끝내기. 내용(이름·기록)은 남기지 않고 어느 단계에서 무엇을 했는지만(/admin)

const EVENT = { view: "tour_view", capture: "tour_capture", fail: "tour_fail", ask: "tour_ask" } as const;
/** 기록에 남길 수 있는 값: 어느 화면(voice·ask), 어떻게 적었나(voice·text), 왜 못 적었나, 누구에게 물었나 */
const SOURCES = new Set(["voice", "text", "ask", "person", "new", "ai_off", "failed", "nothing", "limit"]);

/** 체험 화면을 봤다 / 적었다(말로·글로) / 못 적었다(이유) / 물어보기 링크를 만들었다 */
export async function trackTour(event: keyof typeof EVENT, source?: string): Promise<void> {
  if (!(event in EVENT)) return;
  const s = await requireSession();
  track(EVENT[event], { userId: s.user.id, source: typeof source === "string" && SOURCES.has(source) ? source : null });
}

/** 체험을 끝내고 홈으로: kind=done이면 마침, 아니면 건너뜀. source는 어느 단계(voice·ask)에서 */
export async function leaveTour(form: FormData): Promise<void> {
  const s = await requireSession();
  const at = form.get("source") === "ask" ? "ask" : "voice";
  track(form.get("kind") === "done" ? "tour_done" : "tour_skip", { userId: s.user.id, source: at });
  redirect("/home");
}
