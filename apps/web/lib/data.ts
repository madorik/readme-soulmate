import "server-only";
import {
  DEFAULT_OFFSETS,
  inviteStatus,
  isLocale,
  isSection,
  sanitizeAvatar,
  sanitizeOffsets,
  sanitizeSection,
  sanitizeSections,
  SECTIONS,
  todayIn,
  type AvatarConfig,
  type CardData,
  type InviteStatus,
  type Locale,
  type PartialCard,
  type ReminderOffset,
  type Relation,
  type Section,
  type YMD,
} from "@readme/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth";
import { aad, open, seal, sealSection } from "./crypto";
import { asUser, type Q, type Row } from "./db";
import { detectLocale } from "./i18n";

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
  notifyViews: boolean;
  appLock: boolean;
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
    notifyViews: row.notify_views === true,
    appLock: row.app_lock === true,
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

export function sealGuestSections(inviteId: string, card: PartialCard): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [section, value] of Object.entries(card)) {
    if (!isSection(section) || value == null) continue;
    out[section] = sealSection(section, sanitizeSection(section, value), aad.guest(inviteId, section));
  }
  return out;
}

export function openGuestSections(inviteId: string | null, sections: unknown): PartialCard {
  const card: PartialCard = {};
  if (!inviteId || !sections || typeof sections !== "object") return card;
  for (const [section, payload] of Object.entries(sections as Record<string, unknown>)) {
    if (!isSection(section)) continue;
    const value = openSection(section, payload, aad.guest(inviteId, section));
    if (value) (card as Record<string, unknown>)[section] = value;
  }
  return card;
}

/** 내가 직접 적어 둔 사람의 카드(contact_cards.sections) 풀기 */
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

/** 내가 적어 둔 사람의 항목 하나 저장(다른 항목은 그대로 둔다). RLS가 내 주소록 칸인지 확인한다 */
export async function writeContactSection<S extends Section>(q: Q, authorId: string, contactId: string, section: S, input: unknown): Promise<CardData[S]> {
  const clean = sanitizeSection(section, input);
  const payload = sealSection(section, clean, aad.contact(authorId, contactId, section));
  const row = await q.one(
    `update contact_cards set sections = sections || jsonb_build_object($3::text, $4::jsonb)
      where contact_id = $1 and author_id = $2 returning contact_id`,
    [contactId, authorId, section, JSON.stringify(payload)],
  );
  if (!row) throw new Error("not_your_contact");
  return clean;
}

export function sealPrefill(tokenHash: string, card: PartialCard, unsure: Section[]): unknown {
  return seal({ card, unsure }, aad.prefill(tokenHash));
}

export function openPrefill(tokenHash: string, payload: unknown): { card: PartialCard; unsure: Section[] } {
  const raw = open(payload, aad.prefill(tokenHash)) as { card?: unknown; unsure?: unknown } | null;
  const card: PartialCard = {};
  if (raw?.card && typeof raw.card === "object") {
    for (const [section, value] of Object.entries(raw.card as Record<string, unknown>)) {
      if (isSection(section)) (card as Record<string, unknown>)[section] = sanitizeSection(section, value);
    }
  }
  return { card, unsure: sanitizeSections(raw?.unsure) };
}

// ── 내 사람들 ─────────────────────────────────────

export interface Person {
  contactId: string;
  /** member: 앱에서 주고받은 사람, guest: 앱 없이 부탁에 답한 사람, mine: 내가 직접 적어 둔 사람(나만 봄), pending: 답 기다리는 중 */
  kind: "member" | "guest" | "mine" | "pending";
  personId: string | null;
  /** 그 사람이 정한 이름(없으면 내가 부르는 말) */
  name: string;
  /** 내가 부르는 말(아내, 아빠) */
  nickname: string;
  avatar: AvatarConfig | null;
  card: PartialCard;
  /** 내가 볼 수 있는 항목 */
  sections: Section[];
  relation: Relation | null;
  revoked: boolean;
  updatedAt: string | null;
  pending: { inviteId: string; state: InviteStatus; expiresAt: string } | null;
}

