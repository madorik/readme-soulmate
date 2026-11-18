import { dueReminders, eventTitle, isLocale, sanitizeOffsets, sanitizeSection, todayIn, translate, upcomingEvents, type DatesData, type PersonDates } from "@readme/core";
import { NextResponse, type NextRequest } from "next/server";
import { aad, open } from "@/lib/crypto";
import { asSystem, systemQuery } from "@/lib/db";
import { tidyUsage } from "@/lib/housekeeping";
import { sendPush } from "@/lib/push";
import { sendTossMessage, tossReminderTemplate } from "@/lib/toss";

// 매일 아침 한 번(vercel.json): 오늘 알릴 생일·기념일을 알림으로 남기고, 푸시 키가 있으면 보낸다.
// 시스템 권한으로 모든 사람을 보므로, 각자 자기 주소록 사람의 기록(contact_cards)만 읽도록 쿼리에서 직접 지킨다.
// 토스 미니앱 계정은 토스 알림에 동의했고(toss_reminders) 템플릿이 승인돼 있으면(TOSS_REMINDER_TEMPLATE) 토스 기능성 메시지로 보낸다.

const BATCH = 200;

function datesOf(payload: unknown, scope: string): DatesData | null {
  const data = open(payload, scope);
  return data ? sanitizeSection("dates", data) : null;
}

type Source = {
  user_id: string;
  contact_id: string;
  name: string;
  payload: unknown;
};

type Profile = {
  id: string;
  locale: string | null;
  system_locale: string;
  time_zone: string;
  reminder_offsets: number[];
  toss_key: string | null;
};

