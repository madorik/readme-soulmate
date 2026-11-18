import { isEmptySection, isSection, sanitizeSections, SECTIONS, translate, type Section } from "@readme/core";
import { NextResponse, type NextRequest } from "next/server";
import { captureNote, undoCapture, type UndoOp } from "@/app/actions/capture";
import { aiConfigured } from "@/lib/ai";
import { reserveAi } from "@/lib/ai-quota";
import { answerAsk, createAsk, readAsk } from "@/lib/ask";
import { displayName, getSession, listNotes, listPeople, todayFor, writeContactSection, type Person, type Session } from "@/lib/data";
import { eventName, eventsFor } from "@/lib/events";
import { isGenericBasis } from "@/lib/gift-core";
import { giftContext, giftLinkPicks, giftNotes, giftPicks, giftPicksConfigured } from "@/lib/gifts";
import { makeT } from "@/lib/i18n";
import { corsHeaders, exchangeAnonCode, linkTossAccount, tossDevLogin, tossLoginConfigured, tossReminderTemplate, tossSignIn } from "@/lib/toss";
import { loadPage } from "@/lib/pages";
import { notifyUserT } from "@/lib/push";
import { runAction } from "@/lib/toss-actions";
import type { TAskCreated, TAskOpen, TGifts, THome, TPerson, TPersonDetail } from "@/lib/toss-api";
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

async function anonKeyFrom(b: Record<string, unknown>): Promise<string | null> {
  let anonKey: string | null = null;
  if (typeof b.code === "string" && tossLoginConfigured()) anonKey = await exchangeAnonCode(b.code).catch(() => null);
  // 개발: 인증서 없이 브라우저·샌드박스에서 들어온다(기기마다 다른 키를 보낸다)
  else if (typeof b.dev === "string" && /^[\w-]{8,64}$/.test(b.dev) && tossDevLogin()) anonKey = `dev-${b.dev}`;
  return anonKey;
}

async function signIn(req: NextRequest): Promise<NextResponse> {
  const b = await body(req);
  const anonKey = await anonKeyFrom(b);
  if (!anonKey) return reply(req, { error: "login" }, 401);
  // create가 false면 이미 있는 계정만(미니앱이 처음 열릴 때). 예전 번들은 create 없이 부르므로 그때는 만든다
  const token = await tossSignIn(anonKey, b.create !== false);
  return reply(req, token ? { token } : { new: true });
}

/** 기존 계정 연결: 앱 설정 > 토스에서 쓰기 코드로 이 토스 계정을 그 계정에 잇는다 */
async function link(req: NextRequest): Promise<NextResponse> {
  const b = await body(req);
  const code = typeof b.linkCode === "string" ? b.linkCode : "";
  if (!/^[A-Za-z0-9-]{8,12}$/.test(code)) return reply(req, { error: "code" }, 400);
  const anonKey = await anonKeyFrom(b);
  if (!anonKey) return reply(req, { error: "login" }, 401);
  const r = await linkTossAccount(anonKey, code);
  if ("error" in r) return reply(req, r, 400);
  track("account_link", { source: "toss" });
  return reply(req, r);
}

// ── 읽기 ───────────────────────────────────────

