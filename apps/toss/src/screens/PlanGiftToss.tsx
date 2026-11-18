import { GiftPicksBody } from "@/components/GiftPicksView";
import { PlanGiftView } from "@/components/pages/PlanGiftView";
import type { GiftPicksData } from "@/lib/pages/gift-picks.data";
import type { PlanGiftData } from "@/lib/pages/plan-gift.data";

// 같이 고르기 > 선물: 앱과 같은 화면. 웹은 사람마다 고른 선물을 나중에 채우고(Suspense), 토스는 서버가 미리 넣어 준 것(picksBy)을 그린다
export function PlanGiftToss({ picksBy, ...data }: PlanGiftData & { picksBy: Record<string, GiftPicksData | null> }) {
  return (
    <PlanGiftView
      {...data}
      picks={{
        row: (p) => <GiftPicksBody picks={picksBy[p.contactId] ?? null} locale={data.locale} pad="px-5" title={false} />,
        disclosure: null,
      }}
    />
  );
}
