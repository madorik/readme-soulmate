"use server";

import { track } from "@/lib/track";
import { captureField, clip, describeCapture, isSection, mergeCapture, sanitizeSection, translate, type CaptureOp, type CardData, type PartialCard, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { aiConfigured, classifyCapture, type CaptureItem } from "@/lib/ai";
import { cleanCaptureItems, type CapturePerson } from "@/lib/capture-ai";
import { nameKey, resolveCapture, resolveSaved, whoOf, type CaptureTarget, type ResolvedCapture } from "@/lib/capture-target";
import { reserveAi } from "@/lib/ai-quota";
import { displayName, listNotes, listPeople, readCard, requireSession, sealNote, writeContactSection, writeSection, type Note, type Person, type Session } from "@/lib/data";
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
  error: "ai_off" | "failed" | "nothing" | "limit" | null;
}

/**
 * 확인 화면의 한 줄: 화면에 보일 한 줄 + 그 줄이 된 항목(고친 값은 이 항목을 고쳐 저장 단계로 되돌려 보낸다)
 * target: 누구의 이야기로 정했나(같은 이름이 여럿이라 못 정했으면 pick). spoken: 말한 이름. candidates: 같은 이름 후보(contactId)
 * idx: 이 줄이 된 항목이 보낸 목록에서 몇 번째인가(미리 보기가 줄을 항목에 맞춰 돌려준다)
 */
export interface CaptureDraftLine extends CaptureLine {
  item: CaptureItem;
  idx: number;
  target: CaptureTarget;
  spoken: string;
  candidates: string[];
}

/** 대상·항목을 바꾼 줄을 다시 따져 본 결과(이미 알고 있어요 표시만). 줄이 빠졌으면 저장해도 아무것도 안 적히는 줄이다 */
export interface CapturePreview {
  /** false면 따져 보지 못했다(그대로 둔다) */
  ok: boolean;
  lines: { idx: number; same: boolean }[];
}

/** 나누기만 한 초안(아직 아무것도 저장하지 않았다) */
export interface CaptureDraft {
  lines: CaptureDraftLine[];
  error: CaptureState["error"];
}

const failed = (error: NonNullable<CaptureState["error"]>) => ({ error }) as const;

/**
 * 말(글)을 나눌 준비: 로그인·빈 말·AI 설정·하루 한도를 보고, 사람 목록과 @부름을 풀어 AI로 나눈다. 나눈 결과(items)와 이어서 쓸 것을 돌려준다
 * aboutId: 그 사람 화면에서 적었을 때. 다른 사람 이름이 없는 말은 그 사람 이야기로 본다
 * picked: 글로 적기에서 @로 고른 사람(글에 '@부름'이 남아 있는 것만 쓴다). 직접 적은 @낱말도 이름·태그로 찾는다.
 *   한 사람만 짚으면 그 사람 화면에서 적은 것처럼, 여럿이면 짚은 이름 뒤의 말을 그 사람 이야기로 본다
 */
const asCapture = (p: Person): CapturePerson => ({ id: p.contactId, name: p.name, nickname: p.nickname });

async function classify(raw: string, aboutId?: string, picked?: { id: string; label: string }[]) {
  const s = await requireSession();
  const { locale } = s.profile;
  const said = clip(String(raw ?? "").replace(/\s+/g, " ").trim(), 500).trim();
  if (!said) return failed("nothing");
  if (!aiConfigured()) return failed("ai_off");
  // 사람 목록과 하루 한도(사람마다·서비스 전체)는 서로 상관없어 같이 확인한다. 한도에 막히면 OpenAI를 부르지 않는다
  const [people, gate] = await Promise.all([listPeople(s), reserveAi({ id: s.user.id, demo: s.user.isAnonymous || s.profile.isDemo }, "capture")]);
  if (gate === "user_limit" || gate === "global_limit") return failed("limit");
  if (gate !== "ok") return failed("failed");
  const pickedOk = (Array.isArray(picked) ? picked : [])
    .filter((m) => m && typeof m.id === "string" && typeof m.label === "string")
    .map((m) => ({ id: m.id, label: clip(m.label, 40) }));
  const { text, ids } = resolveMentions(
    said,
    people.map((p) => ({ id: p.contactId, name: p.name, tag: p.nickname })),
    pickedOk,
  );
  const mentioned = ids.map((id) => people.find((p) => p.contactId === id)).filter((p): p is Person => !!p);
  const about = aboutId ? people.find((p) => p.contactId === aboutId) : mentioned.length === 1 ? mentioned[0] : undefined;
  let items;
  try {
    items = await classifyCapture(text, people.map(asCapture), locale, about ? asCapture(about) : null, mentioned.map(asCapture));
  } catch {
    return failed("failed");
  }
  if (!items.length) return failed("nothing");
  // 사람이 직접 짚은 사람(@부름·그 사람 화면)은 이름이 겹쳐도 그 사람으로 확정이다
  const certain = new Set([...(about ? [about.contactId] : []), ...mentioned.map((p) => p.contactId)]);
  return { s, people, items, certain };
}

