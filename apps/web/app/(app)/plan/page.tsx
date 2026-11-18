import { PlanView } from "@/components/pages/PlanView";
import { loadPlan } from "@/lib/pages/plan";
import { firstParams } from "@/lib/pages/routes";

export default async function Plan({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PlanView {...await loadPlan({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
