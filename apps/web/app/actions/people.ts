"use server";

import { isSection, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession, sealNote, writeContactSection } from "@/lib/data";
import type { SaveState } from "./card";

function json(v: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(v ?? "null"));
  } catch {
    return null;
  }
}

/** 내 주소록 칸인지 확인(RLS가 내 것만 돌려준다) */
async function ownContact(contactId: string) {
  const s = await requireSession();
  const contact = await s.tx((q) =>
    q.one<{ id: string; person_id: string | null; request_invite_id: string | null; guest_card_id: string | null }>(
      "select id, person_id, request_invite_id, guest_card_id from contacts where id::text = $1",
      [contactId],
    ),
  );
  if (!contact) redirect("/people");
  return { s, contact };
}

export async function addNote(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId"));
  const { s } = await ownContact(contactId);
  const label = String(form.get("label") ?? "").trim().slice(0, 40);
  const body = String(form.get("body") ?? "").trim().slice(0, 1000);
  if (body) {
    await s.tx((q) =>
      q("insert into notes (author_id, contact_id, label, payload) values ($1, $2, $3, $4)", [s.user.id, contactId, label, JSON.stringify(sealNote(s.user.id, contactId, body))]),
    );
  }
  revalidatePath(`/people/${contactId}`);
  redirect(`/people/${contactId}#notes`);
}

export async function deleteNote(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId"));
  const { s } = await ownContact(contactId);
  await s.tx((q) => q("delete from notes where id::text = $1 and contact_id = $2", [String(form.get("noteId")), contactId]));
  revalidatePath(`/people/${contactId}`);
  redirect(`/people/${contactId}#notes`);
}

export async function setNickname(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId"));
  const { s } = await ownContact(contactId);
  const nickname = String(form.get("nickname") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  await s.tx((q) => q("update contacts set nickname = $2 where id = $1", [contactId, nickname]));
  revalidatePath(`/people/${contactId}`);
  revalidatePath("/home");
  redirect(`/people/${contactId}`);
}

/** 주소록에서 빼기. 상대가 내게 준 허락도 같이 내려놓는다(다시 받으려면 새 링크가 필요) */
export async function removeContact(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId"));
  const { s, contact } = await ownContact(contactId);
  await s.tx(async (q) => {
    if (contact.person_id) await q("delete from grants where owner_id = $1 and viewer_id = $2", [contact.person_id, s.user.id]);
    if (contact.request_invite_id && !contact.guest_card_id) await q("select cancel_invite($1)", [contact.request_invite_id]);
    await q("delete from contacts where id = $1", [contactId]);
  });
  revalidatePath("/home");
  redirect("/people");
}

/** 직접 적어 두기: 앱을 안 쓰는 사람도 주소록에 넣고, 빈 카드를 만든 뒤 그 사람 화면으로 */
export async function createPerson(form: FormData): Promise<void> {
  const s = await requireSession();
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) redirect("/people/new?error=name");
  const contactId = await s.tx(async (q) => {
    // 그룹은 내 것만(DB가 확인). uuid 모양이 아니면 그룹 없음
    const group = String(form.get("groupId") ?? "");
    const groupId = /^[0-9a-f-]{36}$/i.test(group) ? group : null;
    const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname, group_id) values ($1, $2, $3) returning id", [s.user.id, name, groupId]);
    await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [c!.id, s.user.id]);
    return c!.id;
  });
  revalidatePath("/people");
  revalidatePath("/home");
  redirect(`/people/${contactId}`);
}

/** 내가 적어 둔 사람의 항목 하나 저장 */
export async function savePersonSection(_: SaveState, form: FormData): Promise<SaveState> {
  const s = await requireSession();
  const section = form.get("section");
  const contactId = String(form.get("contactId") ?? "");
  if (!isSection(section) || !contactId) return { saved: false, error: true };
  try {
    await s.tx((q) => writeContactSection(q, s.user.id, contactId, section as Section, json(form.get("data"))));
  } catch {
    return { saved: false, error: true };
  }
  revalidatePath(`/people/${contactId}`);
  revalidatePath("/people");
  revalidatePath("/home");
  return { saved: true, error: false };
}

// ── 그룹·즐겨찾기 ─────────────────────────────────

function revalidatePeople(contactId?: string) {
  revalidatePath("/people", "layout");
  revalidatePath("/home");
  if (contactId) revalidatePath(`/people/${contactId}`);
}

/** 사람을 그룹에 넣기(null이면 그룹 없음). 남의 그룹은 DB가 막는다(contacts_guard) */
export async function setContactGroup(contactId: string, groupId: string | null): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof contactId !== "string" || (groupId !== null && typeof groupId !== "string")) return { ok: false };
  try {
    const row = await s.tx((q) => q.one<{ id: string }>("update contacts set group_id = $2::uuid where id::text = $1 returning id", [contactId, groupId]));
    revalidatePeople(contactId);
    return { ok: !!row };
  } catch {
    return { ok: false };
  }
}

/** 즐겨찾기 켜고 끄기(사람들 맨 위에 고정) */
export async function setFavorite(contactId: string, on: boolean): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof contactId !== "string") return { ok: false };
  const row = await s.tx((q) => q.one<{ id: string }>("update contacts set favorite = $2 where id::text = $1 returning id", [contactId, on === true]));
  revalidatePeople(contactId);
  return { ok: !!row };
}

/** 그룹 만들기. 같은 이름이 있으면 그 그룹을 돌려준다 */
export async function createGroup(rawName: string): Promise<{ id: string; name: string } | null> {
  const s = await requireSession();
  const name = String(rawName ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
  if (!name) return null;
  const row = await s.tx(async (q) => {
    const same = await q.one<{ id: string; name: string }>("select id, name from contact_groups where user_id = $1 and builtin is null and name = $2", [s.user.id, name]);
    return same ?? (await q.one<{ id: string; name: string }>("insert into contact_groups (user_id, name) values ($1, $2) returning id, name", [s.user.id, name]));
  });
  revalidatePeople();
  return row ? { id: String(row.id), name: String(row.name) } : null;
}

/** 직접 만든 그룹 지우기. 그 그룹 사람들은 그룹 없음으로(기본 그룹은 DB가 막는다) */
export async function deleteGroup(groupId: string): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof groupId !== "string") return { ok: false };
  try {
    const row = await s.tx((q) => q.one<{ id: string }>("delete from contact_groups where id::text = $1 and builtin is null returning id", [groupId]));
    revalidatePeople();
    return { ok: !!row };
  } catch {
    return { ok: false };
  }
}

/** 사람들 목록에서 끌어 놓기: 그룹과 즐겨찾기를 한 번에 바꾼다(즐겨찾기 칸에 놓으면 즐겨찾기, 그룹 칸에 놓으면 그 그룹·즐겨찾기 해제) */
export async function moveContact(contactId: string, target: { groupId: string | null; favorite: boolean }): Promise<{ ok: boolean }> {
  const s = await requireSession();
  const groupId = target?.groupId ?? null;
  if (typeof contactId !== "string" || (groupId !== null && !/^[0-9a-f-]{36}$/i.test(groupId))) return { ok: false };
  try {
    const row = await s.tx((q) =>
      q.one<{ id: string }>("update contacts set group_id = $2::uuid, favorite = $3 where id::text = $1 returning id", [contactId, groupId, target.favorite === true]),
    );
    revalidatePeople(contactId);
    return { ok: !!row };
  } catch {
    return { ok: false };
  }
}
