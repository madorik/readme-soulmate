"use server";

import { captureField, describeCapture, isSection, mergeCapture, sanitizeSection, translate, type CardData, type PartialCard, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { aiConfigured, classifyCapture } from "@/lib/ai";
import { displayName, listNotes, listPeople, readCard, requireSession, sealNote, writeContactSection, writeSection } from "@/lib/data";

/** 화면에 보일 한 줄: "아내 · 요즘 마시는 것 · 바닐라라떼" */
export interface CaptureLine {
  who: string;
  /** 이번에 새로 더한 사람 */
  isNew: boolean;
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

/** 말(글) 한 번을 나눠 사람 기록·내 리드미·메모에 넣는다. 없는 사람은 새로 더한다 */
export async function captureNote(raw: string): Promise<CaptureState> {
  const s = await requireSession();
  const { locale } = s.profile;
  const text = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!text) return { lines: [], undo: [], error: "nothing" };
  if (!aiConfigured()) return { lines: [], undo: [], error: "ai_off" };
  const people = await listPeople(s);
  let items;
  try {
    items = await classifyCapture(
      text,
      people.map((p) => ({ id: p.contactId, name: p.name, nickname: p.nickname })),
      locale,
    );
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
          lines.push({ who: names.get(who)!, isNew, field: translate(locale, "voice.memo"), value: body, href });
          continue;
        }

        const field = captureField(item.target);
        if (!field) continue;
        const card = cards.get(who)!;
        const merged = mergeCapture(field, card[field.section], item);
        if (!merged) continue;
        const key = `${who}:${field.section}`;
        if (!touched.has(key)) {
          touched.add(key);
          undo.push({ type: "section", who, section: field.section, before: card[field.section] ?? null });
        }
        if (who === "me") await writeSection(q, s.user.id, field.section, merged);
        else await writeContactSection(q, s.user.id, who, field.section, merged);
        (card as Record<string, unknown>)[field.section] = merged;
        lines.push({ who: names.get(who)!, isNew, field: field.label[locale], value: describeCapture(field, item, locale), href });
      }
    });
  } catch {
    return { lines: [], undo: [], error: "failed" };
  }
  if (!lines.length) return { lines: [], undo: [], error: "nothing" };
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