/** 아직 없는 사람(초안의 새 사람·못 정한 줄)이라 contactId 자리에 쓰는 이름표 */
const ghost = (id: string) => id.startsWith("new:") || id.startsWith("pick:");

/**
 * 대상이 정해진 항목을 사람 기록·내 리드미·메모에 넣는다(write). 새 사람은 같은 이름당 한 명만 새로 더한다.
 * write가 false면 같은 길을 가되 아무것도 쓰지 않고(새 사람도 만들지 않는다) 어떻게 적힐지 줄만 돌려준다 — 확인 화면의 초안·미리 보기.
 * 대상이 내 사람이 아니거나(사람 목록에 없다) 저장인데 아직 못 정한 줄(pick)은 건너뛴다
 */
async function apply(s: Session, people: Person[], rows: ResolvedCapture[], write: boolean): Promise<{ lines: CaptureDraftLine[]; undo: UndoOp[] }> {
  const { locale } = s.profile;
  const lines: CaptureDraftLine[] = [];
  const undo: UndoOp[] = [];
  const me = translate(locale, "voice.me");
  await s.tx(async (q) => {
    const mine = (await readCard(q, s.user.id)).card;
    // 같은 말 안에서 같은 칸을 여러 번 고쳐도 차례로 합쳐지게 지금 값을 들고 다닌다
    const cards = new Map<string, PartialCard>([["me", { ...mine }], ...people.map((p) => [p.contactId, { ...p.card }] as [string, PartialCard])]);
    const names = new Map<string, string>([["me", me], ...people.map((p) => [p.contactId, displayName(p)] as [string, string])]);
    const created = new Map<string, string>(); // 새 사람 이름(nameKey) → contactId(초안에서는 아직 없는 사람이라 이름표 new:이름)
    const touched = new Set<string>();
    // 사람마다 메모는 이 말 안에서 한 번만 읽고, 새로 남긴 것은 목록에 보탠다
    const notes = new Map<string, Note[]>();
    const notesOf = async (id: string): Promise<Note[]> => {
      let list = notes.get(id);
      if (!list) notes.set(id, (list = ghost(id) ? [] : await listNotes(q, s.user.id, id)));
      return list;
    };

    for (const row of rows) {
      const { target } = row;
      let who: string;
      if (target.kind === "me") who = "me";
      else if (target.kind === "person") {
        if (!cards.has(target.id) || target.id === "me") continue; // 내 사람이 아니면 어디에도 적지 않는다
        who = target.id;
      } else if (target.kind === "new") {
        const key = nameKey(target.name);
        const known = created.get(key);
        if (known) who = known;
        else {
          if (write) {
            const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname) values ($1, $2) returning id", [s.user.id, target.name]);
            await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [c!.id, s.user.id]);
            who = c!.id;
            undo.push({ type: "contact", contactId: who });
          } else who = `new:${target.name}`;
          created.set(key, who);
          cards.set(who, {});
          notes.set(who, []);
          names.set(who, target.name);
        }
      } else {
        if (write) continue; // 못 정한 줄은 저장하지 않는다
        who = `pick:${row.idx}`;
        cards.set(who, {});
        notes.set(who, []);
        names.set(who, row.spoken);
      }
      // 화면이 줄과 함께 되돌려 받는 것: 대상까지 반영한 항목과 대상·말한 이름·후보
      const item = { ...row.item, who: whoOf(target, row.spoken) };
      const extra = { item, idx: row.idx, target, spoken: row.spoken, candidates: row.candidates };
      const isNew = [...created.values()].includes(who);
      const href = who === "me" ? "/me" : ghost(who) ? "" : `/people/${who}`;

      if (item.target === "memo") {
        if (item.op !== "add") continue; // 메모를 고치거나 지우는 건 메모 칸에서
        const body = clip((item.text ?? "").trim(), 1000).trim();
        if (!body || who === "me") continue; // 나에 대한 메모 칸은 없다
        // 같은 말을 또 하면 메모를 두 번 남기지 않는다
        const kept = await notesOf(who);
        if (kept.some((n) => n.body.trim() === body)) continue;
        if (write) {
          const n = await q.one<{ id: string }>("insert into notes (author_id, contact_id, label, payload) values ($1, $2, '', $3) returning id", [
            s.user.id,
            who,
            JSON.stringify(sealNote(s.user.id, who, body)),
          ]);
          kept.unshift({ id: n!.id, label: "", body, createdAt: new Date().toISOString() });
          undo.push({ type: "note", contactId: who, id: n!.id });
        } else kept.unshift({ id: "", label: "", body, createdAt: new Date().toISOString() });
        lines.push({ who: names.get(who)!, isNew, op: "add", field: translate(locale, "voice.memo"), value: body, href, ...extra });
        continue;
      }

      const field = captureField(item.target);
      if (!field) continue;
      const card = cards.get(who)!;
      const op = item.op;
      const merged = mergeCapture(field, card[field.section], item, op);
      // 내 리드미의 선물 목록은 '받고 싶은 것', 다른 사람 기록에서는 '해주고 싶은 선물'
      const label = who === "me" && field.key === "gifts.wishlist" ? translate(locale, "gift.wishTitle") : field.label[locale];
      const line = { who: names.get(who)!, isNew, op, field: label, value: describeCapture(field, item, locale), href, ...extra };
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
      if (write) {
        if (who === "me") await writeSection(q, s.user.id, field.section, merged);
        else await writeContactSection(q, s.user.id, who, field.section, merged);
      }
      (card as Record<string, unknown>)[field.section] = merged;
      lines.push(line);
    }
  });
  return { lines, undo };
}

