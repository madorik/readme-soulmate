import "server-only";
import {
  DEFAULT_OFFSETS,
  inviteStatus,
  isLocale,
  isSection,
  liftGiftTastes,
  sanitizeAvatar,
  sanitizeOffsets,
  sanitizeSection,
  sanitizeSections,
  todayIn,
  type AvatarConfig,
  type CardData,
  type InviteStatus,
  type Locale,
  type PartialCard,
  type ReminderOffset,
  type Section,
  type YMD,
} from "@readme/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth";
import { aad, open, seal, sealSection } from "./crypto";
import { asUser, type Q, type Row } from "./db";
import { detectLocale, type T } from "./i18n";
import { isFolderColor, isFolderIcon, type FolderColor, type FolderIcon, type FolderView } from "./folders";

export interface Profile {
  id: string;
  displayName: string;
  /** 화면에 쓰는 언어(직접 고른 언어, 없으면 기기 언어) */
  locale: Locale;
  /** 직접 고른 언어. null이면 시스템 언어를 따른다 */
  localeChoice: Locale | null;
  systemLocale: Locale;
  timeZone: string;
  avatar: AvatarConfig;
  reminderOffsets: ReminderOffset[];
  appLock: boolean;
  /** 설정 > 알림 받기 */
  pushEnabled: boolean;
  /** 토스 미니앱: 토스 알림에 동의해 생일·기념일 알림을 토스로 받는다 */
  tossReminders: boolean;
  isDemo: boolean;
  onboardedAt: string | null;
}

function iso(v: unknown): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function toProfile(row: Row, detected: Locale): Profile {
  const choice = isLocale(row.locale) ? row.locale : null;
  return {
    id: String(row.id),
    displayName: String(row.display_name ?? ""),
    locale: choice ?? detected,
    localeChoice: choice,
    systemLocale: isLocale(row.system_locale) ? row.system_locale : "ko",
    timeZone: String(row.time_zone ?? "Asia/Seoul"),
    avatar: sanitizeAvatar(row.avatar),
    reminderOffsets: Array.isArray(row.reminder_offsets) ? sanitizeOffsets(row.reminder_offsets) : DEFAULT_OFFSETS,
    appLock: row.app_lock === true,
    pushEnabled: row.push_enabled !== false,
    tossReminders: row.toss_reminders === true,
    isDemo: row.is_demo === true,
    onboardedAt: iso(row.onboarded_at),
  };
}

export interface Session {
  user: { id: string; email: string; isAnonymous: boolean };
  profile: Profile;
  /** 이 사람 권한(RLS)으로 트랜잭션 하나 */
  tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>;
}

/** 요청마다 한 번만 확인한다 */
export const getSession = cache(async (): Promise<Session | null> => {
  const h = await headers();
  const s = await getAuth().api.getSession({ headers: h });
  if (!s?.user) return null;
  const uid = s.user.id;
  const row = await asUser(uid, (q) => q.one("select * from profiles where id = $1", [uid]));
  if (!row) return null;
  const detected = await detectLocale();
  return {
    user: { id: uid, email: s.user.email, isAnonymous: (s.user as { isAnonymous?: boolean | null }).isAnonymous === true },
    profile: toProfile(row, detected),
    tx: (fn) => asUser(uid, fn),
  };
});

export async function requireSession(opts: { onboarding?: boolean } = {}): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/");
  if (!opts.onboarding && !s.profile.onboardedAt) redirect("/onboarding/avatar");
  return s;
}

export function todayFor(profile: Pick<Profile, "timeZone">): YMD {
  return todayIn(profile.timeZone);
}

// ── 리드미 읽기·쓰기 ─────────────────────────────

function openSection(section: Section, payload: unknown, scope: string): CardData[Section] | null {
  const data = open(payload, scope);
  return data == null ? null : sanitizeSection(section, data);
}

export async function readCard(q: Q, ownerId: string): Promise<{ card: PartialCard; updatedAt: string | null }> {
  const rows = await q<{ section: string; payload: unknown; updated_at: Date }>("select section, payload, updated_at from card_sections where owner_id = $1", [ownerId]);
  const card: PartialCard = {};
  let updatedAt: string | null = null;
  for (const row of rows) {
    if (!isSection(row.section)) continue;
    const value = openSection(row.section, row.payload, aad.card(ownerId, row.section));
    if (value) (card as Record<string, unknown>)[row.section] = value;
    const at = iso(row.updated_at);
    if (at && (!updatedAt || at > updatedAt)) updatedAt = at;
  }
  return { card, updatedAt };
}

