import { PlanMenuView } from "@/components/pages/PlanMenuView";
import { loadPlanMenu } from "@/lib/pages/plan-menu";
import { firstParams } from "@/lib/pages/routes";

export default async function PlanMenu({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PlanMenuView {...await loadPlanMenu({ params: {}, searchParams: firstParams(await searchParams) })} />;
}
