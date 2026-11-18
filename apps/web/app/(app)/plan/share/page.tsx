import { PlanShareView } from "@/components/pages/PlanShareView";
import { loadPlanShare } from "@/lib/pages/plan-share";
import { firstParams } from "@/lib/pages/routes";

export default async function PlanShare({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PlanShareView {...await loadPlanShare({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
