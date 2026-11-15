import "server-only";
import { INVITE_TTL_DAYS, hashToken, randomCode, randomToken } from "@readme/core";
import type { Q } from "./db";

/**
 * 물어보기 링크 한 줄을 만든다(로그인한 사람 권한으로, 내 주소록 사람에게만). 토큰은 해시만 저장하고 원문은 링크로만 나간다.
 * 해시·코드가 겹치면(아주 드물다) 그 시도만 되돌리고(savepoint) 다시 만든다. prefill은 토큰 해시를 알아야 암호화할 수 있어서 함수로 받는다.
 */
export async function insertInvite(
  q: Q,
  row: { inviter_id: string; contact_id: string; sections: string[]; recipient_name?: string; message?: string },
  prefill?: (tokenHash: string) => unknown,
): Promise<{ id: string; token: string; hash: string; code: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const token = randomToken();
    const hash = await hashToken(token);
    const code = randomCode();
    await q("savepoint invite_try");
    try {
      const inserted = await q.one<{ id: string }>(
        `insert into invites (inviter_id, contact_id, sections, recipient_name, message, prefill, token_hash, code, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now() + make_interval(days => $9))
         returning id`,
        [row.inviter_id, row.contact_id, row.sections, row.recipient_name ?? "", row.message ?? "", JSON.stringify(prefill ? prefill(hash) : {}), hash, code, INVITE_TTL_DAYS],
      );
      await q("release savepoint invite_try");
      if (inserted) return { id: inserted.id, token, hash, code };
    } catch (e) {
      await q("rollback to savepoint invite_try");
      if ((e as { code?: string }).code !== "23505") throw e;
    }
  }
  throw new Error("could not create invite");
}
