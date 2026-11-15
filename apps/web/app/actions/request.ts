"use server";

import { hashToken, isSection, sanitizeSection, sanitizeSections, translate, type PartialCard, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, openContactSections, requireSession, sealContactSections, sealPrefill, writeSection } from "@/lib/data";
import { asSystem, dbReason } from "@/lib/db";
import { insertInvite } from "@/lib/invites";
import { notifyUserT } from "@/lib/push";
import { absoluteUrl } from "@/lib/site";

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

export interface InviteState {
  url: string | null;
  text: string;
  error: "pickOne" | "common" | null;
}

/**
 * 물어보기: 주소록의 한 사람(to)에게, 또는 새 사람(name)을 주소록에 넣고 링크를 만든다.
 * 내 기록에 이미 적힌 값은 미리 채워 보내서, 상대는 맞아요·고치기만 누르면 된다
 */
export async function createRequest(_: InviteState, form: FormData): Promise<InviteState> {
  const s = await requireSession();
  const to = String(form.get("to") ?? "");
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const sections = sanitizeSections(json(form.get("sections")));
  const message = String(form.get("message") ?? "").trim().slice(0, 300);
  if (!to && !name) return { url: null, text: "", error: "common" };
  if (!sections.length) return { url: null, text: "", error: "pickOne" };
  try {
    const invite = await s.tx(async (q) => {
      let contactId: string;
      let prefill: PartialCard = {};
      if (to) {
        // 내 주소록 칸만(RLS). 미리 채울 값은 내 기록에서 물어보는 항목만
        const c = await q.one<{ id: string }>("select id from contacts where id::text = $1", [to]);
        if (!c) throw new Error("not_found");
        contactId = c.id;
        const r = await q.one<{ sections: unknown }>("select sections from contact_cards where contact_id = $1", [contactId]);
        const mine = openContactSections(s.user.id, contactId, r?.sections);
        prefill = Object.fromEntries(Object.entries(mine).filter(([k]) => sections.includes(k as Section))) as PartialCard;
      } else {
        const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname) values ($1, $2) returning id", [s.user.id, name]);
        contactId = c!.id;
        await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [contactId, s.user.id]);
      }
      return insertInvite(q, { inviter_id: s.user.id, contact_id: contactId, sections, recipient_name: name, message }, (hash) =>
        Object.keys(prefill).length ? sealPrefill(hash, prefill) : {},
      );
    });
    revalidatePath("/people", "layout");
    revalidatePath("/home");
    revalidatePath("/privacy");
    const from = s.profile.displayName || translate(s.profile.locale, "app.name");
    return { url: absoluteUrl(`/r/${invite.token}`), text: translate(s.profile.locale, "request.text", { from }), error: null };
  } catch {
    return { url: null, text: "", error: "common" };
  }
}

/** 아직 아무도 안 연 물어보기 링크 취소(사람 기록은 그대로) */
export async function cancelInvite(form: FormData): Promise<void> {
  const s = await requireSession();
  const id = String(form.get("id"));
  const back = String(form.get("back") ?? "");
  await s.tx((q) => q("select cancel_invite($1::uuid)", [id]));
  revalidatePath("/privacy");
  revalidatePath("/people", "layout");
  redirect(/^\/(privacy|people\/[0-9a-f-]{36})$/.test(back) ? back : "/privacy");
}

export interface AnswerState {
  sent: boolean;
  /** 로그인하고 답한 사람이 '내 리드미에도 저장'을 골랐으면 */
  savedMine: boolean;
  error: "consent" | "closed" | "self" | "common" | null;
}

/**
 * 답하기(로그인 없이도 된다). 답은 물어본 사람의 기록에 들어간다(그 뒤로는 그 사람 것이라 그 사람이 고친다).
 * 서버가 물어본 사람의 기록 범위로 암호화해서 시스템 권한 함수에 넘긴다
 */
export async function submitAnswer(_: AnswerState, form: FormData): Promise<AnswerState> {
  const token = String(form.get("token") ?? "");
  const consent = form.get("consent") === "1";
  const session = await getSession();
  const saveMine = !!session && form.get("saveMine") === "1";
  const hash = await hashToken(token);
  let answer: PartialCard = {};
  let notify: { to: string; name: string; contactId: string } | null = null;
  try {
    await asSystem(async (q) => {
      const row = await q.one<{ state: string; inviter_id: string; contact_id: string; sections: string[]; recipient_name: string | null }>("select * from request_for_answer($1)", [hash]);
      if (!row || row.state !== "active") throw new Error("closed");
      answer = cleanCard(json(form.get("data")), sanitizeSections(row.sections));
      if (!Object.keys(answer).length) throw new Error("empty");
      if (answer.safety && !consent) throw new Error("consent_required");
      await q("select submit_request_answer($1, $2, $3, $4)", [hash, JSON.stringify(sealContactSections(row.inviter_id, row.contact_id, answer)), consent, session?.user.id ?? null]);
      notify = { to: row.inviter_id, name: (row.recipient_name ?? "").trim(), contactId: row.contact_id };
    });
  } catch (e) {
    const reason = dbReason(e);
    return {
      sent: false,
      savedMine: false,
      error: reason.includes("consent") ? "consent" : reason.includes("self") ? "self" : /closed|used|expired|canceled|not_found/.test(reason) ? "closed" : "common",
    };
  }
  // 내 리드미에도. revalidatePath는 부르지 않는다: 부르면 지금 화면(답한 링크)을 다시 그려 '이미 답한 링크'로 바뀐다(/me는 요청마다 새로 그린다)
  if (saveMine && session) {
    await session.tx(async (q) => {
      for (const [section, value] of Object.entries(answer)) if (isSection(section)) await writeSection(q, session.user.id, section, value);
    });
  }
  const n = notify as { to: string; name: string; contactId: string } | null;
  if (n) {
    await notifyUserT(n.to, (locale) => ({
      title: n.name ? translate(locale, "notif.answered", { name: n.name }) : translate(locale, "notif.answeredAnon"),
      body: translate(locale, "notif.open"),
      path: `/people/${n.contactId}`,
    }));
  }
  return { sent: true, savedMine: saveMine, error: null };
}
