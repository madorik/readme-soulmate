"use server";

import { hashToken, isSection, sanitizeSection, sanitizeSections, translate, type PartialCard, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, openGuestSections, requireSession, sealGuestSections, sealPrefill, writeSection } from "@/lib/data";
import { asSystem, dbReason } from "@/lib/db";
import { insertInvite } from "@/lib/invites";
import { absoluteUrl } from "@/lib/site";
import type { InviteState } from "./share";

function json(v: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(v ?? "null"));
  } catch {
    return null;
  }
}

function cleanCard(input: unknown, allowed: Section[]): PartialCard {
  const card: PartialCard = {};
  if (!input || typeof input !== "object") return card;
  for (const [section, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSection(section) && allowed.includes(section) && value != null) (card as Record<string, unknown>)[section] = sanitizeSection(section, value);
  }
  return card;
}

/** 리드미 부탁하기: 링크를 만들고, 답을 기다리는 칸을 주소록에 넣는다 */
export async function createRequest(_: InviteState, form: FormData): Promise<InviteState> {
  const s = await requireSession();
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const sections = sanitizeSections(json(form.get("sections")));
  if (!name) return { url: null, code: null, text: "", error: "common" };
  if (!sections.length) return { url: null, code: null, text: "", error: "pickOne" };
  const prefill = cleanCard(json(form.get("prefill")), sections);
  const unsure = sanitizeSections(json(form.get("unsure")));
  const message = String(form.get("message") ?? "").trim().slice(0, 300);
  try {
    const invite = await s.tx(async (q) => {
      const inv = await insertInvite(q, { kind: "request", inviter_id: s.user.id, sections, recipient_name: name, message }, (hash) =>
        Object.keys(prefill).length ? sealPrefill(hash, prefill, unsure) : {},
      );
      await q("insert into contacts (user_id, request_invite_id, nickname) values ($1, $2, $3)", [s.user.id, inv.id, name]);
      return inv;
    });
    revalidatePath("/home");
    revalidatePath("/privacy");
    const from = s.profile.displayName || translate(s.profile.locale, "app.name");
    return { url: absoluteUrl(`/r/${invite.token}`), code: null, text: translate(s.profile.locale, "request.text", { from }), error: null };
  } catch {
    return { url: null, code: null, text: "", error: "common" };
  }
}

export interface AnswerState {
  sent: boolean;
  claimed: boolean;
  error: "consent" | "closed" | "common" | null;
}

/** 가입한 사람이 답했거나 나중에 가입해서 가져오기: 손님 카드를 내 리드미로 옮기고, 요청한 사람에게 보여 준다 */
async function claimInto(token: string): Promise<boolean> {
  const s = await getSession();
  if (!s) return false;
  const hash = await hashToken(token);
  try {
    await s.tx(async (q) => {
      const row = await q.one<{ claimed_card_id: string }>("select * from claim_guest_card($1)", [hash]);
      if (!row) throw new Error("not_found");
      const guest = await q.one<{ invite_id: string; display_name: string; sections: unknown }>("select invite_id, display_name, sections from guest_cards where id = $1", [row.claimed_card_id]);
      const card = openGuestSections(guest?.invite_id ?? null, guest?.sections);
      for (const [section, value] of Object.entries(card)) {
        if (isSection(section)) await writeSection(q, s.user.id, section, value);
      }
      if (!s.profile.displayName && guest?.display_name) await q("update profiles set display_name = $2 where id = $1", [s.user.id, guest.display_name]);
    });
    return true;
  } catch {
    return false;
  }
}

/** 앱 없이 답하기(로그인 없이도 된다). 시스템 권한 함수에 넘긴다 */
export async function submitAnswer(_: AnswerState, form: FormData): Promise<AnswerState> {
  const token = String(form.get("token") ?? "");
  const consent = form.get("consent") === "1";
  const displayName = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const hash = await hashToken(token);
  try {
    await asSystem(async (q) => {
      const row = await q.one<{ invite_id: string; state: string; sections: string[] }>("select * from request_for_answer($1)", [hash]);
      if (!row || row.state !== "active") throw new Error("closed");
      const card = cleanCard(json(form.get("data")), sanitizeSections(row.sections));
      if (card.safety && !consent) throw new Error("consent_required");
      await q("select submit_request_answer($1, $2, $3, $4)", [hash, displayName, JSON.stringify(sealGuestSections(row.invite_id, card)), consent]);
    });
  } catch (e) {
    const reason = dbReason(e);
    return { sent: false, claimed: false, error: reason.includes("consent") ? "consent" : /closed|used|expired|canceled|not_found/.test(reason) ? "closed" : "common" };
  }
  const claimed = await claimInto(token);
  return { sent: true, claimed, error: null };
}

/** 답한 뒤 가입한 사람이 링크로 돌아와 가져가기 */
export async function claimAnswer(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  const s = await getSession();
  if (!s) redirect(`/?next=${encodeURIComponent(`/r/${token}/claim`)}`);
  const ok = await claimInto(token);
  revalidatePath("/me");
  if (!ok) redirect(`/r/${encodeURIComponent(token)}?claim=failed`);
  redirect(s.profile.onboardedAt ? "/me" : "/onboarding/avatar?next=%2Fme");
}
