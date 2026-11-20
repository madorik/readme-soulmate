import { addDays, diffDays, nextOccurrence, type DateSpec, type YMD } from "./calendar";

// 다가오는 생일·기념일과, 오늘 알려야 할 것. 홈 화면과 알림 크론이 같이 쓴다.

export const REMINDER_OFFSETS = [14, 7, 3, 0] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];
export const DEFAULT_OFFSETS: ReminderOffset[] = [7, 0];

export function sanitizeOffsets(v: unknown): ReminderOffset[] {
  const list = Array.isArray(v) ? v : [];
  return REMINDER_OFFSETS.filter((o) => list.includes(o));
}

export interface PersonDates {
  contactId: string;
  name: string;
  birthday?: DateSpec | null;
  anniversaries?: { label: string; spec: DateSpec }[];
}

export interface UpcomingEvent {
  contactId: string;
  name: string;
  kind: "birthday" | "anniversary";
  label: string | null;
  spec: DateSpec;
  date: YMD;
  daysUntil: number;
}

export function upcomingEvents(people: PersonDates[], today: YMD, horizonDays = 400): UpcomingEvent[] {
  const out: UpcomingEvent[] = [];
  for (const p of people) {
    if (p.birthday) {
      const n = nextOccurrence(p.birthday, today);
      if (n && n.daysUntil <= horizonDays) {
        out.push({ contactId: p.contactId, name: p.name, kind: "birthday", label: null, spec: p.birthday, date: n.date, daysUntil: n.daysUntil });
      }
    }
    for (const a of p.anniversaries ?? []) {
      const n = nextOccurrence(a.spec, today);
      if (n && n.daysUntil <= horizonDays) {
        out.push({ contactId: p.contactId, name: p.name, kind: "anniversary", label: a.label, spec: a.spec, date: n.date, daysUntil: n.daysUntil });
      }
    }
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
}

export interface DueReminder {
  event: UpcomingEvent;
  offset: ReminderOffset;
}

/** 오늘 알림을 보낼 것: 남은 날이 알림 시점과 같은 일정 */
export function dueReminders(events: UpcomingEvent[], offsets: readonly ReminderOffset[]): DueReminder[] {
  const out: DueReminder[] = [];
  for (const event of events) {
    const offset = offsets.find((o) => o === event.daysUntil);
    if (offset !== undefined) out.push({ event, offset });
  }
  return out;
}

/**
 * 오늘 알림을 보낼 것 + 어제 알렸어야 하는데 못 알린 것(크론이 어제 못 돌았을 때). 어제 것은 아직 안 지난 일정만이다.
 * 같은 알림이 두 번 가지 않게 호출하는 쪽은 저장할 때 (사람·종류·이름·알림 시점·날짜)로 겹침을 막는다(notifications_once).
 * 남은 날은 offset이 아니라 오늘 기준으로(diffDays(today, event.date)) 말해야 어제 것이 "7일 남았어요"로 잘못 나가지 않는다
 */
export function dueWithCatchUp(people: PersonDates[], today: YMD, offsets: readonly ReminderOffset[], horizonDays = 15): DueReminder[] {
  const out = dueReminders(upcomingEvents(people, today, horizonDays), offsets);
  const seen = new Set(out.map((d) => dueKey(d)));
  const yesterday = addDays(today, -1);
  for (const d of dueReminders(upcomingEvents(people, yesterday, horizonDays + 1), offsets)) {
    if (diffDays(today, d.event.date) < 0 || seen.has(dueKey(d))) continue;
    seen.add(dueKey(d));
    out.push(d);
  }
  return out;
}

function dueKey(d: DueReminder): string {
  const { event: e } = d;
  return [e.contactId, e.kind, e.label ?? "", d.offset, e.date.y, e.date.m, e.date.d].join("|");
}
