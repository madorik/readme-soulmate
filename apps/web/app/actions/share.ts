"use server";

import { SECTIONS, clip, isSection, mergeCards, sanitizeAvatar, translate, type MergeMode, type Section } from "@readme/core";
import { revalidatePath } from "next/cache";
import { getSession, readContactCard, readCard, sealContactSections, writeContactSection } from "@/lib/data";
import { LIMITS } from "@/lib/data-core";
import { readRecordShare, releaseShareClaim, reserveShareClaim, createRecordShare, shareTokenOf } from "@/lib/record-share";
import { dbHit } from "@/lib/rate-limit";
import { track } from "@/lib/track";
import { isUuid } from "@/lib/uuid";

// 내 기록 링크 보내기(shareMyRecord)와 받은 링크를 내 사람들에 저장하기(claimSharedRecord).
// 링크에는 아무 정보도 없고, 내용은 서버에 암호화해 둔다(lib/record-share). 받는 사람은 로그인한 상태에서만 내용을 본다.

export type ShareLinkResult = { ok: true; url: string } | { ok: false; reason: "login" | "empty" | "busy" };

/** 내 기록에서 고른 항목을 링크로 만든다(보낼 게 없으면 empty) */
export async function shareMyRecord(rawSections: unknown): Promise<ShareLinkResult> {
  const s = await getSession();
  if (!s) return { ok: false, reason: "login" };
  const sections = (Array.isArray(rawSections) ? rawSections : []).filter((x): x is Section => isSection(x)).slice(0, SECTIONS.length);
  if (!sections.length) return { ok: false, reason: "empty" };
  // 링크를 계속 만들어 표를 채우지 못하게(사람마다 한 시간에 20개)
  if (!(await dbHit(`share:${s.user.id}`, 3600, 20))) return { ok: false, reason: "busy" };
  const { card } = await s.tx((q) => readCard(q, s.user.id));
  const url = await createRecordShare(s.user.id, { name: s.profile.displayName, avatar: s.profile.avatar, card }, sections);
  if (!url) return { ok: false, reason: "empty" };
  track("share_create", { userId: s.user.id });
  return { ok: true, url };
}

export type ClaimResult =
  | { ok: true; contactId: string }
  | { ok: false; reason: "login" | "notfound" | "expired" | "full" | "mine" | "limit" | "target" | "busy" | "error" };

/**
 * 받은 링크를 내 사람들에 저장한다.
 * target: "new"면 보낸 사람을 새 사람으로, 아니면 내 사람 한 명(contactId)에 합친다.
 * mode: 그 사람에게 이미 적어 둔 값이 있을 때 keep(있던 값 유지, 빈 칸만 채움) / overwrite(받은 값으로 덮어쓰기)
 */
export async function claimSharedRecord(rawToken: string, target: string, rawMode: string): Promise<ClaimResult> {
  const s = await getSession();
  if (!s) return { ok: false, reason: "login" };
  const mode: MergeMode = rawMode === "overwrite" ? "overwrite" : "keep";
  const toNew = target === "new";
  if (!toNew && !isUuid(target)) return { ok: false, reason: "target" };
  // 남의 링크를 이것저것 대 보지 못하게(사람마다 10분에 30번)
  if (!(await dbHit(`claim:${s.user.id}`, 600, 30))) return { ok: false, reason: "busy" };

  const view = await readRecordShare(shareTokenOf(rawToken));
  if (view.state !== "ok") return { ok: false, reason: view.state };
  if (view.fromId === s.user.id) return { ok: false, reason: "mine" };
  if (!(await reserveShareClaim(view.hash))) return { ok: false, reason: "full" };

  const { record } = view;
  try {
    const result = await s.tx(async (q): Promise<ClaimResult> => {
      // 같은 사람의 사람 더하기·저장이 겹치지 않게 사람별로 줄 세운다(createPerson과 같은 줄)
      await q("select pg_advisory_xact_lock(hashtext($1))", [`person:${s.user.id}`]);
      const avatar = record.avatar ? JSON.stringify(sanitizeAvatar(record.avatar)) : null;
      if (toNew) {
        const count = (await q.one<{ n: number }>("select count(*)::int as n from contacts where user_id = $1", [s.user.id]))?.n ?? 0;
        if (count >= LIMITS.people) return { ok: false, reason: "limit" };
        const name = clip(record.name, 40) || translate(s.profile.locale, "share.in.someone");
        const c = await q.one<{ id: string }>("insert into contacts (user_id, nickname, avatar) values ($1, $2, $3) returning id", [s.user.id, name, avatar]);
        await q("insert into contact_cards (contact_id, author_id, sections) values ($1, $2, $3)", [c!.id, s.user.id, JSON.stringify(sealContactSections(s.user.id, c!.id, record.card))]);
        return { ok: true, contactId: c!.id };
      }
      // 내 주소록의 사람인지 확인(RLS가 내 것만 돌려준다)
      const mine = await q.one<{ id: string; has_avatar: boolean }>("select id, avatar is not null as has_avatar from contacts where id = $1::uuid and user_id = $2", [target, s.user.id]);
      if (!mine) return { ok: false, reason: "target" };
      // 다른 곳에서 고치는 것과 겹치지 않게 잠그고 읽어서 합친다
      const current = await readContactCard(q, s.user.id, mine.id, true);
      const { card, changed } = mergeCards(current, record.card, mode);
      for (const section of changed) await writeContactSection(q, s.user.id, mine.id, section, card[section]);
      // 얼굴은 덮어쓰기이거나 아직 꾸미지 않은 사람일 때만 받은 것으로
      if (avatar && (mode === "overwrite" || !mine.has_avatar)) await q("update contacts set avatar = $2 where id = $1::uuid", [mine.id, avatar]);
      return { ok: true, contactId: mine.id };
    });
    if (!result.ok) {
      await releaseShareClaim(view.hash);
      return result;
    }
    track("share_claim", { userId: s.user.id, source: toNew ? "new" : mode });
    revalidatePath("/people", "layout");
    revalidatePath("/home");
    return result;
  } catch (e) {
    await releaseShareClaim(view.hash);
    console.warn("claim shared record failed", e instanceof Error ? e.message : e);
    return { ok: false, reason: "error" };
  }
}
