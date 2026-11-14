"use server";

import { defaultShareSections, hashToken, isRelation, normalizeCode, sanitizeSections, translate, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requireSession } from "@/lib/data";
import { asSystem, dbReason } from "@/lib/db";
import { insertInvite } from "@/lib/invites";
import { absoluteUrl } from "@/lib/site";

export interface InviteState {
  url: string | null;
  code: string | null;
  text: string;
  error: "pickOne" | "common" | null;
}

export async function createShareInvite(_: InviteState, form: FormData): Promise<InviteState> {
  const s = await requireSession();
  const relation = form.get("relation");
  const sections = sanitizeSections(JSON.parse(String(form.get("sections") ?? "[]")));
  if (!sections.length) return { url: null, code: null, text: "", error: "pickOne" };
  try {
    const { token, code } = await s.tx((q) => insertInvite(q, { kind: "share", inviter_id: s.user.id, relation: isRelation(relation) ? relation : null, sections }));
    revalidatePath("/privacy");
    return {
      url: absoluteUrl(`/i/${token}`),
      code,
      text: translate(s.profile.locale, "share.text", { name: s.profile.displayName || translate(s.profile.locale, "app.name") }),
      error: null,
    };
  } catch {
    return { url: null, code: null, text: "", error: "common" };
  }
}

export async function cancelInvite(form: FormData): Promise<void> {
  const s = await requireSession();
  const id = String(form.get("id"));
  await s.tx(async (q) => {
    await q("select cancel_invite($1::uuid)", [id]);
    // 부탁해 놓고 답을 못 받은 칸은 주소록에서도 뺀다
    await q("delete from contacts where request_invite_id::text = $1 and guest_card_id is null and person_id is null", [id]);
  });
  revalidatePath("/privacy");
  revalidatePath("/home");
  redirect("/privacy");
}

export async function setGrant(form: FormData): Promise<void> {
  const s = await requireSession();
  const viewer = String(form.get("viewerId"));
  const cut = form.get("cut") === "1";
  await s.tx((q) => q(`update grants set revoked_at = ${cut ? "now()" : "null"} where owner_id = $1 and viewer_id = $2`, [s.user.id, viewer]));
  revalidatePath("/privacy");
  redirect("/privacy");
}

export async function setGrantSections(form: FormData): Promise<void> {
  const s = await requireSession();
  const viewer = String(form.get("viewerId"));
  const sections = sanitizeSections(form.getAll("sections"));
  await s.tx((q) => q("update grants set sections = $3 where owner_id = $1 and viewer_id = $2", [s.user.id, viewer, sections]));
  revalidatePath("/privacy");
  redirect("/privacy");
}

export interface ShareState {
  ok: boolean;
  on: boolean;
  sections: Section[];
}

function revalidateShares() {
  revalidatePath("/people", "layout");
  revalidatePath("/privacy");
  revalidatePath("/home");
}

/**
 * 사람 화면의 '내 리드미 공유' 스위치. 내 주소록에 이어진 사람(앱을 쓰는 사람)에게만 된다.
 * 이미 보낸 적 있으면 켜고 끄기만, 처음 켜면 초대를 받은 것처럼 상대 사람들에 나를 넣고 관계별 기본 항목을 보여 준다.
 */
