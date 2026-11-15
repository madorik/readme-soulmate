"use server";

import { isSection, sanitizeAvatar, type AvatarConfig, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession, sealNote, writeContactSection } from "@/lib/data";
import { isFolderColor, isFolderIcon } from "@/lib/folders";
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
    q.one<{ id: string; person_id: string | null }>("select id, person_id from contacts where id::text = $1", [contactId]),
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
}

export async function deleteNote(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId"));
  const { s } = await ownContact(contactId);
  await s.tx((q) => q("delete from notes where id::text = $1 and contact_id = $2", [String(form.get("noteId")), contactId]));
  revalidatePath(`/people/${contactId}`);
}

/** 태그(내가 부르는 이름) 달기·고치기. 사람 화면 이름 밑에서 바로 저장한다(앱 사용자와 이어지지 않은 사람은 이게 이름) */
export async function setNickname(contactId: string, raw: string): Promise<{ ok: boolean; nickname: string }> {
  const s = await requireSession();
  const nickname = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (typeof contactId !== "string") return { ok: false, nickname };
  const row = await s.tx((q) => q.one<{ id: string }>(
      // 이어지지 않은 사람은 태그가 곧 이름이라 비울 수 없다
      "update contacts set nickname = $2 where id::text = $1 and ($2 <> '' or person_id is not null) returning id",
      [contactId, nickname],
    ));
  revalidatePeople(contactId);
  return { ok: !!row, nickname };
}

/** 사람 프로필(내가 꾸미는 얼굴과 부르는 말) 저장 → 사람 화면으로 */
export async function savePersonProfile(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId") ?? "");
  const { s } = await ownContact(contactId);
  const nickname = String(form.get("name") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  let avatar: AvatarConfig;
  try {
    avatar = sanitizeAvatar(JSON.parse(String(form.get("avatar") ?? "{}")));
  } catch {
    avatar = sanitizeAvatar({});
  }
  await s.tx((q) =>
    // 이어지지 않은 사람은 부르는 말이 곧 이름이라 비우면 예전 이름 그대로
    q("update contacts set avatar = $2, nickname = case when $3 = '' and person_id is null then nickname else $3 end where id::text = $1", [contactId, JSON.stringify(avatar), nickname]),
  );
  revalidatePeople(contactId);
  redirect(`/people/${contactId}`);
}

/** 주소록에서 빼기. 기록·메모·보낸 물어보기 링크도 같이 지워진다 */
export async function removeContact(form: FormData): Promise<void> {
  const contactId = String(form.get("contactId"));
  const { s } = await ownContact(contactId);
  await s.tx((q) => q("delete from contacts where id = $1", [contactId]));
  revalidatePath("/home");
  redirect("/people");
}

/** 사람 더하기: 주소록에 넣고 빈 기록을 만든 뒤 그 사람 화면으로 */
export async function createPerson(form: FormData): Promise<void> {
  const s = await requireSession();
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) redirect("/people/new?error=name");
  const contactId = await s.tx(async (q) => {
    const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname) values ($1, $2) returning id", [s.user.id, name]);
    await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [c!.id, s.user.id]);
    // 고른 폴더에 바로 넣는다(내 폴더만, DB가 확인). uuid 모양이 아니면 넣지 않는다
    const folder = String(form.get("folderId") ?? "");
    if (UUID.test(folder)) await q("insert into contact_group_members (group_id, contact_id, user_id) values ($1, $2, $3)", [folder, c!.id, s.user.id]);
    return c!.id;
  });
  revalidatePath("/people");
  revalidatePath("/home");
  redirect(`/people/${contactId}`);
}

/** 사람 기록의 항목 하나 저장(답받은 항목도 내가 고친다) */
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
  revalidatePath(`/people/${contactId}`, "layout");
  revalidatePath("/people");
  revalidatePath("/home");
  return { saved: true, error: false };
}

// ── 폴더·즐겨찾기 ─────────────────────────────────

const UUID = /^[0-9a-f-]{36}$/i;

function cleanIds(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && UUID.test(x)))].slice(0, 500) : [];
}

function cleanName(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
}

function revalidatePeople(contactId?: string) {
  revalidatePath("/people", "layout");
  revalidatePath("/home");
  if (contactId) revalidatePath(`/people/${contactId}`);
}

