import "server-only";
import { aiLimits, isAiGate, isMissingQuotaTable, type AiGate, type AiKind } from "./ai-quota-core";
import { asSystem } from "./db";

// OpenAI를 부르기 전에 자리를 잡는다(reserve_ai_call, 마이그레이션 0022). 사람마다·종류마다 지난 24시간 호출 수와 서비스 전체 호출 수를 센다.
// - 부르는 쪽: ok가 아니면 OpenAI를 부르지 않는다(말로 적기는 '오늘은 다 썼어요', 선물 추천은 AI 없이 기록만으로)
// - 표·함수가 아직 없으면(배포와 마이그레이션 사이) 예전처럼 통과시킨다. 그 밖의 오류는 막는다(비용이 새는 쪽보다 낫다)

export type { AiGate, AiKind };

export async function reserveAi(user: { id: string; demo: boolean }, kind: AiKind): Promise<AiGate> {
  const limits = aiLimits(kind, user.demo);
  try {
    const row = await asSystem((q) =>
      q.one<{ r: string }>("select public.reserve_ai_call($1, $2, $3, $4) as r", [user.id, kind, limits.user, limits.global]),
    );
    const r = row?.r;
    if (!isAiGate(r)) return "error";
    if (r !== "ok") console.warn("ai blocked", kind, r);
    return r;
  } catch (e) {
    if (isMissingQuotaTable(e)) {
      console.warn("ai quota table missing (run migrations)");
      return "ok";
    }
    console.warn("ai quota failed", e instanceof Error ? e.message : e);
    return "error";
  }
}
