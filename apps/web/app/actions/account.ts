"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/data";

const PREFS = ["notify_views", "app_lock"] as const;

export async function setPreference(form: FormData): Promise<void> {
  const s = await requireSession();
  const key = String(form.get("key"));
  if (!(PREFS as readonly string[]).includes(key)) return;
  await s.tx((q) => q(`update profiles set ${key} = $2 where id = $1`, [s.user.id, form.get("value") === "1"]));
  revalidatePath("/privacy");
  revalidatePath("/", "layout");
}

export async function deleteAccount(form: FormData): Promise<void> {
  if (form.get("confirm") !== "1") return;
  const s = await requireSession();
  await s.tx((q) => q("select delete_my_account()"));
  // 세션은 사용자와 함께 지워졌다. 남은 쿠키만 치운다
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
  redirect("/");
}
