// 말로 적기 AI 부분 중 서버 키와 상관없는 것(요청 몸·응답 풀기). 서버 전용 표시가 없어 시험 스크립트에서도 불러 쓴다
import { CAPTURE_FIELDS, CAPTURE_TARGETS, SPEC_YEAR_MIN, SPICY_LEVELS, clip, isValidSpec, type CaptureOp, type CaptureValue, type DateSpec, type Locale } from "@readme/core";

export interface CapturePerson {
  id: string;
  name: string;
  nickname: string;
}

export interface CaptureItem extends CaptureValue {
  who: { type: "me" | "existing" | "new"; contactId: string | null; name: string | null };
  target: (typeof CAPTURE_TARGETS)[number];
  op: CaptureOp;
}

const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["who", "op", "target", "text", "codes", "number", "date", "label"],
        properties: {
          who: {
            type: "object",
            additionalProperties: false,
            required: ["type", "contactId", "name"],
            properties: {
              type: { type: "string", enum: ["me", "existing", "new"] },
              contactId: { type: ["string", "null"] },
              name: { type: ["string", "null"] },
            },
          },
          op: { type: "string", enum: ["add", "replace", "remove"] },
          target: { type: "string", enum: [...CAPTURE_TARGETS] },
          text: { type: ["string", "null"] },
          codes: nullable({ type: "array", items: { type: "string" } }),
          number: { type: ["number", "null"] },
          date: nullable({
            type: "object",
            additionalProperties: false,
            required: ["calendar", "month", "day", "year"],
            properties: {
              calendar: { type: "string", enum: ["solar", "lunar"] },
              month: { type: "integer" },
              day: { type: "integer" },
              year: { type: ["integer", "null"] },
            },
          }),
          label: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

function fieldGuide(): string {
  return CAPTURE_FIELDS.map((f) => {
    const codes = f.catalog ? ` codes: ${f.catalog.map((c) => `${c.code}=${c.label.ko}`).join(", ")}${f.kind === "tags" ? " (or text for a food not listed)" : ""}` : "";
    const range = f.range ? ` range ${f.range[0]}-${f.range[1]}` : "";
    return `- ${f.key} (${f.kind}) ${f.label.ko}${range}${codes}`;
  }).join("\n");
}

const INSTRUCTIONS = `You turn one short spoken note about people into structured facts for a Korean app that keeps notes about the user's close people.
Split the note into facts. Each fact is one item.

who:
- "me" if the speaker talks about themself (나는, 내가, I).
- "existing" with contactId from PEOPLE when the person matches by name, nickname or an obvious synonym (와이프/아내/집사람/wife, 남편/신랑, 엄마/어머니, 아빠/아버지, 할머니, 장모님 …). Never invent an id.
- "new" with name = how the speaker calls them (e.g. "처제", "김 과장님") when nobody matches.
- ABOUT (when given): the note was written on that person's page. Facts that name no other person are about ABOUT ("existing" with ABOUT.id), even with no subject (e.g. "해바라기 좋아함"). 나/내가 still means "me".
- MENTIONED (when given): people the speaker tagged with @ in the note (the @ is already removed). Each is certainly that contactId. Facts that follow a tagged name belong to that person ("existing" with its id) until another person is named.

target: the most specific field from FIELDS. Rules:
- codes kinds: use only listed codes. If the thing is not in the list, use a text/list field that fits, otherwise memo.
- tags kinds (safety.allergens, safety.dislikes): use the listed code when the food is in the list; when it is not, put the food name in text (short, e.g. "국밥", "고등어") and it is added as a new item. Never use memo or safety.allergyNote for a food that fits here.
- Foods they like → taste.likes. Coffee/tea/drinks they like lately → taste.drinks. Desserts/snacks → taste.dessert.
- Pets the person keeps (강아지, 고양이 … with a name like 콩이) → pets.pet with label = the pet's name if said, codes = kind, text = breed only (e.g. "말티즈"). Treats, food or toys the PET likes → pets.treats with label = the pet's name, text = comma list (never taste.dessert or taste.likes). Other facts about the pet (age, personality, health) → pets.note with label = the pet's name. favorites.animal is only an animal the person likes, not a pet they keep.
- Food allergies → safety.allergens. Foods or drinks they won't, can't or don't eat (안 먹어, 못 먹어, 안 드셔, 싫어해, 별로) → safety.dislikes. A food not in the list is still one of these, added by name in text. Only non-food allergies (cats, pollen, medicine) or extra context that is not a single food (e.g. "국물에 들어간 것도 안 돼요") → safety.allergyNote as short text.
- NEGATIVE preferences (doesn't like, avoids, can't, 싫어해, 안 좋아해, 별로, 못 먹어, 안 마셔) must NEVER be added to a "likes" field (taste.likes, taste.dessert, taste.drinks, favorites.*, culture.* text, life.*). Foods and drinks go to safety.dislikes (listed code, or the food name as text, e.g. "단 것"); gifts they don't want go to gifts.skip; anything else goes to memo, written as the negative fact.
- Gift ideas → gifts.wishlist: things they want, and gifts the speaker plans to give them (사 줘야지, 선물해야지, 사 주고 싶다, 다음에 ~ 해 줘야지). Gifts to avoid → gifts.skip.
- Scent and flowers they like → favorites.scent, favorites.flowers. Mood or atmosphere they like (조용한, 아늑한, 활기찬 …) → favorites.vibes. Places they like to go or hang out (바다, 한옥 카페, 성수동) → favorites.places. Places they want to travel to someday → life.travel.
- Birthday → dates.birthday with date (lunar if 음력/lunar). Other days → dates.anniversary with label.
- Shoe size in mm (e.g. 270), ring size number (호).
- How much spice they can take (매운 거 잘 먹어/못 먹어) → taste.spicy number: ${SPICY_LEVELS.map((l, i) => `${i}=${l.ko}`).join(", ")}.
- Put a value only in a field whose meaning matches it: favorites.animal only for animals they like (not pets they keep), favorites.flowers for flowers and plants, favorites.idol for singers and celebrities, culture.* for movies, dramas, shows, music and books, favorites.places or life.travel for places, life.hobbies for activities. Never use a field just because it is a "favorite" slot.
- Anything that fits no field → memo with a short note in the speaker's language.
op: what to do with the field (the speaker may add, correct or delete what was kept):
- "add" (default): a new fact.
- "replace": the value changed or the speaker corrects it (바뀌었어, 이제는 ~야, ~가 아니라 ~야, ~로 바꿔/고쳐 줘, changed to). The value replaces everything in that field. When only one item of a list changes ("짜장면 말고 짬뽕 좋아해"), emit "remove" for the old item and "add" for the new one instead.
- "remove": a kept fact is wrong or no longer true, or the speaker asks to delete it (아니래, 아니야, 지워 줘, 빼 줘, 이제 안 해, 이제 안 좋아해, 질렸대, no longer). Put the thing to remove as the value (text or codes, short). Leave the value null to clear the whole field (e.g. "알레르기 다 지워 줘", "생일 지워 줘"). For something they no longer like, remove it from the matching likes field; do not also add a negative fact unless the speaker states one. When they now eat or can have something they used to avoid (이제 ~ 드신대, 이제 먹어, 이제 괜찮대, 알레르기 나았대), remove it from safety.dislikes or safety.allergens; add it to a likes field only if the speaker says they like it.
- memo is only for "add".
text: just the value, short (e.g. "바닐라라떼"), in the speaker's language. Do not copy the whole sentence. Do not guess values that were not said.
Fill only the value properties the target needs; set the rest to null.

FIELDS:
${fieldGuide()}`;

function outputText(body: unknown): string {
  const out = (body as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] })?.output ?? [];
  for (const item of out) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text" && typeof c.text === "string") return c.text;
  }
  return "";
}

