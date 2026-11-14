import { requireSession } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { safeNext } from "@/lib/site";
import { StepHeader } from "../StepHeader";
import { AvatarStep } from "../Steps";

export default async function OnboardingAvatar({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = safeNext(raw);
  const s = await requireSession({ onboarding: true });
  const t = makeT(s.profile.locale);
  return (
    <>
      <StepHeader step={1} t={t} title={t("onb.avatar.title")} body={t("onb.avatar.body")} />
      <AvatarStep locale={s.profile.locale} name={s.profile.displayName} avatar={s.profile.avatar} next={next} />
    </>
  );
}
