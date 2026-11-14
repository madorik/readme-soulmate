// 로컬 개발용 apps/web/.env.local을 만든다. `pnpm db:start && pnpm db:migrate` 다음에 `pnpm env:local`.
// 비밀값(로그인 세션 서명, 암호화 키, 크론 비밀값)은 처음 한 번만 만들어 그대로 둔다. 구글·애플 키는 손으로 넣은 값을 지킨다.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve("apps/web/.env.local");

const previous = existsSync(target)
  ? Object.fromEntries(
      readFileSync(target, "utf8")
        .split("\n")
        .map((l) => /^([A-Z_0-9]+)=(.*)$/.exec(l.trim()))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    )
  : {};

const keep = (name, make = () => "") => previous[name] || make();

const values = {
  NEXT_PUBLIC_SITE_URL: keep("NEXT_PUBLIC_SITE_URL", () => "http://localhost:3200"),
  // 로컬 도커 Postgres(pnpm db:start). 운영은 Vercel에 넣어 둔 Supabase(서울) 주소를 쓴다
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:55433/readme",
  BETTER_AUTH_SECRET: keep("BETTER_AUTH_SECRET", () => randomBytes(32).toString("base64")),
  // 알레르기·사이즈·메모 암호화 키(32바이트, base64). 바꾸면 이미 저장된 값을 못 읽는다
  DATA_ENCRYPTION_KEY: keep("DATA_ENCRYPTION_KEY", () => randomBytes(32).toString("base64")),
  CRON_SECRET: keep("CRON_SECRET", () => randomBytes(24).toString("hex")),
  // 비워 두면 그 로그인 버튼이 안 보인다(데모 로그인은 항상 있다)
  GOOGLE_CLIENT_ID: keep("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: keep("GOOGLE_CLIENT_SECRET"),
  APPLE_CLIENT_ID: keep("APPLE_CLIENT_ID"),
  APPLE_CLIENT_SECRET: keep("APPLE_CLIENT_SECRET"),
  NEXT_PUBLIC_KAKAO_JS_KEY: keep("NEXT_PUBLIC_KAKAO_JS_KEY"),
};

const body = Object.entries(values)
  .map(([k, v]) => `${k}=${v ?? ""}`)
  .join("\n");
writeFileSync(target, `# pnpm env:local 로 만든 파일. 커밋하지 않는다\n${body}\n`);
console.log(`wrote ${target}`);
