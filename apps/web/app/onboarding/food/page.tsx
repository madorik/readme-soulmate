import { OnboardingFoodView } from "@/components/pages/OnboardingViews";
import { loadOnboardingFood } from "@/lib/pages/onboarding";
import { firstParams } from "@/lib/pages/routes";

export default async function OnboardingFood({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <OnboardingFoodView {...await loadOnboardingFood({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
