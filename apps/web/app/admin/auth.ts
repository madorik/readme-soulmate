"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAccount } from "@/lib/admin";
import { getSession } from "@/lib/data";
import { clientIp, dbHit } from "@/lib/rate-limit";

// 우리 통계(/admin) 들어가기: ① 관리자 계정(ADMIN_EMAILS)으로 로그인해 있으면 앱 프로필 메뉴의 '관리자'로 바로, ② 아니면 관리자 키(ADMIN_KEY)를 한 번 넣으면 30일 동안 쿠키로. 둘 다 없으면 통계 화면이 없다

const COOKIE = "rm_admin";

function stamp(key: string): string {
  return createHash("sha256").update(`remember-you-admin\n${key}`).digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 관리자 계정으로 로그인해 있거나, 쿠키가 지금 키와 맞는지 */
export async function isAdmin(): Promise<boolean> {
  if (isAdminAccount((await getSession())?.user)) return true;
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const v = (await cookies()).get(COOKIE)?.value ?? "";
  return same(v, stamp(key));
}

export async function adminLogin(form: FormData): Promise<void> {
  const key = process.env.ADMIN_KEY;
  const given = String(form.get("key") ?? "").trim();
  // 키 알아맞히기를 막는다: 같은 주소에서 15분에 8번까지(DB로 모든 서버가 같이 센다). 세지 못하면(DB 오류) 들여보내지 않는다
  if (!(await dbHit(`admin:${clientIp(await headers())}`, 15 * 60, 8, { failClosed: true }))) redirect("/admin?wrong=1");
  if (key && given && same(given, key)) {
    (await cookies()).set(COOKIE, stamp(key), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin", maxAge: 60 * 60 * 24 * 30 });
    redirect("/admin");
  }
  redirect("/admin?wrong=1");
}

export async function adminLogout(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
  redirect("/admin");
}