export async function setShareWith(personId: string, on: boolean): Promise<ShareState> {
  const s = await requireSession();
  const me = s.user.id;
  const fail: ShareState = { ok: false, on: !on, sections: [] };
  if (typeof personId !== "string" || !personId || personId === me) return fail;
  const found = await s.tx(async (q) => {
    // RLS: 내 주소록·내가 주거나 받은 허락만 보인다
    const contact = await q.one<{ id: string }>("select id from contacts where user_id = $1 and person_id = $2", [me, personId]);
    if (!contact) return null;
    const mine = await q.one<{ sections: string[] }>("select sections from grants where owner_id = $1 and viewer_id = $2", [me, personId]);
    if (mine) {
      await q(`update grants set revoked_at = ${on ? "null" : "coalesce(revoked_at, now())"} where owner_id = $1 and viewer_id = $2`, [me, personId]);
      return { sections: sanitizeSections(mine.sections) };
    }
    const theirs = await q.one<{ relation: string | null }>("select relation from grants where owner_id = $1 and viewer_id = $2", [personId, me]);
    return { sections: null, relation: isRelation(theirs?.relation) ? theirs.relation : null };
  });
  if (!found) return fail;
  let sections = found.sections;
  if (!sections) {
    if (!on) return { ok: true, on: false, sections: [] };
    // 처음 보내기: 상대 주소록에 쓰는 일이라 앱 권한(RLS) 밖에서 한다. 위에서 이어진 사람인지 확인했다
    const relation = "relation" in found ? (found.relation ?? null) : null;
    sections = defaultShareSections(relation);
    await asSystem(async (q) => {
      await q(
        `insert into grants (owner_id, viewer_id, relation, sections) values ($1, $2, $3, $4)
         on conflict (owner_id, viewer_id) do update set revoked_at = null`,
        [me, personId, relation, sections],
      );
      await q("insert into contacts (user_id, person_id) values ($1, $2) on conflict (user_id, person_id) do nothing", [personId, me]);
    });
  }
  revalidateShares();
  return { ok: true, on, sections };
}

/** 사람 화면에서 보여 줄 항목 고르기. 누를 때마다 바로 저장하고, 상대는 다음에 열 때부터 그대로 본다 */
export async function setShareSectionsWith(personId: string, sections: Section[]): Promise<ShareState> {
  const s = await requireSession();
  const clean = sanitizeSections(sections);
  if (typeof personId !== "string" || !personId || !clean.length) return { ok: false, on: true, sections: clean };
  const updated = await s.tx((q) =>
    q.one<{ sections: string[] }>("update grants set sections = $3 where owner_id = $1 and viewer_id = $2 and revoked_at is null returning sections", [s.user.id, personId, clean]),
  );
  revalidateShares();
  return { ok: !!updated, on: true, sections: updated ? sanitizeSections(updated.sections) : clean };
}

const ACCEPT_ERRORS = ["expired", "used", "canceled", "self", "not_found"] as const;

/** 초대 받기. 끝나면 받은 리드미로(온보딩 전이면 온보딩부터) */
export async function acceptInvite(form: FormData): Promise<void> {
  const raw = String(form.get("token") ?? "");
  const session = await getSession();
  if (!session) redirect(`/?next=${encodeURIComponent(`/i/${raw}`)}`);
  const code = raw.length <= 8 ? normalizeCode(raw) : null;
  const tokenHash = code ? null : await hashToken(raw);
  // 내 사람들에 붙일 태그(부르는 말). 비우면 원래 붙어 있던 태그를 그대로 둔다
  const tag = String(form.get("tag") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  let contactId: string;
  try {
    const row = await session.tx(async (q) => {
      const r = await q.one<{ id: string }>("select accept_share($1, $2, $3) as id", [tokenHash, code, form.get("sendBack") === "1"]);
      if (r && tag) await q("update contacts set nickname = $2 where id = $1", [r.id, tag]);
      return r;
    });
    contactId = row!.id;
  } catch (e) {
    const reason = ACCEPT_ERRORS.find((r) => dbReason(e).includes(r)) ?? "not_found";
    redirect(`/i/${encodeURIComponent(raw)}?error=${reason}`);
  }
  revalidatePath("/home");
  const target = `/people/${contactId}`;
  redirect(session.profile.onboardedAt ? target : `/onboarding/avatar?next=${encodeURIComponent(target)}`);
}

export async function goToCode(_: { error: boolean }, form: FormData): Promise<{ error: boolean }> {
  const code = normalizeCode(String(form.get("code") ?? ""));
  if (!code) return { error: true };
  redirect(`/i/${code}`);
}
