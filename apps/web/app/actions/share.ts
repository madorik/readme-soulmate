"use server";

import { hashToken, isRelation, normalizeCode, sanitizeSections, translate } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requireSession } from "@/lib/data";
import { dbReason } from "@/lib/db";
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

const ACCEPT_ERRORS = ["expired", "used", "canceled", "self", "not_found"] as const;

/** 초대 받기. 끝나면 받은 리드미로(온보딩 전이면 온보딩부터) */
export async function acceptInvite(form: FormData): Promise<void> {
  const raw = String(form.get("token") ?? "");
  const session = await getSession();
  if (!session) redirect(`/?next=${encodeURIComponent(`/i/${raw}`)}`);
  const code = raw.length <= 8 ? normalizeCode(raw) : null;
  const tokenHash = code ? null : await hashToken(raw);
  let contactId: string;
  try {
    const row = await session.tx((q) => q.one<{ id: string }>("select accept_share($1, $2, $3) as id", [tokenHash, code, form.get("sendBack") === "1"]));
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
