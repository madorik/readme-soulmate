import "server-only";
import { readCard, requireSession } from "@/lib/data";
import { safeNext } from "@/lib/site";
import type { PageInput } from "./routes";
import type { OnboardingAvatarData, OnboardingBirthdayData, OnboardingFoodData } from "./types";

// 처음 화면(얼굴 → 음식 → 생일). 다 마치면 next로

export async function loadOnboardingAvatar({ searchParams }: PageInput): Promise<OnboardingAvatarData> {
  const next = safeNext(searchParams.next);
  const s = await requireSession({ onboarding: true });
  return { locale: s.profile.locale, name: s.profile.displayName, avatar: s.profile.avatar, next };
}

export async function loadOnboardingFood({ searchParams }: PageInput): Promise<OnboardingFoodData> {
  const next = safeNext(searchParams.next);
  const s = await requireSession({ onboarding: true });
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  return { locale: s.profile.locale, safety: card.safety ?? null, spicy: card.taste?.spicy ?? null, next };
}

export async function loadOnboardingBirthday({ searchParams }: PageInput): Promise<OnboardingBirthdayData> {
  const next = safeNext(searchParams.next);
  const s = await requireSession({ onboarding: true });
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  return { locale: s.profile.locale, birthday: card.dates?.birthday ?? null, offsets: s.profile.reminderOffsets, next };
}
