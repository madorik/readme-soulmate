import "server-only";
import { isAdminAccount } from "@/lib/admin";
import { aiConfigured } from "@/lib/ai";
import { questionForPeople } from "@readme/core";
import { listPeople, requireSession, todayFor, unreadAnswers } from "@/lib/data";
import type { HomeData } from "./home.data";
import type { PageInput } from "./routes";

/** 홈: 사람들·오늘의 질문(사람에 대한 빈 칸 하나)·아직 안 본 답장 */
export async function loadHome({ searchParams }: PageInput): Promise<HomeData> {
  const s = await requireSession();
  const today = todayFor(s.profile);
  const [people, answers] = await Promise.all([listPeople(s), s.tx((q) => unreadAnswers(q, s.user.id))]);
  // 사람들 줄과 같은 순서(즐겨찾기 먼저)로 늘어놓고 날짜마다 돌려 가며 고른다. 건너뛰기(?skip=)는 그만큼 더 옮긴다
  const skip = Math.min(Math.max(Number.parseInt(searchParams.skip ?? "0", 10) || 0, 0), 500);
  const ordered = [...people].sort((a, b) => Number(b.favorite) - Number(a.favorite));
  const asked = questionForPeople(today, ordered, skip);
  return {
    locale: s.profile.locale,
    avatar: s.profile.avatar,
    today,
    people,
    question: asked ? { contactId: asked.contactId, q: asked.question } : null,
    questionSkip: skip,
    answers,
    answered: !!searchParams.answered,
    ai: aiConfigured(),
    isAdmin: isAdminAccount(s.user),
  };
}
