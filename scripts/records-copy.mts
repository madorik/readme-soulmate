// 0012와 0013 사이에 한 번 돌린다: 공유받던 리드미(허락이 살아 있는 항목)와 앱 없이 받은 답(손님 카드)을
// 그 사람의 내 기록(contact_cards)으로 복사한다. 암호화 범위(AAD)가 card/guest → contact로 바뀌어서 서버 키로 풀고 다시 잠근다.
// 이미 기록이 있는 칸은 건드리지 않는다(여러 번 돌려도 된다). 끊긴 공유는 빈 기록으로 둔다.
//   로컬: pnpm db:records-copy   운영: node --env-file=<vercel env 파일> … (DATABASE_URL_UNPOOLED·DATA_ENCRYPTION_KEY 필요)
import pg from "pg";
import { isSection, sanitizeSection, SENSITIVE_SECTIONS, type Section } from "../packages/core/src/index.ts";
import { aad, openWith, sealWith } from "../apps/web/lib/crypto-core.ts";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
if (!url || key.length !== 32) {
  console.error("DATABASE_URL과 DATA_ENCRYPTION_KEY(32바이트 base64)가 필요해요");
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });

type Contact = { id: string; user_id: string; person_id: string | null; guest_card_id: string | null };

function reseal(section: Section, payload: unknown, from: string, userId: string, contactId: string): unknown | null {
  const data = openWith(key, payload, from);
  if (data == null) return null;
  return sealWith(key, sanitizeSection(section, data), aad.contact(userId, contactId, section), SENSITIVE_SECTIONS.includes(section));
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));

await client.connect();
try {
  const has = await client.query("select 1 from information_schema.columns where table_name = 'contact_cards' and column_name = 'answered'");
  if (!has.rowCount) throw new Error("0012 마이그레이션을 먼저 적용하세요(pnpm db:migrate)");
  const grantsLeft = await client.query("select 1 from information_schema.tables where table_name = 'grants'");
  if (!grantsLeft.rowCount) {
    console.log("이미 0013까지 적용됨: 복사할 것이 없어요");
    process.exit(0);
  }

  const contacts = (
    await client.query<Contact>(
      `select c.id, c.user_id, c.person_id, c.guest_card_id from contacts c
        where (c.person_id is not null or c.guest_card_id is not null)
          and not exists (select 1 from contact_cards cc where cc.contact_id = c.id)`,
    )
  ).rows;

  let copied = 0;
  for (const c of contacts) {
    const sections: Record<string, unknown> = {};
    const answered: Record<string, string> = {};

    const grant = c.person_id
      ? (await client.query<{ sections: string[] }>("select sections from grants where owner_id = $1 and viewer_id = $2 and revoked_at is null", [c.person_id, c.user_id])).rows[0]
      : undefined;
    if (c.person_id && grant) {
      const rows = (await client.query<{ section: string; payload: unknown; updated_at: Date }>("select section, payload, updated_at from card_sections where owner_id = $1", [c.person_id])).rows;
      for (const r of rows) {
        if (!isSection(r.section) || !grant.sections.includes(r.section)) continue;
        const sealed = reseal(r.section, r.payload, aad.card(c.person_id, r.section), c.user_id, c.id);
        if (sealed) {
          sections[r.section] = sealed;
          answered[r.section] = iso(r.updated_at);
        }
      }
    } else if (c.guest_card_id) {
      const g = (await client.query<{ invite_id: string | null; sections: Record<string, unknown>; updated_at: Date }>("select invite_id, sections, updated_at from guest_cards where id = $1", [c.guest_card_id])).rows[0];
      if (g?.invite_id) {
        for (const [section, payload] of Object.entries(g.sections ?? {})) {
          if (!isSection(section)) continue;
          const sealed = reseal(section, payload, aad.guest(g.invite_id, section), c.user_id, c.id);
          if (sealed) {
            sections[section] = sealed;
            answered[section] = iso(g.updated_at);
          }
        }
      }
    }

    await client.query(
      "insert into contact_cards (contact_id, author_id, sections, answered) values ($1, $2, $3, $4) on conflict (contact_id) do nothing",
      [c.id, c.user_id, JSON.stringify(sections), JSON.stringify(answered)],
    );
    copied++;
  }
  console.log(`기록 ${copied}개 만듦`);
} finally {
  await client.end();
}