/** 사람 한 명의 알림: 오늘 알릴 것을 알림으로 남기고(겹치면 건너뜀) 푸시·토스로 보낸다. 만든 수·보낸 수·실패 수는 counts에 더한다 */
async function remindOne(
  profile: Profile,
  sources: Source[],
  tossTemplate: string | null,
  counts: { created: number; pushed: number; failed: number },
): Promise<void> {
  const me = profile.id;
  const locale = isLocale(profile.locale) ? profile.locale : isLocale(profile.system_locale) ? profile.system_locale : "ko";
  const people: PersonDates[] = [];
  for (const s of sources) {
    const d = datesOf(s.payload, aad.contact(s.user_id, s.contact_id, "dates"));
    if (d) people.push({ contactId: s.contact_id, name: s.name, birthday: d.birthday, anniversaries: d.anniversaries });
  }
  if (!people.length) return;
  const due = dueReminders(upcomingEvents(people, todayIn(profile.time_zone || "Asia/Seoul"), 15), sanitizeOffsets(profile.reminder_offsets));
  if (!due.length) return;

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
  counts.created += inserted.length;
  if (!inserted.length) return;

  // 앱(안드로이드·iOS)은 생일·기념일 알림을 기기에 직접 예약한다(native.tsx 기기 로컬 알림). 서버 푸시까지 보내면 두 번 오므로
  // 앱 기기에는 보내지 않는다(서버 푸시는 답장처럼 기기가 알 수 없는 것만). 웹 푸시가 생기면 그 기기에만 보낸다
  const tokens = await systemQuery<{ token: string }>("select token from push_tokens where user_id = $1 and platform not in ('android', 'ios')", [me]);
  // 토스 계정: 개발용 키(dev-)로는 보내지 않는다
  const tossKey = tossTemplate && profile.toss_key && !profile.toss_key.startsWith("dev-") ? profile.toss_key : null;
  for (const n of inserted) {
    // 알림 하나가 실패해도 같은 사람의 나머지는 계속 보낸다(알림 행은 이미 남았으니 다음 번에 다시 만들지 않는다)
    try {
      const e = due.find((x) => x.event.contactId === n.contact_id && x.event.kind === n.kind && x.offset === n.offset_days && (x.event.label ?? "") === n.label)?.event;
      if (!e) continue;
      const event = eventTitle(locale, e);
      const title = n.offset_days === 0 ? translate(locale, "notif.today", { event }) : translate(locale, "notif.left", { event, n: n.offset_days });
      const path = `/people/${e.contactId}/reminder?kind=${e.kind}${e.label ? `&label=${encodeURIComponent(e.label)}` : ""}`;
      let sent = false;
      for (const tk of tokens) {
        const r = await sendPush(tk.token, title, translate(locale, "notif.body"), path);
        if (r === true) sent = true;
        if (r === "gone") await systemQuery("delete from push_tokens where user_id = $1 and token = $2", [me, tk.token]);
      }
      if (tossKey && (await sendTossMessage(tossKey, tossTemplate!, { title, event, days: String(n.offset_days), body: translate(locale, "notif.body") }))) sent = true;
      if (sent) {
        counts.pushed++;
        await systemQuery("update notifications set pushed_at = now() where id = $1", [n.id]);
      }
    } catch (err) {
      counts.failed++;
      console.warn("reminder send failed", err instanceof Error ? err.message : err);
    }
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const counts = { created: 0, pushed: 0, failed: 0 };
  let users = 0;
  const tossTemplate = tossReminderTemplate();

  for (let offset = 0; ; offset += BATCH) {
    const profiles = await systemQuery<Profile>(
      `select p.id, p.locale, p.system_locale, p.time_zone, p.reminder_offsets,
              case when p.toss_reminders then (select a."accountId" from account a where a."userId" = p.id and a."providerId" = 'toss' limit 1) end as toss_key
         from profiles p where p.onboarded_at is not null and (p.push_enabled or p.toss_reminders) order by p.id limit $1 offset $2`,
      [BATCH, offset],
    );
    if (!profiles.length) break;
    users += profiles.length;
    const ids = profiles.map((p) => p.id);

    // 내 주소록 사람의 기록 중 생일·기념일 칸(이름은 내가 부르는 말, 없으면 이어진 앱 사용자 이름)
    const sources = await systemQuery<Source>(
      `select c.user_id, c.id as contact_id, coalesce(nullif(c.nickname, ''), p.display_name, '') as name, cc.sections -> 'dates' as payload
         from contacts c
         join contact_cards cc on cc.contact_id = c.id and cc.author_id = c.user_id
         left join profiles p on p.id = c.person_id
        where c.user_id = any ($1) and cc.sections ? 'dates'`,
      [ids],
    );
    // 사람별로 한 번에 묶는다(사람 수 x 기록 수로 훑지 않게)
    const sourcesByUser = new Map<string, Source[]>();
    for (const s of sources) {
      const list = sourcesByUser.get(s.user_id);
      if (list) list.push(s);
      else sourcesByUser.set(s.user_id, [s]);
    }

    for (const profile of profiles) {
      // 한 사람이 실패해도(깨진 값·DB 오류 등) 다른 사람 알림은 계속 보낸다
      try {
        await remindOne(profile, sourcesByUser.get(profile.id) ?? [], tossTemplate, counts);
      } catch (err) {
        counts.failed++;
        console.warn("reminder user failed", err instanceof Error ? err.message : err);
      }
    }
    if (profiles.length < BATCH) break;
  }
  // 데모 계정은 7일 지나면 지운다(카드·연락처·알림은 외래 키로 함께 지워진다)
  let demosRemoved = 0;
  try {
    demosRemoved = (await systemQuery(`delete from "user" where "isAnonymous" and "createdAt" < now() - interval '7 days' returning id`)).length;
  } catch (err) {
    counts.failed++;
    console.warn("demo cleanup failed", err instanceof Error ? err.message : err);
  }
  // 이용 기록 접기·AI 호출 기록 지우기(표가 끝없이 커지지 않게)
  const tidy = await tidyUsage();
  return NextResponse.json({ users, created: counts.created, pushed: counts.pushed, failed: counts.failed, demosRemoved, tidy });
}
