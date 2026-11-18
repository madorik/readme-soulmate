import { isEmptySection, isSection, SECTIONS, type Section } from "@readme/core";
import { NextResponse, type NextRequest } from "next/server";
import { captureNote, undoCapture, type UndoOp } from "@/app/actions/capture";
import { aiConfigured } from "@/lib/ai";
import { reserveAi } from "@/lib/ai-quota";
import { displayName, getSession, listNotes, listPeople, todayFor, writeContactSection, type Person, type Session } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import { isGenericBasis } from "@/lib/gift-core";
import { giftContext, giftLinkPicks, giftNotes, giftPicks, giftPicksConfigured } from "@/lib/gifts";
import { makeT } from "@/lib/i18n";
import { corsHeaders, exchangeAnonCode, tossDevLogin, tossLoginConfigured, tossSignIn } from "@/lib/toss";
import type { TGifts, THome, TPerson, TPersonDetail } from "@/lib/toss-api";
import { track } from "@/lib/track";

// 토스 미니앱(apps/toss)이 부르는 API. 미니앱은 토스 도메인에서 열리므로 CORS로 그 주소만 받고, 로그인은 Bearer 토큰(lib/toss).
// 웹·앱 화면은 서버 컴포넌트·서버 액션을 그대로 쓰고, 여기는 같은 데이터 함수를 JSON으로 감싼 것만 둔다.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ path: string[] }> };

const UUID = /^[0-9a-f-]{36}$/i;

function reply(req: NextRequest, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(req.headers.get("origin")), "Cache-Control": "no-store" } });
}

function toPerson(p: Person): TPerson {
  return {
    id: p.contactId,
    name: displayName(p),
    avatar: p.avatar,
    favorite: p.favorite,
    filled: SECTIONS.filter((s) => !isEmptySection(s, p.card[s] as never)),
  };
}

async function body(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function findPerson(s: Session, id: string): Promise<Person | null> {
  if (!UUID.test(id)) return null;
  return (await listPeople(s)).find((p) => p.contactId === id) ?? null;
}

// ── 로그인 ─────────────────────────────────────

async function signIn(req: NextRequest): Promise<NextResponse> {
  const b = await body(req);
  let anonKey: string | null = null;
  if (typeof b.code === "string" && tossLoginConfigured()) anonKey = await exchangeAnonCode(b.code).catch(() => null);
  // 개발: 인증서 없이 브라우저·샌드박스에서 들어온다(기기마다 다른 키를 보낸다)
  else if (typeof b.dev === "string" && /^[\w-]{8,64}$/.test(b.dev) && tossDevLogin()) anonKey = `dev-${b.dev}`;
  if (!anonKey) return reply(req, { error: "login" }, 401);
  return reply(req, { token: await tossSignIn(anonKey) });
}

// ── 읽기 ───────────────────────────────────────

async function home(req: NextRequest, s: Session): Promise<NextResponse> {
  const t = makeT(s.profile.locale);
  const people = await listPeople(s);
  const today = todayFor(s.profile);
  const events = eventsFor(people, today, 60).map((e) => ({ contactId: e.contactId, title: eventName(e, t, s.profile.locale), date: e.date, daysUntil: e.daysUntil, kind: e.kind }));
  const out: THome = { today, events, people: people.map(toPerson), ai: aiConfigured() };
  return reply(req, out);
}

async function person(req: NextRequest, s: Session, id: string): Promise<NextResponse> {
  const p = await findPerson(s, id);
  if (!p) return reply(req, { error: "not_found" }, 404);
  const notes = await s.tx((q) => listNotes(q, s.user.id, p.contactId));
  const out: TPersonDetail & { notes: { id: string; label: string; body: string; createdAt: string }[] } = {
    person: { ...toPerson(p), card: p.card },
    locale: s.profile.locale,
    today: todayFor(s.profile),
    notes,
  };
  return reply(req, out);
}

async function gifts(req: NextRequest, s: Session, id: string): Promise<NextResponse> {
  const p = await findPerson(s, id);
  if (!p) return reply(req, { error: "not_found" }, 404);
  const t = makeT(s.profile.locale);
  const today = todayFor(s.profile);
  const dates = p.card.dates;
  const next = eventsFor([p], today, 400)[0];
  const occasion = next ? (next.kind === "anniversary" ? { kind: "anniversary" as const, label: next.label ?? "" } : { kind: "birthday" as const, label: "" }) : dates?.birthday ? { kind: "birthday" as const, label: "" } : null;
  const [ctx, notes] = await Promise.all([giftContext(s, p, occasion, today), giftNotes(s, p)]);
  const skip = (req.nextUrl.searchParams.get("skip") ?? "").split(",").filter((x) => /^[\w-]{1,40}$/.test(x)).slice(-60);
  const search = (q: string) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;
  let out: TGifts;
  if (!giftPicksConfigured()) {
    const { bands, note } = await giftLinkPicks(s, p, ctx, notes, skip);
    out = {
      note,
      groups: bands.map((b) => ({
        label: t(`picks.band.${b.band}` as "picks.band.1"),
        items: b.items.map((i) => ({ id: i.id, name: i.q, image: i.image, reason: i.reason, basis: i.basis.filter((w) => !isGenericBasis(w, ctx)), search: search(i.q) })),
      })),
    };
  } else {
    const picks = await giftPicks(s, p, ctx, notes);
    out = {
      note: "",
      groups: [{ label: "", items: picks.map((k, n) => ({ id: `k${n}`, name: k.keyword, image: k.products[0]?.image ?? "", reason: k.reason, basis: (k.basis ?? []).filter((w) => !isGenericBasis(w, ctx)), search: search(k.keyword) })) }],
    };
  }
  track("gift_picks_view", { userId: s.user.id, source: "toss" });
  return reply(req, out);
}

// ── 쓰기 ───────────────────────────────────────

async function addPerson(req: NextRequest, s: Session): Promise<NextResponse> {
  const b = await body(req);
  const name = String(b.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) return reply(req, { error: "name" }, 400);
  const id = await s.tx(async (q) => {
    const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname) values ($1, $2) returning id", [s.user.id, name]);
    await q("insert into contact_cards (contact_id, author_id) values ($1, $2)", [c!.id, s.user.id]);
    return c!.id;
  });
  track("person_add", { userId: s.user.id, source: "toss" });
  return reply(req, { id });
}

