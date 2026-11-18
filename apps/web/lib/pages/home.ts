import "server-only";
import { aiConfigured } from "@/lib/ai";
import { listPeople, readCard, requireSession, todayFor, unreadAnswers } from "@/lib/data";
import type { HomeData } from "./home.data";
import type { PageInput } from "./routes";

/** 홈: 사람들·내 기록·아직 안 본 답장 */
export async function loadHome({ searchParams }: PageInput): Promise<HomeData> {
  const s = await requireSession();
  const today = todayFor(s.profile);
  const [people, mine, answers] = await Promise.all([listPeople(s), s.tx((q) => readCard(q, s.user.id)), s.tx((q) => unreadAnswers(q, s.user.id))]);
  return { locale: s.profile.locale, avatar: s.profile.avatar, today, people, card: mine.card, answers, answered: !!searchParams.answered, ai: aiConfigured() };
}