export async function writeSection<S extends Section>(q: Q, ownerId: string, section: S, input: unknown): Promise<CardData[S]> {
  const clean = sanitizeSection(section, input);
  const payload = sealSection(section, clean, aad.card(ownerId, section));
  await q(
    `insert into card_sections (owner_id, section, payload) values ($1, $2, $3)
     on conflict (owner_id, section) do update set payload = excluded.payload`,
    [ownerId, section, JSON.stringify(payload)],
  );
  return clean;
}

/** 사람 기록(contact_cards.sections) 풀기 */
export function openContactSections(authorId: string, contactId: string, sections: unknown): PartialCard {
  const card: PartialCard = {};
  if (!sections || typeof sections !== "object") return card;
  for (const [section, payload] of Object.entries(sections as Record<string, unknown>)) {
    if (!isSection(section)) continue;
    const value = openSection(section, payload, aad.contact(authorId, contactId, section));
    if (value) (card as Record<string, unknown>)[section] = value;
  }
  return card;
}

export function sealContactSections(authorId: string, contactId: string, card: PartialCard): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [section, value] of Object.entries(card)) {
    if (!isSection(section) || value == null) continue;
    out[section] = sealSection(section, sanitizeSection(section, value), aad.contact(authorId, contactId, section));
  }
  return out;
}

/** 사람 기록의 항목 하나 저장(다른 항목은 그대로 둔다). 내가 고친 항목은 '답한 때' 표시를 지운다. RLS가 내 주소록 칸인지 확인한다 */
export async function writeContactSection<S extends Section>(q: Q, authorId: string, contactId: string, section: S, input: unknown): Promise<CardData[S]> {
  const clean = sanitizeSection(section, input);
  const payload = sealSection(section, clean, aad.contact(authorId, contactId, section));
  const row = await q.one(
    `insert into contact_cards as cc (contact_id, author_id, sections) values ($1, $2, jsonb_build_object($3::text, $4::jsonb))
     on conflict (contact_id) do update set sections = cc.sections || excluded.sections, answered = cc.answered - $3::text
     where cc.author_id = $2 returning contact_id`,
    [contactId, authorId, section, JSON.stringify(payload)],
  );
  if (!row) throw new Error("not_your_contact");
  return clean;
}

/** 물어볼 때 미리 채워 보내는 값(내 기록에서). 토큰을 아는 사람만 풀 수 있게 토큰 해시 범위로 잠근다 */
export function sealPrefill(tokenHash: string, card: PartialCard): unknown {
  return seal({ card }, aad.prefill(tokenHash));
}

export function openPrefill(tokenHash: string, payload: unknown): PartialCard {
  const raw = open(payload, aad.prefill(tokenHash)) as { card?: unknown } | null;
  const card: PartialCard = {};
  if (raw?.card && typeof raw.card === "object") {
    // 0015 전에 보낸 물어보기: 선물 칸의 향·꽃을 취향 칸으로
    for (const [section, value] of Object.entries(liftGiftTastes(raw.card as Record<string, unknown>))) {
      if (isSection(section)) (card as Record<string, unknown>)[section] = sanitizeSection(section, value);
    }
  }
  return card;
}

// ── 내 사람들 ─────────────────────────────────────

/** 물어보기 하나의 상태(가장 최근 것) */
export interface Asking {
  inviteId: string;
  state: InviteStatus;
  expiresAt: string;
  sections: Section[];
}

export interface Person {
  contactId: string;
  /** 물어보기에 로그인하고 답해서 이어진 앱 사용자(얼굴·이름만 쓴다) */
  personId: string | null;
  /** 그 사람이 정한 이름(이어진 사람만, 없으면 내가 부르는 말) */
  name: string;
  /** 내가 부르는 말(아내, 아빠). 이어지지 않은 사람은 이게 이름 */
  nickname: string;
  avatar: AvatarConfig | null;
  /** 내 기록: 내가 적은 것 + 물어봐서 받은 답. 언제든 내가 고친다 */
  card: PartialCard;
  /** 항목별로 상대가 답한 때(ISO). 내가 고치면 빠진다 */
  answered: Partial<Record<Section, string>>;
  updatedAt: string | null;
  /** 가장 최근 물어보기 */
  asking: Asking | null;
  /** 들어 있는 폴더(contact_groups.id, 여러 개) */
  folderIds: string[];
  /** 즐겨찾기(사람들 맨 위에 고정) */
  favorite: boolean;
}