async function renamePerson(req: NextRequest, s: Session, id: string): Promise<NextResponse> {
  const b = await body(req);
  const name = String(b.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name || !UUID.test(id)) return reply(req, { error: "name" }, 400);
  await s.tx((q) => q("update contacts set nickname = $2 where id::text = $1", [id, name]));
  return reply(req, { ok: true, name });
}

async function removePerson(req: NextRequest, s: Session, id: string): Promise<NextResponse> {
  if (!UUID.test(id)) return reply(req, { error: "not_found" }, 404);
  await s.tx((q) => q("delete from contacts where id::text = $1", [id]));
  return reply(req, { ok: true });
}

async function saveSection(req: NextRequest, s: Session, id: string, section: string): Promise<NextResponse> {
  if (!UUID.test(id) || !isSection(section)) return reply(req, { error: "bad" }, 400);
  const b = await body(req);
  try {
    const data = await s.tx((q) => writeContactSection(q, s.user.id, id, section as Section, b.data));
    track("record_save", { userId: s.user.id, source: section });
    return reply(req, { data });
  } catch {
    return reply(req, { error: "save" }, 500);
  }
}

async function capture(req: NextRequest): Promise<NextResponse> {
  const b = await body(req);
  const about = typeof b.about === "string" && UUID.test(b.about) ? b.about : undefined;
  return reply(req, await captureNote(String(b.text ?? ""), about));
}

async function undo(req: NextRequest): Promise<NextResponse> {
  const b = await body(req);
  return reply(req, await undoCapture((Array.isArray(b.ops) ? b.ops : []) as UndoOp[]));
}

/** 녹음 → 글(받아쓰기). 토스 웹뷰에는 기기 받아쓰기가 없어서 녹음 파일을 받아 OpenAI로 글로 바꾼다 */
async function transcribe(req: NextRequest, s: Session): Promise<NextResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return reply(req, { error: "ai_off" }, 503);
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^audio\/(webm|mp4|mpeg|ogg|wav|x-m4a|aac)$/.test(type)) return reply(req, { error: "type" }, 415);
  const audio = await req.arrayBuffer();
  if (audio.byteLength < 200 || audio.byteLength > 8 * 1024 * 1024) return reply(req, { error: "size" }, 413);
  const gate = await reserveAi({ id: s.user.id, demo: s.user.isAnonymous }, "capture");
  if (gate === "user_limit" || gate === "global_limit") return reply(req, { error: "limit" }, 429);
  const ext = type.includes("webm") ? "webm" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : type.includes("mpeg") ? "mp3" : "m4a";
  const form = new FormData();
  form.set("file", new Blob([audio], { type }), `voice.${ext}`);
  form.set("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  form.set("language", s.profile.locale === "en" ? "en" : "ko");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      console.warn("transcribe failed", res.status, (await res.text()).slice(0, 200));
      return reply(req, { error: "failed" }, 502);
    }
    const j = (await res.json()) as { text?: unknown };
    return reply(req, { text: typeof j.text === "string" ? j.text.trim().slice(0, 500) : "" });
  } catch {
    return reply(req, { error: "failed" }, 502);
  }
}

/** 계정과 기록 모두 지우기 */
async function deleteAccount(req: NextRequest, s: Session): Promise<NextResponse> {
  await s.tx((q) => q("select delete_my_account()"));
  track("account_delete", { source: "toss" });
  return reply(req, { ok: true });
}

// ── 길 나누기 ───────────────────────────────────

async function route(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const path = (await ctx.params).path;
  const m = req.method;
  const at = (...p: string[]) => path.length === p.length && p.every((x, i) => x === "*" || x === path[i]);
  if (m === "POST" && at("session")) return signIn(req);
  const s = await getSession();
  if (!s) return reply(req, { error: "login" }, 401);
  if (m === "GET" && at("home")) return home(req, s);
  if (m === "POST" && at("people")) return addPerson(req, s);
  if (m === "GET" && at("people", "*")) return person(req, s, path[1]);
  if (m === "PUT" && at("people", "*")) return renamePerson(req, s, path[1]);
  if (m === "DELETE" && at("people", "*")) return removePerson(req, s, path[1]);
  if (m === "PUT" && at("people", "*", "sections", "*")) return saveSection(req, s, path[1], path[3]);
  if (m === "GET" && at("people", "*", "gifts")) return gifts(req, s, path[1]);
  if (m === "POST" && at("capture")) return capture(req);
  if (m === "POST" && at("capture", "undo")) return undo(req);
  if (m === "POST" && at("transcribe")) return transcribe(req, s);
  if (m === "DELETE" && at("account")) return deleteAccount(req, s);
  return reply(req, { error: "not_found" }, 404);
}

export const GET = route;
export const POST = route;
export const PUT = route;
export const DELETE = route;

export function OPTIONS(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
