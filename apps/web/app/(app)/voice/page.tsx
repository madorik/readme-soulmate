import { VoiceView } from "@/components/pages/VoiceView";
import { loadVoice } from "@/lib/pages/settings";

export default async function Voice() {
  return <VoiceView {...await loadVoice()} />;
}
