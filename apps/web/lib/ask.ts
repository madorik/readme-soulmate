import "server-only";
import { hashToken, isSection, sanitizeSection, sanitizeSections, type PartialCard, type Section } from "@readme/core";
import { cache } from "react";
import { keepAskerWishes, prefillForRecipient } from "./ask-core";
import { aad, open } from "./crypto";
import { isLockedPayload, LIMITS } from "./data-core";
import { openContactSections, openPrefill, sealContactSections, sealPrefill, type Session } from "./data";
import { asSystem, dbReason, systemOne } from "./db";
import { insertInvite } from "./invites";

// 물어보기 만들기·읽기·답하기의 공통 부분. 웹·앱(서버 액션 app/actions/request.ts)과 토스 미니앱(/api/t)이 같이 쓴다

export function cleanCard(input: unknown, allowed: Section[]): PartialCard {
  const card: PartialCard = {};
  if (!input || typeof input !== "object") return card;
  for (const [section, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSection(section) && allowed.includes(section) && value != null) (card as Record<string, unknown>)[section] = sanitizeSection(section, value);
  }
  return card;
}

/**
 * 주소록의 한 사람(to)에게, 또는 새 사람(name)을 주소록에 넣고 물어보기 링크 토큰을 만든다.
 * 내 기록에 이미 적힌 값은 미리 채워 보내서, 상대는 맞아요·고치기만 누르면 된다. 없는 사람이면 'not_found'를 던진다
 */
export async function createAsk(s: Session, input: { to?: string; name?: string; sections: Section[]; message: string }): Promise<{ token: string }> {
  const { to, name = "", sections, message } = input;
  return s.tx(async (q) => {
    let contactId: string;
    let prefill: PartialCard = {};
    if (to) {
      // 내 주소록 칸만(RLS). 미리 채울 값은 내 기록에서 물어보는 항목만
      const c = await q.one<{ id: string }>("select id from contacts where id::text = $1", [to]);
      if (!c) throw new Error("not_found");
      contactId = c.id;
      const r = await q.one<{ sections: unknown }>("select sections from contact_cards where contact_id = $1", [contactId]);
      const mine = openContactSections(s.user.id, contactId, r?.sections);
      // 선물 칸의 '해주고 싶은 선물'(wishlist)은 상대에게 새면 안 되니 뺀다
      prefill = prefillForRecipient(Object.fromEntries(Object.entries(mine).filter(([k]) => sections.includes(k as Section))) as PartialCard);
    } else {
      // 새 사람도 사람 수 한도(LIMITS.people)를 지킨다
      const n = await q.one<{ n: number }>("select count(*)::int as n from contacts where user_id = $1", [s.user.id]);
      if ((n?.n ?? 0) >= LIMITS.people) throw new Error("limit");
      const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname) values ($1, $2) returning id", [s.user.id, name]);
      contactId = c!.id;
      await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [contactId, s.user.id]);
    }
    const invite = await insertInvite(q, { inviter_id: s.user.id, contact_id: contactId, sections, recipient_name: name, message }, (hash) =>
      Object.keys(prefill).length ? sealPrefill(hash, prefill) : {},
    );
    return { token: invite.token };
  });
}

export type AskState = "active" | "expired" | "used" | "canceled" | "not_found";

export type AskRow = {
  state: AskState;
  inviter_id: string | null;
  inviter_name: string | null;
  contact_id: string | null;
  recipient_name: string | null;
  sections: string[] | null;
  prefill: unknown;
  message: string | null;
};

/**
 * 링크 토큰으로 물어보기 한 줄(로그인 없이 연다. 토큰 해시가 맞는 한 줄만). 미리 채운 값은 풀어서 돌려준다.
 * request_for_answer는 읽기만 하는 함수라 트랜잭션 없이 한 번에 부른다. 예전에 보낸 물어보기에 든 wishlist도 여기서 뺀다
 */
export async function readAsk(token: string): Promise<{ row: AskRow; prefill: PartialCard }> {
  const hash = await hashToken(token);
  const row = ((await systemOne<AskRow>("select * from request_for_answer($1)", [hash])) ?? { state: "not_found" }) as AskRow;
  return { row, prefill: row.state === "active" ? prefillForRecipient(openPrefill(hash, row.prefill)) : {} };
}

/** 한 요청 안에서는 한 번만 읽는다(링크 미리보기 generateMetadata와 화면이 같이 쓴다) */
export const readAskOnce = cache(readAsk);

export type AnswerError = "consent" | "closed" | "self" | "common";

/**
 * 답하기(로그인 없이도 된다). 답은 물어본 사람의 기록에 들어간다(그 뒤로는 그 사람 것이라 그 사람이 고친다).
 * 서버가 물어본 사람의 기록 범위로 암호화해서 시스템 권한 함수에 넘긴다. answererId가 있으면 물어본 사람 주소록에 그 사람 얼굴·이름이 이어진다
 */
export async function answerAsk(
  token: string,
  data: unknown,
  consent: boolean,
  answererId: string | null,
): Promise<{ ok: true; answer: PartialCard; inviter: string; name: string; contactId: string } | { ok: false; error: AnswerError }> {
  const hash = await hashToken(token);
  try {
    return await asSystem(async (q) => {
      const row = await q.one<AskRow>("select * from request_for_answer($1)", [hash]);
      if (!row || row.state !== "active") throw new Error("closed");
      const answer = cleanCard(data, sanitizeSections(row.sections));
      if (!Object.keys(answer).length) throw new Error("empty");
      if (answer.safety && !consent) throw new Error("consent_required");
      // 물어본 사람의 기록에 이미 있는 항목: 키가 다른 환경에서 못 푸는 값은 덮어쓰지 않고(진짜 기록 보호), 선물 칸은 내가 적어 둔 wishlist를 지킨다
      const mine = await q.one<{ sections: Record<string, unknown> | null }>("select sections from contact_cards where contact_id = $1 and author_id = $2", [row.contact_id, row.inviter_id]);
      for (const section of Object.keys(answer)) {
        if (isLockedPayload(mine?.sections?.[section], (p) => open(p, aad.contact(row.inviter_id!, row.contact_id!, section)))) throw new Error("undecryptable");
      }
      // 저장하는 값에만 합친다. 돌려주는 answer는 상대가 쓴 그대로(상대가 '내 리드미에도'를 고르면 그 값이 상대 기록에 들어가니, 내 wishlist가 섞이면 안 된다)
      const stored: PartialCard = { ...answer };
      if (answer.gifts) {
        const existing = openContactSections(row.inviter_id!, row.contact_id!, { gifts: mine?.sections?.gifts }).gifts;
        stored.gifts = sanitizeSection("gifts", keepAskerWishes(answer.gifts, existing));
      }
      await q("select submit_request_answer($1, $2, $3, $4)", [hash, JSON.stringify(sealContactSections(row.inviter_id!, row.contact_id!, stored)), consent, answererId]);
      return { ok: true as const, answer, inviter: row.inviter_id!, name: (row.recipient_name ?? "").trim(), contactId: row.contact_id! };
    });
  } catch (e) {
    const reason = dbReason(e);
    return { ok: false, error: reason.includes("consent") ? "consent" : reason.includes("self") ? "self" : /closed|used|expired|canceled|not_found/.test(reason) ? "closed" : "common" };
  }
}
