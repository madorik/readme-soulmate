import { RequestView } from "@/components/pages/RequestView";
import { loadRequest } from "@/lib/pages/settings";
import { firstParams } from "@/lib/pages/routes";

export default async function Request({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <RequestView {...await loadRequest({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
