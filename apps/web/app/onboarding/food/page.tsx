import { readCard, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { safeNext } from "@/lib/site";
import { StepHeader } from "../StepHeader";
import { FoodStep } from "../Steps";

export default async function OnboardingFood({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = safeNext(raw);
  const q = next !== "/home" ? `?next=${encodeURIComponent(next)}` : "";
  const s = await requireSession({ onboarding: true });
  const t = makeT(s.profile.locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  return (
    <>
      <StepHeader step={2} back={`/onboarding/avatar${q}`} skip={`/onboarding/birthday${q}`} t={t} title={t("onb.food.title")} />
      <FoodStep locale={s.profile.locale} safety={card.safety ?? null} spicy={card.taste?.spicy ?? null} next={next} />
    </>
  );
}
