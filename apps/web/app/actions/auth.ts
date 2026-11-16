"use server";

import { track } from "@/lib/track";
import { isLocale, todayIn } from "@readme/core";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/data";
import { seedDemo } from "@/lib/demo";
import { LOCALE_COOKIE, detectLocale } from "@/lib/i18n";
import { safeNext } from "@/lib/site";

export async function signOut(): Promise<void> {
  const before = await getSession().catch(() => null);
  if (before) track("logout", { userId: before.user.id });
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    /* 이미 끝난 세션 */
  }
  redirect("/");
}

/** 언어 바꾸기: ko·en은 고정, system은 기기 언어를 따르기. 로그인 뒤에는 프로필에도 저장 */
export async function setLocale(form: FormData): Promise<void> {
  const to = String(form.get("locale"));
  const back = safeNext(String(form.get("back") ?? "/"), "/");
  const jar = await cookies();
  const session = await getSession();
  if (to === "system") {
    jar.delete(LOCALE_COOKIE);
    if (session) await session.tx((q) => q("update profiles set locale = null where id = $1", [session.user.id]));
  } else if (isLocale(to)) {
    jar.set(LOCALE_COOKIE, to, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    if (session) await session.tx((q) => q("update profiles set locale = $2 where id = $1", [session.user.id, to]));
  }
  redirect(back);
}

/** 기기 언어를 프로필에 적어 둔다(알림 문구를 그 언어로 보내려고) */
export async function rememberSystemLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const session = await getSession();
  if (!session || session.profile.systemLocale === locale) return;
  await session.tx((q) => q("update profiles set system_locale = $2 where id = $1", [session.user.id, locale]));
}

/**
 * 데모로 둘러보기: 익명 로그인 직후 부른다. 샘플 사람들을 넣고 가려던 곳으로(온보딩 전이면 화면이 알아서 온보딩으로 보낸다).
 * 개발 서버에서만 empty=1로 빈 계정(온보딩부터)을 만들 수 있다(E2E용)
 */
export async function prepareDemo(form: FormData): Promise<void> {
  const session = await getSession();
  const next = safeNext(String(form.get("next") ?? ""));
  if (!session) redirect("/");
  const empty = form.get("empty") === "1" && process.env.NODE_ENV !== "production";
  if (session.user.isAnonymous && !empty && !session.profile.onboardedAt) {
    await seedDemo(session.user.id, session.profile.localeChoice ?? (await detectLocale()), todayIn(session.profile.timeZone));
    track("demo_start", { userId: session.user.id });
  }
  redirect(next);
}
