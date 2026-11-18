import { OnboardingIntroView } from "@/components/pages/OnboardingViews";
import { loadOnboardingIntro } from "@/lib/pages/onboarding";
import { firstParams } from "@/lib/pages/routes";

export default async function OnboardingIntro({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <OnboardingIntroView {...await loadOnboardingIntro({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
