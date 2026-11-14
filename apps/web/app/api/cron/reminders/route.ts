import { dueReminders, eventTitle, isLocale, sanitizeOffsets, sanitizeSection, todayIn, translate, upcomingEvents, type DatesData, type PersonDates } from "@readme/core";
import { NextResponse, type NextRequest } from "next/server";
import { aad, open } from "@/lib/crypto";
import { asSystem } from "@/lib/db";
import { sendPush } from "@/lib/push";

// 매일 아침 한 번(vercel.json): 오늘 알릴 생일·기념일을 알림으로 남기고, 푸시 키가 있으면 보낸다.
// 시스템 권한으로 모든 사람을 보므로, 볼 수 있는 범위(철회 안 된 허락 + dates 항목, 내가 부탁해 받은 손님 카드, 내가 직접 적어 둔 카드)를 쿼리에서 직접 지킨다.

const BATCH = 200;

function datesOf(payload: unknown, scope: string): DatesData | null {
  const data = open(payload, scope);
  return data ? sanitizeSection("dates", data) : null;
}

type Source = {
  src: "card" | "guest" | "mine";
  user_id: string;
  contact_id: string;
  name: string;
  owner_id: string | null;
  invite_id: string | null;
  payload: unknown;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let created = 0;
  let pushed = 0;
  let users = 0;

  for (let offset = 0; ; offset += BATCH) {
    const profiles = await asSystem((q) =>
      q<{ id: string; locale: string | null; system_locale: string; time_zone: string; reminder_offsets: number[] }>(
        "select id, locale, system_locale, time_zone, reminder_offsets from profiles where onboarded_at is not null order by id limit $1 offset $2",
        [BATCH, offset],
      ),
    );
    if (!profiles.length) break;
    users += profiles.length;
    const ids = profiles.map((p) => p.id);

    // 볼 수 있는 생일 칸만: (1) 허락이 살아 있고 dates가 들어 있는 사람의 카드, (2) 내가 부탁해서 받은 손님 카드, (3) 내가 직접 적어 둔 카드
    const sources = await asSystem((q) =>
      q<Source>(
        `select 'card' as src, c.user_id, c.id as contact_id, coalesce(nullif(c.nickname, ''), p.display_name, '') as name, cs.owner_id, null::uuid as invite_id, cs.payload
           from contacts c
           join grants g on g.owner_id = c.person_id and g.viewer_id = c.user_id and g.revoked_at is null and 'dates' = any (g.sections)
           join card_sections cs on cs.owner_id = c.person_id and cs.section = 'dates'
           left join profiles p on p.id = c.person_id
          where c.user_id = any ($1)
         union all
         select 'guest', c.user_id, c.id, coalesce(nullif(c.nickname, ''), gc.display_name, ''), null, gc.invite_id, gc.sections -> 'dates'
           from contacts c
           join guest_cards gc on gc.id = c.guest_card_id and gc.requester_id = c.user_id
          where c.user_id = any ($1) and c.person_id is null and gc.invite_id is not null and gc.sections ? 'dates'
         union all
         select 'mine', c.user_id, c.id, c.nickname, null, null, cc.sections -> 'dates'
           from contacts c
           join contact_cards cc on cc.contact_id = c.id and cc.author_id = c.user_id
          where c.user_id = any ($1) and c.person_id is null and c.guest_card_id is null and cc.sections ? 'dates'`,
        [ids],
      ),
    );

    for (const profile of profiles) {
      const me = profile.id;
      const locale = isLocale(profile.locale) ? profile.locale : isLocale(profile.system_locale) ? profile.system_locale : "ko";
      const people: PersonDates[] = [];
      for (const s of sources.filter((x) => x.user_id === me)) {
        const d =
          s.src === "card" && s.owner_id
            ? datesOf(s.payload, aad.card(s.owner_id, "dates"))
            : s.src === "guest" && s.invite_id
              ? datesOf(s.payload, aad.guest(s.invite_id, "dates"))
              : s.src === "mine"
                ? datesOf(s.payload, aad.contact(s.user_id, s.contact_id, "dates"))
                : null;
        if (d) people.push({ contactId: s.contact_id, name: s.name, birthday: d.birthday, anniversaries: d.anniversaries });
      }
      if (!people.length) continue;
      const due = dueReminders(upcomingEvents(people, todayIn(profile.time_zone || "Asia/Seoul"), 15), sanitizeOffsets(profile.reminder_offsets));
      if (!due.length) continue;

      const inserted = await asSystem(async (q) => {
        const out: { id: string; contact_id: string; kind: string; offset_days: number; label: string }[] = [];
        for (const { event, offset } of due) {
          const row = await q.one<{ id: string; contact_id: string; kind: string; offset_days: number; label: string }>(
            `insert into notifications (user_id, kind, contact_id, event_date, offset_days, label)
             values ($1, $2, $3, make_date($4, $5, $6), $7, $8)
             on conflict on constraint notifications_once do nothing
             returning id, contact_id, kind, offset_days, label`,
            [me, event.kind, event.contactId, event.date.y, event.date.m, event.date.d, offset, event.label ?? ""],
          );
          if (row) out.push(row);
        }
        return out;
      });
      created += inserted.length;
      if (!inserted.length) continue;

      const tokens = await asSystem((q) => q<{ token: string }>("select token from push_tokens where user_id = $1", [me]));
      for (const n of inserted) {
        const e = due.find((x) => x.event.contactId === n.contact_id && x.event.kind === n.kind && x.offset === n.offset_days && (x.event.label ?? "") === n.label)?.event;
        if (!e) continue;
        const event = eventTitle(locale, e);
        const title = n.offset_days === 0 ? translate(locale, "notif.today", { event }) : translate(locale, "notif.left", { event, n: n.offset_days });
        const path = `/people/${e.contactId}/reminder?kind=${e.kind}${e.label ? `&label=${encodeURIComponent(e.label)}` : ""}`;
        let sent = false;
        for (const tk of tokens) {
          const r = await sendPush(tk.token, title, translate(locale, "notif.body"), path);
          if (r === true) sent = true;
          if (r === "gone") await asSystem((q) => q("delete from push_tokens where user_id = $1 and token = $2", [me, tk.token]));
        }
        if (sent) {
          pushed++;
          await asSystem((q) => q("update notifications set pushed_at = now() where id = $1", [n.id]));
        }
      }
    }
    if (profiles.length < BATCH) break;
  }
  // 데모 계정은 7일 지나면 지운다(카드·연락처·알림은 외래 키로 함께 지워진다)
  const demos = await asSystem((q) => q(`delete from "user" where "isAnonymous" and "createdAt" < now() - interval '7 days' returning id`));
  return NextResponse.json({ users, created, pushed, demosRemoved: demos.length });
}
