"use server";

import { track } from "@/lib/track";
import { captureField, describeCapture, isSection, mergeCapture, sanitizeSection, translate, type CaptureOp, type CardData, type PartialCard, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { aiConfigured, classifyCapture } from "@/lib/ai";
import { displayName, listNotes, listPeople, readCard, requireSession, sealNote, writeContactSection, writeSection, type Person } from "@/lib/data";
import { resolveMentions } from "@/lib/mention";

/** 화면에 보일 한 줄: "아내 · 요즘 마시는 것 · 바닐라라떼" */
export interface CaptureLine {
  who: string;
  /** 이번에 새로 더한 사람 */
  isNew: boolean;
  /** 더하기·바꾸기·지우기 */
  op: CaptureOp;
  /** 바뀐 게 없는 칸(더하기·바꾸기: 이미 그렇게 적혀 있다, 지우기: 이미 없다) */
  same?: boolean;
  /** 칸 이름(메모면 '메모') */
  field: string;
  value: string;
  /** 사람 화면 주소(나면 /me) */
  href: string;
}

/** 되돌리기에 쓰는 것(적은 순서대로). 내 것만 고치므로 값은 화면에서 받아도 된다(RLS가 내 줄만 허락) */
export type UndoOp =
  | { type: "section"; who: "me" | string; section: Section; before: unknown }
  | { type: "note"; contactId: string; id: string }
  | { type: "contact"; contactId: string };

export interface CaptureState {
  lines: CaptureLine[];
  undo: UndoOp[];
  error: "ai_off" | "failed" | "nothing" | null;
}

/**
 * 말(글) 한 번을 나눠 사람 기록·내 리드미·메모에 넣는다. 없는 사람은 새로 더한다.
 * aboutId: 그 사람 화면에서 적었을 때. 다른 사람 이름이 없는 말은 그 사람 이야기로 본다
 * picked: 글로 적기에서 @로 고른 사람(글에 '@부름'이 남아 있는 것만 쓴다). 직접 적은 @낱말도 이름·태그로 찾는다.
 *   한 사람만 짚으면 그 사람 화면에서 적은 것처럼, 여럿이면 짚은 이름 뒤의 말을 그 사람 이야기로 본다
 */
export async function captureNote(raw: string, aboutId?: string, picked?: { id: string; label: string }[]): Promise<CaptureState> {
  const s = await requireSession();
  const { locale } = s.profile;
  const said = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!said) return { lines: [], undo: [], error: "nothing" };
  if (!aiConfigured()) return { lines: [], undo: [], error: "ai_off" };
  const people = await listPeople(s);
  const pickedOk = (Array.isArray(picked) ? picked : [])
    .filter((m) => m && typeof m.id === "string" && typeof m.label === "string")
    .map((m) => ({ id: m.id, label: m.label.slice(0, 40) }));
  const { text, ids } = resolveMentions(
    said,
    people.map((p) => ({ id: p.contactId, name: p.name, tag: p.nickname })),
    pickedOk,
  );
  const asCapture = (p: Person) => ({ id: p.contactId, name: p.name, nickname: p.nickname });
  const mentioned = ids.map((id) => people.find((p) => p.contactId === id)).filter((p): p is Person => !!p);
  const about = aboutId ? people.find((p) => p.contactId === aboutId) : mentioned.length === 1 ? mentioned[0] : undefined;
  let items;
  try {
    items = await classifyCapture(text, people.map(asCapture), locale, about ? asCapture(about) : null, mentioned.map(asCapture));
  } catch {
    return { lines: [], undo: [], error: "failed" };
  }
  if (!items.length) return { lines: [], undo: [], error: "nothing" };

  const lines: CaptureLine[] = [];
  const undo: UndoOp[] = [];
  const me = translate(locale, "voice.me");
  try {
    await s.tx(async (q) => {
      const mine = (await readCard(q, s.user.id)).card;
      // 같은 말 안에서 같은 칸을 여러 번 고쳐도 차례로 합쳐지게 지금 값을 들고 다닌다
      const cards = new Map<string, PartialCard>([["me", { ...mine }], ...people.map((p) => [p.contactId, { ...p.card }] as [string, PartialCard])]);
      const names = new Map<string, string>([["me", me], ...people.map((p) => [p.contactId, displayName(p)] as [string, string])]);
      const created = new Map<string, string>(); // 새 사람 이름 → contactId
      const touched = new Set<string>();

      for (const item of items) {
        let who: string;
        if (item.who.type === "me") who = "me";
        else if (item.who.type === "existing" && item.who.contactId && cards.has(item.who.contactId) && item.who.contactId !== "me") who = item.who.contactId;
        else {
          const name = (item.who.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
          if (!name) continue;
          const known = created.get(name) ?? people.find((p) => p.nickname === name || p.name === name)?.contactId;
          if (known) who = known;
          else {
            const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname) values ($1, $2) returning id", [s.user.id, name]);
            await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [c!.id, s.user.id]);
            who = c!.id;
            created.set(name, who);
            cards.set(who, {});
            names.set(who, name);
            undo.push({ type: "contact", contactId: who });
          }
        }
        const isNew = [...created.values()].includes(who);
        const href = who === "me" ? "/me" : `/people/${who}`;

        if (item.target === "memo") {
          if (item.op !== "add") continue; // 메모를 고치거나 지우는 건 메모 칸에서
          const body = (item.text ?? "").trim().slice(0, 1000);
          if (!body || who === "me") continue; // 나에 대한 메모 칸은 없다
          // 같은 말을 또 하면 메모를 두 번 남기지 않는다
          if ((await listNotes(q, s.user.id, who)).some((n) => n.body.trim() === body)) continue;
          const n = await q.one<{ id: string }>("insert into notes (author_id, contact_id, label, payload) values ($1, $2, '', $3) returning id", [
            s.user.id,
            who,
            JSON.stringify(sealNote(s.user.id, who, body)),
          ]);
          undo.push({ type: "note", contactId: who, id: n!.id });
          lines.push({ who: names.get(who)!, isNew, op: "add", field: translate(locale, "voice.memo"), value: body, href });
          continue;
        }

        const field = captureField(item.target);
        if (!field) continue;
        const card = cards.get(who)!;
        const op = item.op;
        const merged = mergeCapture(field, card[field.section], item, op);
        // 내 리드미의 선물 목록은 '받고 싶은 것', 다른 사람 기록에서는 '해주고 싶은 선물'
        const label = who === "me" && field.key === "gifts.wishlist" ? translate(locale, "gift.wishTitle") : field.label[locale];
        const line = { who: names.get(who)!, isNew, op, field: label, value: describeCapture(field, item, locale), href };
        if (!merged) {
          // 이미 그대로 적혀 있으면 '이미 알고 있어요', 지울 게 없으면 '이미 없어요'(값이 틀린 더하기·바꾸기는 버린다)
          if (op === "remove" || mergeCapture(field, null, item, op)) lines.push({ ...line, same: true });
          continue;
        }
        const key = `${who}:${field.section}`;
        if (!touched.has(key)) {
          touched.add(key);
          undo.push({ type: "section", who, section: field.section, before: card[field.section] ?? null });
        }
        if (who === "me") await writeSection(q, s.user.id, field.section, merged);
        else await writeContactSection(q, s.user.id, who, field.section, merged);
        (card as Record<string, unknown>)[field.section] = merged;
        lines.push(line);
      }
    });
  } catch {
    return { lines: [], undo: [], error: "failed" };
  }
  if (!lines.length) return { lines: [], undo: [], error: "nothing" };
  track("capture", { userId: s.user.id });
  revalidatePath("/people", "layout");
  revalidatePath("/home");
  revalidatePath("/me");
  return { lines, undo, error: null };
}

