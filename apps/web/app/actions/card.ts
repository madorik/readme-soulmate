"use server";

import { applyAnswer, emptySection, isSection, QUESTIONS, sanitizeAvatar, sanitizeOffsets, type DailyQuestion, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readCard, requireSession, writeSection } from "@/lib/data";
import { safeNext } from "@/lib/site";

function json(v: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(v ?? "null"));
  } catch {
    return null;
  }
}

function validTimeZone(v: unknown): string {
  const tz = String(v ?? "");
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz.slice(0, 64) || "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

function withNext(path: string, next: string): string {
  return next && next !== "/home" ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/** 아바타·이름 저장. 온보딩 1단계와 내 리드미의 "얼굴 고치기"가 같이 쓴다 */
export async function saveAvatar(form: FormData): Promise<void> {
  const s = await requireSession({ onboarding: true });
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const avatar = sanitizeAvatar(json(form.get("avatar")));
  const tz = form.get("tz") ? validTimeZone(form.get("tz")) : null;
  await s.tx((q) => q("update profiles set display_name = $2, avatar = $3, time_zone = coalesce($4, time_zone) where id = $1", [s.user.id, name, JSON.stringify(avatar), tz]));
  const next = safeNext(String(form.get("next") ?? ""));
  if (form.get("mode") === "edit") {
    revalidatePath("/me");
    redirect("/me");
  }
  redirect(withNext("/onboarding/food", next));
}

/** 온보딩 2단계: 알레르기·안 먹는 것 + 매운맛 */
export async function saveFood(form: FormData): Promise<void> {
  const s = await requireSession({ onboarding: true });
  await s.tx(async (q) => {
    await writeSection(q, s.user.id, "safety", json(form.get("safety")));
    const { card } = await readCard(q, s.user.id);
    await writeSection(q, s.user.id, "taste", { ...(card.taste ?? emptySection("taste")), spicy: json(form.get("spicy")) });
  });
  redirect(withNext("/onboarding/birthday", safeNext(String(form.get("next") ?? ""))));
}

/** 온보딩 3단계: 생일 + 알림 시점, 그리고 온보딩 끝 */
export async function finishOnboarding(form: FormData): Promise<void> {
  const s = await requireSession({ onboarding: true });
  await s.tx(async (q) => {
    const { card } = await readCard(q, s.user.id);
    await writeSection(q, s.user.id, "dates", { ...(card.dates ?? emptySection("dates")), birthday: json(form.get("birthday")) });
    await q("update profiles set reminder_offsets = $2, onboarded_at = coalesce(onboarded_at, now()) where id = $1", [s.user.id, sanitizeOffsets(json(form.get("offsets")))]);
  });
  redirect(safeNext(String(form.get("next") ?? "")));
}

export interface SaveState {
  saved: boolean;
  error: boolean;
}

/** 내 리드미 항목 하나 저장 */
export async function saveSection(_: SaveState, form: FormData): Promise<SaveState> {
  const s = await requireSession();
  const section = form.get("section");
  if (!isSection(section)) return { saved: false, error: true };
  try {
    await s.tx((q) => writeSection(q, s.user.id, section as Section, json(form.get("data"))));
  } catch {
    return { saved: false, error: true };
  }
  revalidatePath("/me");
  revalidatePath("/home");
  return { saved: true, error: false };
}

/** 오늘의 질문 답 → 카드 칸 */
export async function answerQuestion(form: FormData): Promise<void> {
  const s = await requireSession();
  const id = String(form.get("id")) as DailyQuestion["id"];
  const value = String(form.get("value") ?? "").trim();
  if (!QUESTIONS.some((x) => x.id === id) || !value) return;
  await s.tx(async (q) => {
    const { card } = await readCard(q, s.user.id);
    for (const [section, data] of Object.entries(applyAnswer(card, id, value, s.profile.locale))) {
      if (isSection(section)) await writeSection(q, s.user.id, section, data);
    }
  });
  revalidatePath("/home");
  redirect("/home?answered=1");
}

/** 생일 알림 시점(공유 관리에서) */
export async function saveOffsets(form: FormData): Promise<void> {
  const s = await requireSession();
  await s.tx((q) => q("update profiles set reminder_offsets = $2 where id = $1", [s.user.id, sanitizeOffsets(json(form.get("offsets")))]));
  revalidatePath("/privacy");
}
