import { PersonView } from "@/components/pages/PersonView";
import { loadPerson } from "@/lib/pages/person";
import { firstParams } from "@/lib/pages/routes";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PersonView {...await loadPerson({ params: await params, searchParams: firstParams(await searchParams) })} />;
}
