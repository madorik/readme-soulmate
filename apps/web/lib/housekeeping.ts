import "server-only";
import { asSystem } from "./db";
import { keepDays } from "./housekeeping-core";

// 매일 크론에서 하는 정리(표가 끝없이 커지지 않게). 하나가 실패해도(표·함수가 아직 없어도) 알림 일에는 영향이 없다.
// - 이용 기록 접기: APP_EVENTS_KEEP_DAYS(기본 180, 90 밑으로는 못 내린다)일보다 오래된 날은 (날짜, 사람)마다 줄 하나로(compact_app_events, 마이그레이션 0023)
// - AI 호출 기록: 한도는 지난 24시간만 세므로 3일 지난 것은 지운다(마이그레이션 0022)
// - 속도 제한 기록(rate_hits, 0027): 창이 끝나고 하루 지난 것은 지운다
// - 알림 표: 지난 생일·기념일 알림은 일정이 지나고 14일 뒤(알림 시점은 최대 14일 전이라 그 뒤엔 다시 만들어지지 않는다), 답장 알림은 90일 뒤에 지운다

export async function tidyUsage(): Promise<{ eventsCompacted: number | null; aiCallsRemoved: number | null; rateHitsRemoved: number | null; notificationsRemoved: number | null }> {
  let eventsCompacted: number | null = null;
  let aiCallsRemoved: number | null = null;
  let rateHitsRemoved: number | null = null;
  let notificationsRemoved: number | null = null;
  try {
    const row = await asSystem((q) => q.one<{ n: number }>("select public.compact_app_events($1) as n", [keepDays()]));
    eventsCompacted = Number(row?.n ?? 0);
  } catch (e) {
    console.warn("compact events failed", e instanceof Error ? e.message : e);
  }
  try {
    const rows = await asSystem((q) => q("delete from public.ai_calls where at < now() - interval '3 days' returning id"));
    aiCallsRemoved = rows.length;
  } catch (e) {
    console.warn("prune ai calls failed", e instanceof Error ? e.message : e);
  }
  try {
    const rows = await asSystem((q) => q("delete from public.rate_hits where reset_at < now() - interval '1 day' returning key"));
    rateHitsRemoved = rows.length;
  } catch (e) {
    console.warn("prune rate hits failed", e instanceof Error ? e.message : e);
  }
  try {
    const rows = await asSystem((q) =>
      q(
        `delete from public.notifications
          where (kind in ('birthday', 'anniversary') and event_date < current_date - 14)
             or (kind = 'answered' and created_at < now() - interval '90 days')
          returning id`,
      ),
    );
    notificationsRemoved = rows.length;
  } catch (e) {
    console.warn("prune notifications failed", e instanceof Error ? e.message : e);
  }
  return { eventsCompacted, aiCallsRemoved, rateHitsRemoved, notificationsRemoved };
}