async function loadPeople(q: Q, me: string): Promise<Person[]> {
  const contacts = await q<{ id: string; person_id: string | null; nickname: string; favorite: boolean; avatar: unknown }>(
    "select id, person_id, nickname, favorite, avatar from contacts where user_id = $1 order by created_at",
    [me],
  );
  if (!contacts.length) return [];
  const ids = contacts.map((c) => c.id);
  const personIds = contacts.map((c) => c.person_id).filter((v): v is string => !!v);
  const [profiles, records, asks, members] = await Promise.all([
    personIds.length ? q("select id, display_name, avatar from profiles where id = any($1)", [personIds]) : Promise.resolve([]),
    q("select contact_id, sections, answered, updated_at from contact_cards where contact_id = any($1)", [ids]),
    q(
      `select distinct on (contact_id) id, contact_id, sections, expires_at, used_at, canceled_at
         from invites where contact_id = any($1) order by contact_id, created_at desc`,
      [ids],
    ),
    q("select group_id, contact_id from contact_group_members where user_id = $1 order by created_at", [me]),
  ]);
  const foldersByContact = new Map<string, string[]>();
  for (const m of members) foldersByContact.set(String(m.contact_id), [...(foldersByContact.get(String(m.contact_id)) ?? []), String(m.group_id)]);
  const profileById = new Map(profiles.map((p) => [String(p.id), p]));
  const recordByContact = new Map(records.map((r) => [String(r.contact_id), r]));
  const askByContact = new Map(asks.map((a) => [String(a.contact_id), a]));

  return contacts.map((c) => {
    const nickname = String(c.nickname ?? "");
    const p = c.person_id ? profileById.get(c.person_id) : undefined;
    const r = recordByContact.get(c.id);
    const a = askByContact.get(c.id);
    const answered: Partial<Record<Section, string>> = {};
    if (r?.answered && typeof r.answered === "object") {
      for (const [k, v] of Object.entries(r.answered as Record<string, unknown>)) if (isSection(k) && typeof v === "string") answered[k] = v;
    }
    return {
      contactId: c.id,
      personId: c.person_id,
      name: String(p?.display_name || nickname),
      nickname,
      // 내가 꾸민 얼굴이 먼저, 없으면 이어진 사람이 정한 얼굴
      avatar: c.avatar ? sanitizeAvatar(c.avatar) : p ? sanitizeAvatar(p.avatar) : null,
      card: r ? openContactSections(me, c.id, r.sections) : {},
      answered,
      updatedAt: iso(r?.updated_at),
      asking: a
        ? {
            inviteId: String(a.id),
            state: inviteStatus({ expires_at: iso(a.expires_at)!, used_at: iso(a.used_at), canceled_at: iso(a.canceled_at) }),
            expiresAt: iso(a.expires_at)!,
            sections: sanitizeSections(a.sections),
          }
        : null,
      folderIds: foldersByContact.get(c.id) ?? [],
      favorite: c.favorite === true,
    };
  });
}

/** 요청 하나 안에서는 한 번만 읽는다(레이아웃의 알림 예약과 화면이 같이 쓴다) */
export const listPeople = cache((s: Session) => s.tx((q) => loadPeople(q, s.user.id)));

/** 부를 이름: 내가 정한 부르는 말이 있으면 그것, 없으면 그 사람 이름 */
export function displayName(p: Pick<Person, "name" | "nickname">): string {
  return p.nickname || p.name;
}

// ── 메모 ─────────────────────────────────────────

export interface Note {
  id: string;
  label: string;
  body: string;
  createdAt: string;
}

/** 아직 안 본 답장(물어보기에 답이 온 것). 사람 화면을 열면 읽은 것으로 바뀐다(seeAnswers) */
export interface UnreadAnswer {
  id: string;
  contactId: string;
  /** 물어볼 때 적은 이름 */
  label: string;
  at: string;
  /** 몇 분 전에 왔는지 */
  minutes: number;
}

export async function unreadAnswers(q: Q, me: string, contactId?: string): Promise<UnreadAnswer[]> {
  const rows = await q<{ id: string; contact_id: string; label: string; created_at: Date; minutes: number }>(
    `select id, contact_id, label, created_at, floor(extract(epoch from now() - created_at) / 60)::int as minutes from notifications
     where user_id = $1 and kind = 'answered' and read_at is null and contact_id is not null and ($2::uuid is null or contact_id = $2::uuid)
     order by created_at desc limit 5`,
    [me, contactId ?? null],
  );
  return rows.map((r) => ({ id: r.id, contactId: r.contact_id, label: r.label, at: iso(r.created_at)!, minutes: Math.max(0, Number(r.minutes) || 0) }));
}