async function loadPeople(q: Q, me: string): Promise<Person[]> {
  const contacts = await q<{ id: string; person_id: string | null; guest_card_id: string | null; request_invite_id: string | null; nickname: string }>(
    "select id, person_id, guest_card_id, request_invite_id, nickname from contacts where user_id = $1 order by created_at",
    [me],
  );
  if (!contacts.length) return [];
  const personIds = contacts.map((c) => c.person_id).filter((v): v is string => !!v);
  const guestIds = contacts.map((c) => c.guest_card_id).filter((v): v is string => !!v);
  const inviteIds = contacts.map((c) => c.request_invite_id).filter((v): v is string => !!v);

  const profiles = personIds.length ? await q("select id, display_name, avatar from profiles where id = any($1)", [personIds]) : [];
  const grants = personIds.length ? await q("select owner_id, sections, relation, revoked_at from grants where viewer_id = $1 and owner_id = any($2)", [me, personIds]) : [];
  const sections = personIds.length ? await q("select owner_id, section, payload, updated_at from card_sections where owner_id = any($1)", [personIds]) : [];
  const guests = guestIds.length ? await q("select id, invite_id, display_name, sections, updated_at from guest_cards where id = any($1)", [guestIds]) : [];
  const invites = inviteIds.length ? await q("select id, expires_at, used_at, canceled_at from invites where id = any($1)", [inviteIds]) : [];
  const unlinked = contacts.filter((c) => !c.person_id && !c.guest_card_id).map((c) => c.id);
  const own = unlinked.length ? await q("select contact_id, sections, updated_at from contact_cards where contact_id = any($1)", [unlinked]) : [];

  const profileById = new Map(profiles.map((p) => [String(p.id), p]));
  const grantByOwner = new Map(grants.map((g) => [String(g.owner_id), g]));
  const guestById = new Map(guests.map((g) => [String(g.id), g]));
  const inviteById = new Map(invites.map((i) => [String(i.id), i]));
  const ownByContact = new Map(own.map((o) => [String(o.contact_id), o]));
  const cardByOwner = new Map<string, { card: PartialCard; updatedAt: string | null }>();
  for (const row of sections) {
    const owner = String(row.owner_id);
    const section = row.section;
    if (!isSection(section)) continue;
    const entry = cardByOwner.get(owner) ?? { card: {}, updatedAt: null };
    const value = openSection(section, row.payload, aad.card(owner, section));
    if (value) (entry.card as Record<string, unknown>)[section] = value;
    const at = iso(row.updated_at);
    if (at && (!entry.updatedAt || at > entry.updatedAt)) entry.updatedAt = at;
    cardByOwner.set(owner, entry);
  }

  const people: Person[] = [];
  for (const c of contacts) {
    const nickname = String(c.nickname ?? "");
    if (c.person_id) {
      const p = profileById.get(c.person_id);
      const g = grantByOwner.get(c.person_id);
      const revoked = !g || g.revoked_at != null;
      const entry = cardByOwner.get(c.person_id);
      people.push({
        contactId: c.id,
        kind: "member",
        personId: c.person_id,
        name: String(p?.display_name || nickname || ""),
        nickname,
        avatar: p ? sanitizeAvatar(p.avatar) : null,
        card: revoked ? {} : (entry?.card ?? {}),
        sections: revoked ? [] : sanitizeSections(g?.sections),
        relation: (g?.relation as Relation | null) ?? null,
        revoked,
        updatedAt: entry?.updatedAt ?? null,
        pending: null,
      });
    } else if (c.guest_card_id) {
      const g = guestById.get(c.guest_card_id);
      const card = openGuestSections((g?.invite_id as string | null) ?? null, g?.sections);
      people.push({
        contactId: c.id,
        kind: "guest",
        personId: null,
        name: String(g?.display_name || nickname),
        nickname,
        avatar: null,
        card,
        sections: Object.keys(card).filter(isSection),
        relation: null,
        revoked: false,
        updatedAt: iso(g?.updated_at),
        pending: null,
      });
    } else if (ownByContact.has(c.id)) {
      const o = ownByContact.get(c.id)!;
      const card = openContactSections(me, c.id, o.sections);
      people.push({
        contactId: c.id,
        kind: "mine",
        personId: null,
        name: nickname,
        nickname,
        avatar: null,
        card,
        // 내가 적는 카드라 모든 항목이 열려 있다(안 적은 항목은 "아직 안 적었어요")
        sections: [...SECTIONS],
        relation: null,
        revoked: false,
        updatedAt: iso(o.updated_at),
        pending: null,
      });
    } else if (c.request_invite_id) {
      const i = inviteById.get(c.request_invite_id);
      if (!i) continue;
      people.push({
        contactId: c.id,
        kind: "pending",
        personId: null,
        name: nickname,
        nickname,
        avatar: null,
        card: {},
        sections: [],
        relation: null,
        revoked: false,
        updatedAt: null,
        pending: {
          inviteId: c.request_invite_id,
          state: inviteStatus({ expires_at: iso(i.expires_at)!, used_at: iso(i.used_at), canceled_at: iso(i.canceled_at) }),
          expiresAt: iso(i.expires_at)!,
        },
      });
    }
  }
  return people;
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

// ── 공유 관리 ─────────────────────────────────────

export interface Share {
  viewerId: string;
  name: string;
  avatar: AvatarConfig;
  relation: Relation | null;
  sections: Section[];
  revoked: boolean;
}

/** 내가 지금 내 리드미를 보여 주는 사람 id(끈 사람은 빠진다) */
export async function activeShareIds(q: Q, me: string): Promise<Set<string>> {
  const rows = await q<{ viewer_id: string }>("select viewer_id from grants where owner_id = $1 and revoked_at is null", [me]);
  return new Set(rows.map((r) => String(r.viewer_id)));
}

export async function listShares(q: Q, me: string): Promise<Share[]> {
  const rows = await q(
    `select g.viewer_id, g.relation, g.sections, g.revoked_at, p.display_name, p.avatar
       from grants g left join profiles p on p.id = g.viewer_id
      where g.owner_id = $1 order by g.created_at`,
    [me],
  );
  return rows.map((g) => ({
    viewerId: String(g.viewer_id),
    name: String(g.display_name ?? ""),
    avatar: sanitizeAvatar(g.avatar),
    relation: (g.relation as Relation | null) ?? null,
    sections: sanitizeSections(g.sections),
    revoked: g.revoked_at != null,
  }));
}

export interface OpenInvite {
  id: string;
  kind: "share" | "request";
  relation: Relation | null;
  recipientName: string;
  expiresAt: string;
}

export async function listOpenInvites(q: Q): Promise<OpenInvite[]> {
  const rows = await q(
    `select id, kind, relation, recipient_name, expires_at from invites
      where used_at is null and canceled_at is null and expires_at > now() order by created_at desc`,
  );
  return rows.map((i) => ({
    id: String(i.id),
    kind: i.kind as "share" | "request",
    relation: (i.relation as Relation | null) ?? null,
    recipientName: String(i.recipient_name ?? ""),
    expiresAt: iso(i.expires_at)!,
  }));
}
