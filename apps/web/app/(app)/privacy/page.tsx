import { PrivacyView } from "@/components/pages/PrivacyView";
import { loadPrivacy } from "@/lib/pages/settings";

export default async function Privacy() {
  return <PrivacyView {...await loadPrivacy()} />;
}
