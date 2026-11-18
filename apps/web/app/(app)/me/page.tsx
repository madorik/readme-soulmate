import { MeView } from "@/components/pages/MeView";
import { loadMe } from "@/lib/pages/me";
import { firstParams } from "@/lib/pages/routes";

export default async function Me({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MeView {...await loadMe({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
