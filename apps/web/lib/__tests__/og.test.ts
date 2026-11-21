import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { OG_IMAGE } from "../og";

// pnpm test는 저장소 루트에서도, apps/web에서도 돈다
const web = existsSync(resolve(process.cwd(), "apps/web/proxy.ts")) ? resolve(process.cwd(), "apps/web") : process.cwd();

// 링크 미리보기 그림: 파일이 있고, 로그인 없이 가져갈 수 있어야 한다(미리보기 로봇은 로그인하지 못한다)
test("링크 미리보기 그림: public에 파일이 있고 1200×630 PNG다", () => {
  const file = resolve(web, "public", OG_IMAGE.url.slice(1));
  assert.ok(existsSync(file), file);
  const png = readFileSync(file);
  assert.equal(png.subarray(1, 4).toString("latin1"), "PNG");
  assert.equal(png.readUInt32BE(16), OG_IMAGE.width);
  assert.equal(png.readUInt32BE(20), OG_IMAGE.height);
});

test("링크 미리보기 그림 주소는 proxy가 로그인으로 돌려보내지 않는다(matcher에서 빠져 있다)", () => {
  const src = readFileSync(resolve(web, "proxy.ts"), "utf8");
  const literal = /matcher:\s*\[("(?:[^"\\]|\\.)*")\]/.exec(src)?.[1];
  assert.ok(literal, "matcher를 못 찾았다");
  const matcher = new RegExp(`^${JSON.parse(literal) as string}$`);
  // matcher에 걸리면 proxy가 돈다(세션이 없으면 시작 화면으로 보낸다): 그림 주소는 걸리면 안 된다
  assert.equal(matcher.test(OG_IMAGE.url), false, `${OG_IMAGE.url}가 proxy에 걸린다`);
  assert.equal(matcher.test("/og.png"), false);
  assert.equal(matcher.test("/og-v3.png"), false, "다음 이름도 미리 빠져 있다");
  // 반대로 개인 화면은 걸린다
  assert.equal(matcher.test("/home"), true);
  assert.equal(matcher.test("/og-notes"), true, "og로 시작해도 그림이 아니면 걸린다");
});
