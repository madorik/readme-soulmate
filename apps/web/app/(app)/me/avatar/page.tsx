import { MeAvatarView } from "@/components/pages/MeAvatarView";
import { loadMeAvatar } from "@/lib/pages/me";

export default async function MeProfile() {
  return <MeAvatarView {...await loadMeAvatar()} />;
}
