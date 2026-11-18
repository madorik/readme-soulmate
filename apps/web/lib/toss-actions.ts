import "server-only";
import * as account from "@/app/actions/account";
import * as auth from "@/app/actions/auth";
import * as capture from "@/app/actions/capture";
import * as card from "@/app/actions/card";
import * as people from "@/app/actions/people";
import * as request from "@/app/actions/request";
import { caught } from "./pages";
import { tossSignOut } from "./toss";

// 토스 미니앱이 앱 화면 조각의 서버 액션을 부르는 길(/api/t/action/<모듈>/<이름>).
// 미니앱 번들에서는 '@/app/actions/<모듈>'이 이 길을 부르는 함수로 바뀐다(apps/toss/vite.config.ts). 세션은 Bearer 토큰.
// 데모 만들기는 막고, 로그아웃은 토스용(연결 끊기)으로 바꾼다
type Fn = (...args: unknown[]) => Promise<unknown>;
const MODULES: Record<string, Record<string, unknown>> = {
  account,
  capture,
  card,
  people,
  request,
  auth: { setLocale: auth.setLocale, rememberSystemLocale: auth.rememberSystemLocale, signOut: tossSignOut },
};

/** 미니앱이 보낸 인자: FormData는 {"$form": [[이름, 값], …]}로 온다 */
function decode(arg: unknown): unknown {
  if (arg && typeof arg === "object" && Array.isArray((arg as { $form?: unknown }).$form)) {
    const f = new FormData();
    for (const pair of (arg as { $form: unknown[] }).$form) {
      if (Array.isArray(pair) && typeof pair[0] === "string") f.append(pair[0], String(pair[1] ?? ""));
    }
    return f;
  }
  return arg;
}

export type ActionResult = { ok: true; value: unknown } | { ok: false; redirect: string } | { ok: false; notFound: true } | { ok: false; error: "unknown_action" };

export async function runAction(moduleName: string, name: string, args: unknown[]): Promise<ActionResult> {
  const mod = Object.hasOwn(MODULES, moduleName) ? MODULES[moduleName] : undefined;
  const fn = mod && Object.hasOwn(mod, name) && typeof mod[name] === "function" ? (mod[name] as Fn) : null;
  if (!fn) return { ok: false, error: "unknown_action" };
  try {
    return { ok: true, value: (await fn(...args.map(decode))) ?? null };
  } catch (e) {
    const c = caught(e);
    if (c && "redirect" in c) return { ok: false, redirect: c.redirect };
    if (c) return { ok: false, notFound: true };
    throw e;
  }
}