/** 모델에 보내는 사람 수 위쪽 한도(프롬프트가 한없이 길어지지 않게) */
export const PEOPLE_MAX = 300;

/** 모델에는 id·이름·부름만 보낸다(다른 값이 딸려 가지 않게) */
const slim = (p: CapturePerson): CapturePerson => ({ id: p.id, name: clip(p.name, 40), nickname: clip(p.nickname, 40) });

/** 모델에 보낼 사람 목록: 지금 쓰는 사람(ABOUT)과 @로 짚은 사람(MENTIONED)을 맨 앞에 두고 PEOPLE_MAX명까지 */
export function capturePeople(people: CapturePerson[], about: CapturePerson | null = null, mentioned: CapturePerson[] = [], max = PEOPLE_MAX): CapturePerson[] {
  const lead = [...(about ? [about] : []), ...mentioned];
  const picked = new Set<string>();
  const out: CapturePerson[] = [];
  for (const p of [...lead, ...people]) {
    if (picked.has(p.id)) continue;
    picked.add(p.id);
    out.push(slim(p));
    if (out.length >= max) break;
  }
  return out;
}

/** OpenAI Responses API 요청 몸 */
export function captureRequest(
  text: string,
  people: CapturePerson[],
  locale: Locale,
  model = "gpt-6-luna",
  effort: "none" | "low" | "medium" | "high" = "medium",
  about: CapturePerson | null = null,
  mentioned: CapturePerson[] = [],
) {
  return {
      model,
      reasoning: { effort },
      instructions: INSTRUCTIONS,
      input: `LANGUAGE: ${locale}\nPEOPLE: ${JSON.stringify(capturePeople(people, about, mentioned))}\n${about ? `ABOUT: ${JSON.stringify(slim(about))}\n` : ""}${mentioned.length ? `MENTIONED: ${JSON.stringify(mentioned.map(slim))}\n` : ""}NOTE: ${text}`,
      text: { format: { type: "json_schema", name: "capture", strict: true, schema: SCHEMA } },
      store: false,
    };
}

