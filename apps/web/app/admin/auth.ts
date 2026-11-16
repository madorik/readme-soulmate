"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 우리 통계(/admin) 들어가기: 관리자 키(ADMIN_KEY)를 한 번 넣으면 30일 동안 쿠키로. 키가 없으면 통계 화면이 없다

const COOKIE = "rm_admin";

function stamp(key: string): string {
  return createHash("sha256").update(`remember-you-admin\n${key}`).digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 쿠키가 지금 키와 맞는지 */
export async function isAdmin(): Promise<boolean> {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const v = (await cookies()).get(COOKIE)?.value ?? "";
  return same(v, stamp(key));
}

export async function adminLogin(form: FormData): Promise<void> {
  const key = process.env.ADMIN_KEY;
  const given = String(form.get("key") ?? "").trim();
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
