import { OnboardingBirthdayView } from "@/components/pages/OnboardingViews";
import { loadOnboardingBirthday } from "@/lib/pages/onboarding";
import { firstParams } from "@/lib/pages/routes";

export default async function OnboardingBirthday({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <OnboardingBirthdayView {...await loadOnboardingBirthday({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