/** 저장이 끝난 뒤 화면을 새로 그리게 하고 이용 기록을 남긴다 */
function committed(s: Session) {
  track("capture", { userId: s.user.id });
  revalidatePath("/people", "layout");
  revalidatePath("/home");
  revalidatePath("/me");
}

/** 확인 화면에 보일 줄(저장 단계가 쓰는 항목은 빼고 화면용 줄만) */
const plain = (l: CaptureDraftLine): CaptureLine => ({ who: l.who, isNew: l.isNew, op: l.op, same: l.same, field: l.field, value: l.value, href: l.href });

/**
 * 말(글) 한 번을 나눠 바로 사람 기록·내 리드미·메모에 넣는다(되돌리기로 취소). 그 사람 화면의 한 줄 적기·토스가 쓴다
 * aboutId·picked는 classify와 같다
 */
export async function captureNote(raw: string, aboutId?: string, picked?: { id: string; label: string }[]): Promise<CaptureState> {
  const c = await classify(raw, aboutId, picked);
  if ("error" in c) return { lines: [], undo: [], error: c.error };
  let done;
  try {
    done = await apply(c.s, c.people, resolveCapture(c.items, c.people.map(asCapture), { detect: false }), true);
  } catch {
    return { lines: [], undo: [], error: "failed" };
  }
  if (!done.lines.length) return { lines: [], undo: [], error: "nothing" };
  committed(c.s);
  return { lines: done.lines.map(plain), undo: done.undo, error: null };
}

/**
 * 말로 적기 1단계 — 나누기만 한다: AI가 (사람 · 칸 · 값)으로 나눈 결과를 아무것도 저장하지 않고 초안으로 돌려준다.
 * 화면은 초안의 값을 고치게 하고, 저장 단계(saveCapture)에 고친 항목을 되돌려 보낸다
 */
export async function draftCapture(raw: string, aboutId?: string, picked?: { id: string; label: string }[]): Promise<CaptureDraft> {
  const c = await classify(raw, aboutId, picked);
  if ("error" in c) return { lines: [], error: c.error };
  let done;
  try {
    // 같은 이름이 여럿이면 어느 쪽인지 고르게(pick) 하고, 후보를 같이 돌려준다
    done = await apply(c.s, c.people, resolveCapture(c.items, c.people.map(asCapture), { detect: true, certain: c.certain }), false);
  } catch {
    return { lines: [], error: "failed" };
  }
  if (!done.lines.length) return { lines: [], error: "nothing" };
  return { lines: done.lines, error: null };
}

/**
 * 말로 적기 2단계 — 저장: 초안에서 대상을 정하고 값을 고치고 줄을 뺀 항목들을 실제 기록에 넣는다(기존 합치기·'이미 알고 있어요' 판단·새 사람 더하기를 그대로).
 * 항목의 who가 정해진 대상이다: 내 사람(contactId)이거나 새 사람(이름). contactId가 내 사람이 아니면 그 줄은 건너뛰고(새 사람으로 둔갑시키지 않는다),
 * 새 사람은 같은 이름당 한 명만 만든다. 화면에서 온 값이라 모양을 다시 맞추고, AI는 부르지 않는다. 내 기록만 고칠 수 있다(RLS)
 */
export async function saveCapture(raw: unknown): Promise<CaptureState> {
  const s = await requireSession();
  const items = cleanCaptureItems(raw);
  if (!items.length) return { lines: [], undo: [], error: "nothing" };
  let done;
  try {
    const people = await listPeople(s);
    done = await apply(s, people, resolveSaved(items, people.map(asCapture)), true);
  } catch {
    return { lines: [], undo: [], error: "failed" };
  }
  if (!done.lines.length) return { lines: [], undo: [], error: "nothing" };
  committed(s);
  return { lines: done.lines.map(plain), undo: done.undo, error: null };
}

/**
 * 초안에서 줄의 대상·항목을 바꾼 뒤 '이미 알고 있어요'를 다시 따진다(아무것도 저장하지 않고, AI도 부르지 않는다).
 * 보낸 항목 순서대로 idx를 돌려주고, 줄이 안 오면 저장해도 적히지 않는 줄이다
 */
export async function previewCapture(raw: unknown): Promise<CapturePreview> {
  const s = await requireSession();
  const items = cleanCaptureItems(raw);
  if (!items.length) return { ok: false, lines: [] };
  try {
    const people = await listPeople(s);
    const done = await apply(s, people, resolveSaved(items, people.map(asCapture)), false);
    return { ok: true, lines: done.lines.map((l) => ({ idx: l.idx, same: !!l.same })) };
  } catch {
    return { ok: false, lines: [] };
  }
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
