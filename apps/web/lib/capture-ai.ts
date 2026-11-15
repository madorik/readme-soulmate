// 말로 적기 AI 부분 중 서버 키와 상관없는 것(요청 몸·응답 풀기). 서버 전용 표시가 없어 시험 스크립트에서도 불러 쓴다
import { CAPTURE_FIELDS, CAPTURE_TARGETS, type CaptureValue, type DateSpec, type Locale } from "@readme/core";

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
- NEGATIVE preferences (doesn't like, avoids, can't, 싫어해, 안 좋아해, 별로, 못 먹어, 안 마셔) must NEVER go to a "likes" field (taste.likes, taste.dessert, taste.drinks, favorites.*, culture.* text, life.*). Use safety.dislikes if the food is listed; for gifts they don't want use gifts.skip; otherwise safety.allergyNote (food or drink) or memo (anything else), written as the negative fact (e.g. "단 거 별로 안 좋아함").
- Things they want → gifts.wishlist; gifts to avoid → gifts.skip.
- Birthday → dates.birthday with date (lunar if 음력/lunar). Other days → dates.anniversary with label.
- Shoe size in mm (e.g. 270), ring size number (호).
- Put a value only in a field whose meaning matches it: favorites.animal only for animals, gifts.flowers for flowers and plants, favorites.idol for singers and celebrities, culture.* for movies, dramas, shows, music and books, life.travel for places, life.hobbies for activities. Never use a field just because it is a "favorite" slot.
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

/** OpenAI Responses API 요청 몸 */
export function captureRequest(text: string, people: CapturePerson[], locale: Locale, model = "gpt-6-luna", effort: "none" | "low" | "medium" | "high" = "medium") {
  return {
      model,
      reasoning: { effort },
      instructions: INSTRUCTIONS,
      input: `LANGUAGE: ${locale}\nPEOPLE: ${JSON.stringify(people)}\nNOTE: ${text}`,
      text: { format: { type: "json_schema", name: "capture", strict: true, schema: SCHEMA } },
      store: false,
    };
}

/** 응답에서 항목을 꺼내 모양을 맞춘다 */
export function parseCapture(body: unknown): CaptureItem[] {
  const parsed = JSON.parse(outputText(body) || "{}") as { items?: unknown };
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
