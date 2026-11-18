import { MeEditView } from "@/components/pages/MeEditView";
import { loadMeEdit } from "@/lib/pages/me";
import { firstParams } from "@/lib/pages/routes";

export default async function EditMe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MeEditView {...await loadMeEdit({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
