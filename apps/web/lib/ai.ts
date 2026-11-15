import "server-only";
import { CAPTURE_FIELDS, CAPTURE_TARGETS, type CaptureValue, type DateSpec, type Locale } from "@readme/core";

// 말로 적기: 한 문장을 (누구, 어느 칸, 값) 여러 개로 나눈다. OpenAI Responses API + JSON 스키마(구조화 출력).
// 키(OPENAI_API_KEY)가 없으면 기능을 숨긴다. 모델은 OPENAI_MODEL(기본 gpt-6-luna), 주소는 OPENAI_BASE_URL(기본 api.openai.com/v1, 시험용 가짜 서버로 바꿀 수 있다).

export function aiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface CapturePerson {
  id: string;
  name: string;
  nickname: string;
}

export interface CaptureItem extends CaptureValue {
  who: { type: "me" | "existing" | "new"; contactId: string | null; name: string | null };
  target: (typeof CAPTURE_TARGETS)[number];
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
        required: ["who", "target", "text", "codes", "number", "date", "label"],
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
    const codes = f.catalog ? ` codes: ${f.catalog.map((c) => `${c.code}=${c.label.ko}`).join(", ")}` : "";
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

target: the most specific field from FIELDS. Rules:
- codes kinds: use only listed codes. If the thing is not in the list, use a text/list field that fits, otherwise memo.
- Foods they like → taste.likes. Coffee/tea/drinks they like lately → taste.drinks. Desserts/snacks → taste.dessert.
- Food allergies in the list → safety.allergens; foods they won't eat in the list → safety.dislikes. Other allergies or avoidances (cats, pollen, a food not in the lists) → safety.allergyNote as short text.
- Things they want → gifts.wishlist; gifts to avoid → gifts.skip.
- Birthday → dates.birthday with date (lunar if 음력/lunar). Other days → dates.anniversary with label.
- Shoe size in mm (e.g. 270), ring size number (호).
- Anything that fits no field → memo with a short note in the speaker's language.
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

/** 문장 하나를 나눈다. 실패하면 throw */
export async function classifyCapture(text: string, people: CapturePerson[], locale: Locale): Promise<CaptureItem[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ai_off");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      reasoning: { effort: "low" },
      instructions: INSTRUCTIONS,
      input: `LANGUAGE: ${locale}\nPEOPLE: ${JSON.stringify(people)}\nNOTE: ${text}`,
      text: { format: { type: "json_schema", name: "capture", strict: true, schema: SCHEMA } },
      store: false,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`ai_http_${res.status}`);
  const parsed = JSON.parse(outputText(await res.json())) as { items?: unknown };
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items.slice(0, 12).map((raw) => {
    const r = raw as Record<string, unknown>;
    const who = (r.who ?? {}) as Record<string, unknown>;
    const d = r.date as Record<string, unknown> | null;
    const date: DateSpec | null =
      d && typeof d.month === "number" && typeof d.day === "number"
        ? { calendar: d.calendar === "lunar" ? "lunar" : "solar", month: d.month, day: d.day, ...(typeof d.year === "number" ? { year: d.year } : {}) }
        : null;
    return {
      who: {
        type: who.type === "me" || who.type === "existing" ? who.type : "new",
        contactId: typeof who.contactId === "string" ? who.contactId : null,
        name: typeof who.name === "string" ? who.name.slice(0, 40) : null,
      },
      target: (CAPTURE_TARGETS as readonly string[]).includes(String(r.target)) ? (r.target as CaptureItem["target"]) : "memo",
      text: typeof r.text === "string" ? r.text.slice(0, 200) : null,
      codes: Array.isArray(r.codes) ? r.codes.filter((c): c is string => typeof c === "string") : null,
      number: typeof r.number === "number" ? r.number : null,
      date,
      label: typeof r.label === "string" ? r.label.slice(0, 40) : null,
    };
  });
}
