"use server";

import { track } from "@/lib/track";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/data";

const PREFS = ["app_lock", "push_enabled"] as const;

export async function setPreference(form: FormData): Promise<void> {
  const s = await requireSession();
  const key = String(form.get("key"));
  if (!(PREFS as readonly string[]).includes(key)) return;
  const on = form.get("value") === "1";
  await s.tx(async (q) => {
    await q(`update profiles set ${key} = $2 where id = $1`, [s.user.id, on]);
    // 알림을 끄면 이 계정의 기기 토큰도 지운다(다시 켜면 앱이 새로 등록한다)
    if (key === "push_enabled" && !on) await q("delete from push_tokens where user_id = $1", [s.user.id]);
  });
  revalidatePath("/privacy");
  revalidatePath("/", "layout");
}

export async function deleteAccount(form: FormData): Promise<void> {
  if (form.get("confirm") !== "1") return;
  const s = await requireSession();
  await s.tx((q) => q("select delete_my_account()"));
  // 지운 사람과 잇지 않고 수만 남긴다
  track("account_delete", {});
  // 세션은 사용자와 함께 지워졌다. 남은 쿠키만 치운다
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
  redirect("/");
}
