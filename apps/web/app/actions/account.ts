"use server";

import { track } from "@/lib/track";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/data";
import { revokeApple } from "@/lib/apple";
import { createLinkCode } from "@/lib/toss";

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
  // 애플로 로그인했으면 애플 쪽 권한도 끊는다(계정 줄이 지워지기 전에)
  await revokeApple(s.user.id);
  await s.tx((q) => q("select delete_my_account()"));
  // 지운 사람과 잇지 않고 수만 남긴다
  track("account_delete", {});
  // 세션은 사용자와 함께 지워졌다. 남은 쿠키만 치운다
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
  redirect("/");
}

/** 설정 > 토스에서 쓰기: 토스 미니앱에서 이 계정으로 들어갈 코드(10분). 데모 계정은 안 된다 */
export async function createTossLinkCode(): Promise<{ code: string; expiresAt: string } | null> {
  const s = await requireSession();
  if (s.user.isAnonymous) return null;
  return createLinkCode(s.user.id);
}
