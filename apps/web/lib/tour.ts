import "server-only";
import { translate, type Locale } from "@readme/core";
import type { TourStep } from "@/components/GuidedTour";
import { aiConfigured } from "./ai";

// 온보딩 뒤 안내(GuidedTour)의 단계: 말로 적기(가운데 버튼이 여는 페이지) → 물어보기. 선물 추천·같이 고르기는 사람이 있어야 의미가 있어 넣지 않는다.
// AI가 꺼져 말로 적기가 없으면 물어보기만. 첫 단계 주소는 tourStart()

export function tourSteps(locale: Locale): TourStep[] {
  const steps: TourStep[] = [];
  if (aiConfigured()) steps.push({ path: "/voice", target: "voice", title: translate(locale, "tour.voice.title"), body: translate(locale, "tour.voice.body") });
  steps.push({ path: "/request", target: "ask", title: translate(locale, "tour.ask.title"), body: translate(locale, "tour.ask.body") });
  return steps;
}

/** 안내의 첫 페이지 주소 */
export function tourStart(): string {
  return `${aiConfigured() ? "/voice" : "/request"}?tour=1`;
}
