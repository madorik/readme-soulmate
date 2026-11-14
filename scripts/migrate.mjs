// db/migrations/*.sql을 이름 순서로 한 번씩 적용한다. 적용한 파일은 schema_migrations에 남긴다.
//   DATABASE_URL=... node scripts/migrate.mjs        (로컬은 pnpm db:migrate, 운영은 Supabase 세션 풀러(5432) 주소로)
//   --reset : 로컬 전용. public·auth 스키마를 지우고 처음부터(운영 주소면 거부)
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL이 없어요(apps/web/.env.local 또는 환경 변수)");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (reset && !local) {
  console.error("--reset은 로컬 DB에서만 돼요");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  if (reset) {
    await client.query("drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists app cascade; create schema public; grant all on schema public to public;");
    console.log("reset");
  }
  await client.query("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));
  const dir = resolve(import.meta.dirname, "../db/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    await client.query("begin");
    try {
      await client.query(readFileSync(resolve(dir, file), "utf8"));
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
} finally {
  await client.end();
}