/** 방금 말로 적은 것 되돌리기(거꾸로) */
export async function undoCapture(ops: UndoOp[]): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (!Array.isArray(ops)) return { ok: false };
  try {
    await s.tx(async (q) => {
      for (const op of [...ops].reverse()) {
        if (op?.type === "note" && typeof op.id === "string") await q("delete from notes where id::text = $1", [op.id]);
        else if (op?.type === "contact" && typeof op.contactId === "string") await q("delete from contacts where id::text = $1", [op.contactId]);
        else if (op?.type === "section" && isSection(op.section) && typeof op.who === "string") {
          const section = op.section;
          if (op.who === "me") {
            if (op.before == null) await q("delete from card_sections where owner_id = $1 and section = $2", [s.user.id, section]);
            else await writeSection(q, s.user.id, section, sanitizeSection(section, op.before) as CardData[Section]);
          } else if (op.before == null) {
            await q("update contact_cards set sections = sections - $2::text where contact_id::text = $1", [op.who, section]);
          } else {
            await writeContactSection(q, s.user.id, op.who, section, sanitizeSection(section, op.before));
          }
        }
      }
    });
  } catch {
    return { ok: false };
  }
  revalidatePath("/people", "layout");
  revalidatePath("/home");
  revalidatePath("/me");
  return { ok: true };
}
