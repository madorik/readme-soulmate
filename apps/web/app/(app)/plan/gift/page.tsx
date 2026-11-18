import { Suspense } from "react";
import { GiftPicks, GiftPicksSkeleton, PicksDisclosure } from "@/components/GiftPicks";
import { PlanGiftView } from "@/components/pages/PlanGiftView";
import { requireSession } from "@/lib/data";
import { loadPlanGift } from "@/lib/pages/plan-gift";
import { firstParams } from "@/lib/pages/routes";
import { makeT } from "@/lib/t";

export default async function PlanGift({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await loadPlanGift({ params: {}, searchParams: firstParams(await searchParams) });
  // 선물 추천은 AI·쿠팡을 부르느라 몇 초 걸려 화면을 먼저 그리고 Suspense로 나중에 채운다(서버 컴포넌트라 웹에서만)
  const s = await requireSession();
  const t = makeT(data.locale);
  return (
    <PlanGiftView
      {...data}
      picks={{
        row: (p, name, next) => (
          <Suspense fallback={<GiftPicksSkeleton rows={1} pad="px-5" loading={[1, 2, 3, 4].map((n) => t(`picks.loading.${n}` as "picks.loading.1", { name }))} />}>
            <GiftPicks s={s} person={p} occasion={next ? { kind: next.kind, label: next.label ?? "" } : null} today={data.today} max={2} pad="px-5" title={false} />
          </Suspense>
        ),
        disclosure: <PicksDisclosure text={t("picks.disclosure")} />,
      }}
    />
  );
}