async function home(req: NextRequest, s: Session): Promise<NextResponse> {
  const t = makeT(s.profile.locale);
  const people = await listPeople(s);
  const today = todayFor(s.profile);
  const events = eventsFor(people, today, 60).map((e) => ({ contactId: e.contactId, title: eventName(e, t, s.profile.locale), date: e.date, daysUntil: e.daysUntil, kind: e.kind }));
  const template = tossReminderTemplate();
  const out: THome = { today, events, people: people.map(toPerson), ai: aiConfigured(), reminder: template ? { template, on: s.profile.tossReminders } : null };
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
    me: s.profile.displayName ?? "",
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

// ── 물어보기 ───────────────────────────────────

const ASK_NAME = /^[^<>{}]{1,20}$/;

/** 물어보기 링크 만들기(내 주소록 사람에게). 처음이면 상대에게 보일 내 이름(from)을 같이 받아 프로필에 둔다 */
async function ask(req: NextRequest, s: Session, id: string): Promise<NextResponse> {
  if (!UUID.test(id)) return reply(req, { error: "not_found" }, 404);
  const b = await body(req);
  const sections = sanitizeSections(b.sections);
  if (!sections.length) return reply(req, { error: "pickOne" }, 400);
  const message = String(b.message ?? "").trim().slice(0, 300);
  let from = s.profile.displayName ?? "";
  const asked = String(b.from ?? "").replace(/\s+/g, " ").trim();
  if (asked && asked !== from) {
    if (!ASK_NAME.test(asked)) return reply(req, { error: "from" }, 400);
    await s.tx((q) => q("update profiles set display_name = $2 where id = $1", [s.user.id, asked]));
    from = asked;
  }
  if (!from) return reply(req, { error: "from" }, 400);
  try {
    const { token } = await createAsk(s, { to: id, sections, message });
    track("ask_create", { userId: s.user.id, source: "toss" });
    const out: TAskCreated = { token, text: translate(s.profile.locale, "request.text", { from }) };
    return reply(req, out);
  } catch {
    return reply(req, { error: "common" }, 500);
  }
}

/** 물어보기 링크 열기(로그인 없이). 토큰이 맞는 한 줄만 */
async function askOpen(req: NextRequest, token: string): Promise<NextResponse> {
  const { row, prefill } = await readAsk(token);
  const out: TAskOpen = {
    state: row.state,
    from: row.inviter_name?.trim() || translate("ko", "app.name"),
    message: row.message ?? "",
    sections: row.state === "active" ? sanitizeSections(row.sections).sort((a, b) => Number(!prefill[a]) - Number(!prefill[b])) : [],
    prefill,
  };
  return reply(req, out);
}

/** 답하기(로그인 없이). 토스에서 로그인돼 있어도 물어본 사람 주소록에 잇지 않는다(토스 계정은 이름·얼굴이 없다). 내 링크에는 못 답한다 */
async function askAnswer(req: NextRequest, token: string): Promise<NextResponse> {
  const b = await body(req);
  const s = await getSession();
  if (s) {
    const { row } = await readAsk(token);
    if (row.inviter_id === s.user.id) return reply(req, { sent: false, error: "self" }, 400);
  }
  const r = await answerAsk(token, b.data, b.consent === true, null);
  if (!r.ok) return reply(req, { sent: false, error: r.error }, r.error === "common" ? 500 : 400);
  await notifyUserT(r.inviter, (locale) => ({
    title: r.name ? translate(locale, "notif.answered", { name: r.name }) : translate(locale, "notif.answeredAnon"),
    body: translate(locale, "notif.open"),
    path: `/people/${r.contactId}`,
  }));
  track("ask_answer", { userId: s?.user.id ?? null, source: "toss" });
  return reply(req, { sent: true, error: null });
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

/** 생일·기념일 토스 알림 켜기·끄기. 켜기는 미니앱이 토스 알림 동의를 받은 뒤에만 부른다 */
async function reminder(req: NextRequest, s: Session): Promise<NextResponse> {
  const b = await body(req);
  if (typeof b.on !== "boolean") return reply(req, { error: "bad" }, 400);
  await s.tx((q) => q("update profiles set toss_reminders = $2 where id = $1", [s.user.id, b.on]));
  return reply(req, { on: b.on });
}

/** 계정과 기록 모두 지우기 */
async function deleteAccount(req: NextRequest, s: Session): Promise<NextResponse> {
  await s.tx((q) => q("select delete_my_account()"));
  track("account_delete", { source: "toss" });
  return reply(req, { ok: true });
}

// ── 앱 화면 그대로(화면 데이터·서버 액션) ─────────────

/** 앱 화면 하나의 데이터(웹 페이지와 같은 loader). redirect·notFound는 값으로 */
async function page(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path.startsWith("/") || path.length > 600) return reply(req, { notFound: true }, 400);
  return reply(req, await loadPage(path));
}

/** 앱 화면 조각이 부르는 서버 액션. 인자·돌려주는 값은 JSON(FormData는 {"$form": …}) */
async function action(req: NextRequest, moduleName: string, name: string): Promise<NextResponse> {
  const b = await body(req);
  const args = Array.isArray(b.args) ? b.args : [];
  const out = await runAction(moduleName, name, args);
  return reply(req, out, out.ok || !("error" in out) ? 200 : 404);
}

// ── 길 나누기 ───────────────────────────────────

async function route(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const path = (await ctx.params).path;
  const m = req.method;
  const at = (...p: string[]) => path.length === p.length && p.every((x, i) => x === "*" || x === path[i]);
  if (m === "POST" && at("session")) return signIn(req);
  if (m === "POST" && at("link")) return link(req);
  // 물어보기 답하기는 로그인 없이(받은 사람은 아직 계정이 없을 수 있다)
  if (m === "GET" && at("r", "*")) return askOpen(req, path[1]);
  if (m === "POST" && at("r", "*")) return askAnswer(req, path[1]);
  const s = await getSession();
  if (!s) return reply(req, { error: "login" }, 401);
  if (m === "GET" && at("page")) return page(req);
  if (m === "POST" && at("action", "*", "*")) return action(req, path[1], path[2]);
  if (m === "GET" && at("home")) return home(req, s);
  if (m === "POST" && at("people")) return addPerson(req, s);
  if (m === "GET" && at("people", "*")) return person(req, s, path[1]);
  if (m === "PUT" && at("people", "*")) return renamePerson(req, s, path[1]);
  if (m === "DELETE" && at("people", "*")) return removePerson(req, s, path[1]);
  if (m === "PUT" && at("people", "*", "sections", "*")) return saveSection(req, s, path[1], path[3]);
  if (m === "GET" && at("people", "*", "gifts")) return gifts(req, s, path[1]);
  if (m === "POST" && at("people", "*", "ask")) return ask(req, s, path[1]);
  if (m === "POST" && at("capture")) return capture(req);
  if (m === "POST" && at("capture", "undo")) return undo(req);
  if (m === "POST" && at("transcribe")) return transcribe(req, s);
  if (m === "POST" && at("reminder")) return reminder(req, s);
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
