import { VoiceView } from "@/components/pages/VoiceView";
import { firstParams } from "@/lib/pages/routes";
import { loadVoice } from "@/lib/pages/settings";

export default async function Voice({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <VoiceView {...await loadVoice({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
