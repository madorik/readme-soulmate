import type { YMD } from "@readme/core";
import { GiftPicksBody } from "@/components/GiftPicksView";
import { PicksContent } from "@/components/PicksContent";
import type { Person, Session } from "@/lib/data";
import type { GiftContext } from "@/lib/gift-core";
import { loadGiftPicks } from "@/lib/pages/gift-picks";

// 이런 선물은 어때요(서버에서 고르고 바로 그리기). 고르기는 lib/pages/gift-picks, 그리기는 components/GiftPicksView.
// 화면은 Suspense로 감싸 먼저 그리고, 이 부분만 나중에 채운다(처음엔 AI·쿠팡을 부르느라 몇 초 걸린다).
// 고르는 동안엔 PicksStage가 꼬마 마법사 장면을 보이고, 다 고르면 번쩍임 뒤에 PicksContent가 드러난다

export { parseSkip, PicksDisclosure } from "@/components/GiftPicksView";

/**
 * 이 사람에게 어울릴 선물(max: 상품 방식에서 찾을 말 몇 개까지). title이 없으면 고지 없이(여러 사람 화면).
 * again: 다시 고르기 주소의 앞부분(지금 화면 주소). 주면 오른쪽 위에 다시 고르기 단추(부모 section이 relative여야 한다)
 */
export async function GiftPicks({ s, person, occasion, today, max, pad = "px-6", title = true, skip = [], again }: { s: Session; person: Person; occasion: GiftContext["occasion"]; today: YMD; max?: number; pad?: string; title?: boolean; skip?: string[]; again?: string }) {
  const picks = await loadGiftPicks(s, person, { occasion, today, max, skip });
  return (
    <PicksContent>
      <GiftPicksBody picks={picks} locale={s.profile.locale} pad={pad} title={title} again={again} />
    </PicksContent>
  );
}
