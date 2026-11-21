import "server-only";
import { eventTitle, formatDayFull, formatSpec, nextOccurrence, type DateSpec } from "@readme/core";
import { notFound } from "next/navigation";
import { parseSkip } from "@/components/GiftPicksView";
import { displayName, listNotes, listPeople, requireSession, todayFor, unreadAnswers } from "@/lib/data";
import { giftPicksOn } from "@/lib/gifts";
import { makeT } from "@/lib/t";
import type { GiftPicksData } from "./gift-picks.data";
import { loadGiftPicks } from "./gift-picks";
import type { PersonReminderData } from "./person-reminder.data";
import type { PageInput } from "./routes";

/**
 * 선물 힌트(웹 페이지): 선물 고르기(picks)는 기다리지 않고 Promise로 둔다. 화면을 먼저 그리고 고르는 동안 빈 자리를 보이다가 채운다
 * (처음엔 AI·쿠팡을 부르느라 몇 초 걸린다)
 */
export async function startPersonReminder({ params, searchParams: sp }: PageInput): Promise<Omit<PersonReminderData, "picks"> & { picks: Promise<GiftPicksData | null> | null }> {
  const { id } = params;
  const s = await requireSession();
  const { locale } = s.profile;
  const t = makeT(locale);
  const people = await listPeople(s);
  const p = people.find((x) => x.contactId === id);
  if (!p) notFound();
  const name = displayName(p);
  const today = todayFor(s.profile);
  const dates = p.card.dates;
  // 홈 연말 카드에서 왔다(?xmas=1): 그 사람의 생일이 아니라 크리스마스를 위한 선물 고르기(제목·고르는 맥락·선물 완료 메모가 크리스마스)
  const xmas = !!sp.xmas;
  const anniversary = !xmas && sp.kind === "anniversary" ? dates?.anniversaries.find((a) => a.label === sp.label) : undefined;
  const spec: DateSpec | null = xmas ? { calendar: "solar", month: 12, day: 25 } : (anniversary?.spec ?? dates?.birthday ?? null);
  const next = spec ? nextOccurrence(spec, today) : null;
  const event = xmas
    ? t("reminder.xmasEvent")
    : spec && next
      ? eventTitle(locale, { kind: anniversary ? "anniversary" : "birthday", name, label: anniversary?.label, spec, date: next.date })
      : anniversary
        ? t("home.event.anniversary", { name, label: anniversary.label })
        : t("home.event.birthday", { name });
  const notes = await s.tx((q) => listNotes(q, s.user.id, p.contactId));
  // 이런 선물은 어때요(쿠팡 API 키가 있으면 상품, 없으면 파트너스 링크 목록에서 가격대별로)
  const picksOn = giftPicksOn();
  // 다시 고르기: 지금 주소(날 종류·이름은 그대로)에 지난번에 보인 것(skip)을 실어 보낸다
  const skip = parseSkip(sp.skip);
  const here = new URLSearchParams();
  if (sp.kind) here.set("kind", sp.kind);
  if (sp.label) here.set("label", sp.label);
  if (xmas) here.set("xmas", "1");
  const again = `/people/${p.contactId}/reminder${here.size ? `?${here.toString()}` : ""}`;
  // 크리스마스면 챙길 날 없이(생일이 가까워도 그 날이 아니라) 크리스마스·연말 선물로 고른다
  const occasion = xmas ? null : anniversary ? { kind: "anniversary" as const, label: anniversary.label } : dates?.birthday ? { kind: "birthday" as const, label: "" } : null;
  const shareText = next ? `${event} ${formatDayFull(next.date, locale)}${spec?.calendar === "lunar" ? ` (${formatSpec(spec, locale)})` : ""}` : event;
  // 선물 완료: 이번 챙길 날 메모 이름(지난 지 얼마 안 된 날이면 그해). 남겼으면 무엇을 했는지
  const doneYear = next ? (next.daysUntil > 180 ? next.date.y - 1 : next.date.y) : today.y;
  const doneLabel = `${doneYear} ${event}`.slice(0, 40);
  const done = notes.find((n) => n.label === doneLabel)?.body ?? null;
  const picks = picksOn ? loadGiftPicks(s, p, { occasion, today, skip, card: { name, event: shareText } }) : null;
  // 화면이 받기 전에 실패해도 처리 안 된 거절로 남지 않게(화면은 같은 실패를 그대로 받는다)
  picks?.catch(() => {});
  return {
    locale,
    contactId: p.contactId,
    avatar: p.avatar,
    card: p.card,
    name,
    spec,
    next,
    event,
    notes: notes.map((n) => ({ label: n.label, body: n.body })),
    picksOn,
    skip,
    again,
    shareText,
    doneLabel,
    done,
    // 크리스마스는 명절·챙기는 날 알림을 켜 둔 때만 당일 아침에 알려 준다
    remindOnDay: s.profile.reminderOffsets.includes(0) && (!xmas || s.profile.holidayReminders),
    answered: (await s.tx((q) => unreadAnswers(q, s.user.id, p.contactId))).length > 0,
    picks,
  };
}
