import { OnboardingAvatarView } from "@/components/pages/OnboardingViews";
import { loadOnboardingAvatar } from "@/lib/pages/onboarding";
import { firstParams } from "@/lib/pages/routes";

export default async function OnboardingAvatar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <OnboardingAvatarView {...await loadOnboardingAvatar({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
