import "server-only";
import { aiConfigured } from "@/lib/ai";
import { displayName, listPeople, requireSession, todayFor } from "@/lib/data";
import type { CalendarData, Month } from "./calendar.data";
import type { PageInput } from "./routes";

/** ?m=2026-12 → { y: 2026, m: 12 }. 이상하면 null(이번 달) */
function parseMonth(v: string | undefined): Month | null {
  const hit = /^(\d{4})-(\d{1,2})$/.exec(v ?? "");
  if (!hit) return null;
  const y = Number(hit[1]);
  const m = Number(hit[2]);
  return y >= 1901 && y <= 2099 && m >= 1 && m <= 12 ? { y, m } : null;
}

/** 월별 달력: 보이는 달과 사람들 */
export async function loadCalendar({ searchParams }: PageInput): Promise<CalendarData> {
  const s = await requireSession();
  const today = todayFor(s.profile);
  const cur = parseMonth(searchParams.m) ?? { y: today.y, m: today.m };
  // 화면에는 생일·기념일 날짜와 얼굴·이름만 보낸다(달을 옮길 때 화면에서 계산한다)
  const people = (await listPeople(s)).map((p) => ({
    contactId: p.contactId,
    name: displayName(p),
    avatar: p.avatar,
    birthday: p.card.dates?.birthday ?? null,
    anniversaries: p.card.dates?.anniversaries ?? [],
  }));
  return { locale: s.profile.locale, today, cur, people, ai: aiConfigured() };
}