/** 즐겨찾기 켜고 끄기(사람들 맨 위에 고정) */
export async function setFavorite(contactId: string, on: boolean): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof contactId !== "string") return { ok: false };
  const row = await s.tx((q) => q.one<{ id: string }>("update contacts set favorite = $2 where id::text = $1 returning id", [contactId, on === true]));
  revalidatePeople(contactId);
  return { ok: !!row };
}

/** 폴더 만들기(이름·모양·색). 같은 이름의 폴더가 있으면 그 폴더를 돌려준다 */
export async function createFolder(input: { name: string; icon: string; color: string }): Promise<{ id: string } | null> {
  const s = await requireSession();
  const name = cleanName(input?.name);
  if (!name) return null;
  const icon = isFolderIcon(input?.icon) ? input.icon : "star";
  const color = isFolderColor(input?.color) ? input.color : "lavender";
  const row = await s.tx(async (q) => {
    const same = await q.one<{ id: string }>("select id from contact_groups where user_id = $1 and builtin is null and name = $2", [s.user.id, name]);
    return same ?? (await q.one<{ id: string }>("insert into contact_groups (user_id, name, icon, color) values ($1, $2, $3, $4) returning id", [s.user.id, name, icon, color]));
  });
  revalidatePeople();
  return row ? { id: String(row.id) } : null;
}

/** 폴더 고치기: 모양·색, 직접 만든 폴더는 이름도(기본 폴더 이름은 화면 언어로 붙으니 그대로) */
export async function updateFolder(id: string, input: { name?: string; icon: string; color: string }): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof id !== "string" || !UUID.test(id) || !isFolderIcon(input?.icon) || !isFolderColor(input?.color)) return { ok: false };
  const name = cleanName(input?.name);
  try {
    const row = await s.tx((q) =>
      q.one<{ id: string }>(
        "update contact_groups set icon = $2, color = $3, name = case when builtin is null and $4 <> '' then $4 else name end where id::text = $1 returning id",
        [id, input.icon, input.color, name],
      ),
    );
    revalidatePeople();
    return { ok: !!row };
  } catch {
    return { ok: false };
  }
}

/** 직접 만든 폴더 지우기. 사람들은 그대로 남는다(기본 폴더는 DB가 막는다) */
export async function deleteFolder(id: string): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false };
  try {
    const row = await s.tx((q) => q.one<{ id: string }>("delete from contact_groups where id::text = $1 and builtin is null returning id", [id]));
    revalidatePeople();
    return { ok: !!row };
  } catch {
    return { ok: false };
  }
}

/** 폴더에 든 사람을 이 목록으로 맞춘다(체크한 사람은 넣고, 뺀 사람은 뺀다). 내 사람만 들어간다(RLS) */
export async function setFolderMembers(folderId: string, contactIds: string[]): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof folderId !== "string" || !UUID.test(folderId)) return { ok: false };
  const ids = cleanIds(contactIds);
  try {
    const ok = await s.tx(async (q) => {
      const f = await q.one<{ id: string }>("select id from contact_groups where id::text = $1", [folderId]);
      if (!f) return false;
      await q("delete from contact_group_members where group_id = $1 and not (contact_id::text = any($2::text[]))", [f.id, ids]);
      await q(
        "insert into contact_group_members (group_id, contact_id, user_id) select $1, c.id, $3 from contacts c where c.id::text = any($2::text[]) on conflict do nothing",
        [f.id, ids, s.user.id],
      );
      return true;
    });
    revalidatePeople();
    return { ok };
  } catch {
    return { ok: false };
  }
}

/** 한 사람이 든 폴더를 이 목록으로 맞춘다(사람 화면의 폴더 고르기). 내 폴더만 들어간다(RLS) */
export async function setPersonFolders(contactId: string, folderIds: string[]): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (typeof contactId !== "string" || !UUID.test(contactId)) return { ok: false };
  const ids = cleanIds(folderIds);
  try {
    const ok = await s.tx(async (q) => {
      const c = await q.one<{ id: string }>("select id from contacts where id::text = $1", [contactId]);
      if (!c) return false;
      await q("delete from contact_group_members where contact_id = $1 and not (group_id::text = any($2::text[]))", [c.id, ids]);
      await q(
        "insert into contact_group_members (group_id, contact_id, user_id) select g.id, $1, $3 from contact_groups g where g.id::text = any($2::text[]) on conflict do nothing",
        [c.id, ids, s.user.id],
      );
      return true;
    });
    revalidatePeople(contactId);
    return { ok };
  } catch {
    return { ok: false };
  }
}