export async function listNotes(q: Q, me: string, contactId: string): Promise<Note[]> {
  const rows = await q<{ id: string; label: string; payload: unknown; created_at: Date }>(
    "select id, label, payload, created_at from notes where contact_id = $1 order by created_at desc",
    [contactId],
  );
  return rows.map((n) => {
    const body = open(n.payload, aad.note(me, contactId)) as { body?: string } | null;
    return { id: n.id, label: n.label, body: typeof body?.body === "string" ? body.body : "", createdAt: iso(n.created_at)! };
  });
}

export function sealNote(me: string, contactId: string, body: string): unknown {
  return seal({ body }, aad.note(me, contactId));
}

// ── 폴더 ─────────────────────────────────────────

/** 기본 폴더(사람마다 처음부터 있고, 이름은 화면 언어로). 이 순서로 보인다 */
export const BUILTIN_GROUPS = ["family", "work", "partner", "friends"] as const;
export type BuiltinGroup = (typeof BUILTIN_GROUPS)[number];

export interface Folder {
  id: string;
  builtin: BuiltinGroup | null;
  /** 직접 만든 폴더의 이름(기본 폴더는 빈칸) */
  name: string;
  icon: FolderIcon;
  color: FolderColor;
}

/** 기본 폴더 네 개가 없으면 만든다(가족 집·망고, 회사 가방·하늘, 연인 하트·분홍, 친구들 별·민트) */
export async function ensureBuiltinFolders(q: Q, me: string): Promise<void> {
  await q(
    `insert into contact_groups (user_id, builtin, icon, color)
     select $1, b, case b when 'family' then 'home' when 'work' then 'work' when 'partner' then 'heart' else 'star' end,
            case b when 'family' then 'mango' when 'work' then 'sky' when 'partner' then 'pink' else 'mint' end
     from unnest($2::text[]) b on conflict (user_id, builtin) do nothing`,
    [me, [...BUILTIN_GROUPS]],
  );
}

/** 내 폴더. 기본 폴더는 처음 부를 때 만든다. 순서: 기본 폴더 → 만든 순서 */
export async function listFolders(q: Q, me: string): Promise<Folder[]> {
  const builtins = [...BUILTIN_GROUPS];
  await ensureBuiltinFolders(q, me);
  const rows = await q<{ id: string; builtin: string | null; name: string; icon: string; color: string }>(
    "select id, builtin, name, icon, color from contact_groups where user_id = $1 order by array_position($2::text[], builtin) nulls last, created_at",
    [me, builtins],
  );
  return rows.map((r) => ({
    id: String(r.id),
    builtin: (BUILTIN_GROUPS as readonly string[]).includes(r.builtin ?? "") ? (r.builtin as BuiltinGroup) : null,
    name: String(r.name ?? ""),
    icon: isFolderIcon(r.icon) ? r.icon : "star",
    color: isFolderColor(r.color) ? r.color : "lavender",
  }));
}

/** 화면에 보일 폴더 이름 */
export function folderName(g: Pick<Folder, "builtin" | "name">, t: T): string {
  return g.builtin ? t(`group.${g.builtin}` as "group.family") : g.name;
}

/** 화면에 넘길 폴더들(이름은 화면 언어로, 들어 있는 사람은 사람들 목록 순서로) */
export function folderViews(folders: Folder[], people: Person[], t: T): FolderView[] {
  return folders.map((f) => ({
    id: f.id,
    name: folderName(f, t),
    icon: f.icon,
    color: f.color,
    builtin: !!f.builtin,
    memberIds: people.filter((p) => p.folderIds.includes(f.id)).map((p) => p.contactId),
  }));
}

/** 아직 아무도 안 연 물어보기 링크(퍼지면 아무나 답할 수 있으니 취소할 곳) */
export interface OpenInvite {
  id: string;
  contactId: string;
  recipientName: string;
  expiresAt: string;
}

export async function listOpenInvites(q: Q): Promise<OpenInvite[]> {
  const rows = await q(
    `select id, contact_id, recipient_name, expires_at from invites
      where used_at is null and canceled_at is null and expires_at > now() order by created_at desc`,
  );
  return rows.map((i) => ({
    id: String(i.id),
    contactId: String(i.contact_id),
    recipientName: String(i.recipient_name ?? ""),
    expiresAt: iso(i.expires_at)!,
  }));
}