/**
 * AI가 준 날짜를 다듬는다. 두 자리 연도는 풀고(올해 두 자리 이하는 2000년대, 아니면 1900년대: 90 → 1990, 5 → 2005),
 * 없는 날짜(4월 31일, 13월)는 버린다. 연도만 이상하면(0, 세 자리, 미래, 평년 2월 29일의 해) 연도만 버리고 월·일은 남긴다
 */
export function cleanDate(d: unknown, now: Date = new Date()): DateSpec | null {
  if (!d || typeof d !== "object") return null;
  const r = d as Record<string, unknown>;
  if (typeof r.month !== "number" || typeof r.day !== "number") return null;
  const thisYear = now.getFullYear();
  let year: number | null = typeof r.year === "number" && Number.isInteger(r.year) && r.year > 0 ? r.year : null;
  if (year !== null && year < 100) year += year <= thisYear % 100 ? 2000 : 1900;
  if (year !== null && (year < SPEC_YEAR_MIN || year > thisYear)) year = null;
  const base: DateSpec = { calendar: r.calendar === "lunar" ? "lunar" : "solar", month: r.month, day: r.day };
  const withYear = year !== null ? { ...base, year } : null;
  if (withYear && isValidSpec(withYear)) return withYear;
  return isValidSpec(base) ? base : null;
}

/** 항목 하나의 모양을 맞춘다(AI 응답이든 화면에서 고쳐 되돌려 보낸 것이든) */
function cleanItem(raw: unknown, now: Date): CaptureItem {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const who = (r.who && typeof r.who === "object" ? r.who : {}) as Record<string, unknown>;
  const date = cleanDate(r.date, now);
  return {
    who: {
      type: who.type === "me" || who.type === "existing" ? who.type : "new",
      contactId: typeof who.contactId === "string" ? who.contactId : null,
      name: typeof who.name === "string" ? clip(who.name, 40) : null,
    },
    target: (CAPTURE_TARGETS as readonly string[]).includes(String(r.target)) ? (r.target as CaptureItem["target"]) : "memo",
    op: r.op === "replace" || r.op === "remove" ? r.op : "add",
    text: typeof r.text === "string" ? clip(r.text, 200) : null,
    codes: Array.isArray(r.codes) ? r.codes.filter((c): c is string => typeof c === "string") : null,
    number: typeof r.number === "number" ? r.number : null,
    date,
    label: typeof r.label === "string" ? clip(r.label, 40) : null,
  };
}

/** 항목 목록(최대 12개)의 모양을 맞춘다. 배열이 아니면 빈 목록 */
export function cleanCaptureItems(items: unknown, now: Date = new Date()): CaptureItem[] {
  return Array.isArray(items) ? items.slice(0, 12).map((raw) => cleanItem(raw, now)) : [];
}

/** 응답에서 항목을 꺼내 모양을 맞춘다 */
export function parseCapture(body: unknown, now: Date = new Date()): CaptureItem[] {
  const text = outputText(body);
  // 길이 한도에 걸려 끊긴 응답은 '이해 못 함'이 아니라 실패다(다시 해 보면 된다)
  if (!text && (body as { status?: unknown } | null)?.status === "incomplete") throw new Error("ai_incomplete");
  const parsed = JSON.parse(text || "{}") as { items?: unknown };
  return cleanCaptureItems(parsed.items, now);
}
