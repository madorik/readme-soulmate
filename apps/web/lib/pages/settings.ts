import "server-only";
import { SECTIONS, type Section } from "@readme/core";
import { notFound } from "next/navigation";
import { aiConfigured } from "@/lib/ai";
import { displayName, listOpenInvites, listPeople, requireSession } from "@/lib/data";
import { tossReminderTemplate } from "@/lib/toss";
import type { PageInput } from "./routes";
import type { PrivacyData, RequestData, VoiceData } from "./types";

/** 설정 */
export async function loadPrivacy(): Promise<PrivacyData> {
  const s = await requireSession();
  const invites = await s.tx((q) => listOpenInvites(q));
  const template = tossReminderTemplate();
  return {
    locale: s.profile.locale,
    isAnonymous: s.user.isAnonymous,
    invites: invites.map((i) => ({ id: i.id, recipientName: i.recipientName })),
    localeChoice: s.profile.localeChoice,
    appLock: s.profile.appLock,
    pushEnabled: s.profile.pushEnabled,
    reminderOffsets: s.profile.reminderOffsets,
    ai: aiConfigured(),
    tossReminder: template ? { template, on: s.profile.tossReminders } : null,
  };
}

/**
 * 물어보기: 주소록 사람에게(찾아서 고르거나 사람 화면에서 to로), 또는 새 사람(이름을 적어 새로)에게.
 * 아는 사람이면 아직 안 적힌 항목을 먼저 고르고, 받은 답은 그 사람 기록에 들어간다
 */
export async function loadRequest({ searchParams }: PageInput): Promise<RequestData> {
  const s = await requireSession();
  const defaults: Section[] = ["dates", "safety", "gifts"];
  // 찾기에 쓸 사람들(즐겨찾기 먼저). 사람마다 아직 안 적힌 항목
  const people = [...(await listPeople(s))]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .map((p) => ({
      id: p.contactId,
      name: p.name || displayName(p),
      tag: p.nickname && p.nickname !== (p.name || displayName(p)) ? p.nickname : "",
      label: displayName(p),
      avatar: p.avatar,
      // 반려동물은 키우는 사람만 해당돼서 처음부터 고르지 않는다(직접 고를 수 있다)
      missing: SECTIONS.filter((x) => !p.card[x] && x !== "pets"),
    }));
  const fixed = searchParams.to ? (people.find((p) => p.id === searchParams.to) ?? null) : null;
  return { locale: s.profile.locale, people, fixed, initialName: (searchParams.name ?? "").slice(0, 40), defaults };
}

/** 말로 적기: 말하면(또는 적으면) 누구의 어느 칸인지 나눠서 바로 넣는다. 없는 사람은 새로, 맞는 칸이 없으면 메모로 */
export async function loadVoice(): Promise<VoiceData> {
  if (!aiConfigured()) notFound();
  const s = await requireSession();
  // @로 부를 사람: 이름과 내가 붙인 태그(부르는 말), 즐겨찾기가 먼저
  const people = [...(await listPeople(s))]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .map((p) => ({ id: p.contactId, name: p.name, tag: p.nickname && p.nickname !== p.name ? p.nickname : "", avatar: p.avatar }));
  return { locale: s.profile.locale, people };
}
