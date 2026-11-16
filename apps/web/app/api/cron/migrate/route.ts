import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

// 운영 DB 마이그레이션(scripts/migrate.mjs와 같은 일): db/migrations/*.sql 중 안 한 것을 이름 순서로 하나씩(파일마다 트랜잭션).
// 개발 자리에서 운영 DB 포트(5432)가 막힐 때 배포된 서버에서 돌린다. CRON_SECRET이 맞을 때만(POST).
// 이미 저장소에 있는 파일만 돌리므로 비밀값이 새도 할 수 있는 건 '아직 안 한 마이그레이션 적용'뿐이다.

export const dynamic = "force-dynamic";

// 빌드가 이 경로를 따라 프로젝트 전체를 싣지 않게(turbopackIgnore), SQL 파일은 next.config의 outputFileTracingIncludes로 싣는다
function migrationsDir(): string | null {
  const root = /* turbopackIgnore: true */ process.cwd();
  for (const dir of [join(/* turbopackIgnore: true */ root, "../../db/migrations"), join(/* turbopackIgnore: true */ root, "db/migrations")]) {
    try {
      readdirSync(/* turbopackIgnore: true */ dir);
      return dir;
    } catch {
      /* 다음 자리 */
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dir = migrationsDir();
  if (!dir) return NextResponse.json({ error: "no_migrations" }, { status: 500 });
  const files = readdirSync(/* turbopackIgnore: true */ dir).filter((f) => f.endsWith(".sql")).sort();
  const client = await pool().connect();
  const applied: string[] = [];
  try {
    await client.query("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const done = new Set((await client.query<{ name: string }>("select name from public.schema_migrations")).rows.map((r) => r.name));
    for (const file of files) {
      if (done.has(file)) continue;
      await client.query("begin");
      try {
        await client.query(readFileSync(join(/* turbopackIgnore: true */ dir, file), "utf8"));
        await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        applied.push(file);
      } catch (e) {
        await client.query("rollback").catch(() => {});
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e), failed: file, applied }, { status: 500 });
      }
    }
  } finally {
    client.release();
  }
  return NextResponse.json({ applied, total: files.length });
}
