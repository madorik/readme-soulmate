import { readCard, requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { safeNext } from "@/lib/site";
import { StepHeader } from "../StepHeader";
import { BirthdayStep } from "../Steps";

export default async function OnboardingBirthday({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = safeNext(raw);
  const q = next !== "/home" ? `?next=${encodeURIComponent(next)}` : "";
  const s = await requireSession({ onboarding: true });
  const t = makeT(s.profile.locale);
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  return (
    <>
      <StepHeader step={3} back={`/onboarding/food${q}`} t={t} title={t("onb.birthday.title")} body={t("onb.birthday.body")} />
      <BirthdayStep locale={s.profile.locale} birthday={card.dates?.birthday ?? null} offsets={s.profile.reminderOffsets} next={next} />
    </>
  );
}
