import "server-only";
import { asSystem, type Q } from "./db";

// 우리 통계(/admin) 숫자. 데모 계정은 빼고 센다. 표가 아직 없으면(마이그레이션 전) 그 칸만 비운다. 날짜는 한국 시간

export type Windows = { d1: number; d7: number; d30: number };

export interface Stats {
  users: { real: number; demo: number; onboarded: number; new: Windows } | null;
  active: Windows | null;
  installs: { platform: string; n: number }[] | null;
  records: { contacts: number; notes: number; folders: number; avgContacts: number } | null;
  asks: { sent: Windows; answered: Windows } | null;
  events: Record<string, Windows> | null;
  signupsByDay: { day: string; n: number }[] | null;
  clicksByDay: { day: string; n: number }[] | null;
  topItems: { item: string; n: number }[] | null;
  byBand: { band: string; n: number }[] | null;
  bySource: { source: string; n: number }[] | null;
}

const REAL = `not coalesce(u."isAnonymous", false)`;
const num = (v: unknown) => Number(v ?? 0) || 0;
const win = (r: Record<string, unknown> | null): Windows => ({ d1: num(r?.d1), d7: num(r?.d7), d30: num(r?.d30) });

async function safe<T>(q: (q: Q) => Promise<T>): Promise<T | null> {
  try {
    return await asSystem(q);
  } catch (e) {
    console.warn("stats failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/** 최근 30일 날마다(빈 날은 0) */
function days(rows: { day: string; n: unknown }[]): { day: string; n: number }[] {
  const by = new Map(rows.map((r) => [r.day, num(r.n)]));
  const out: { day: string; n: number }[] = [];
  const now = new Date(Date.now() + 9 * 3600_000);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day: d, n: by.get(d) ?? 0 });
  }
  return out;
}

export async function loadStats(): Promise<Stats> {
  const [users, onboarded, active, installs, records, asks, events, signups, clicks, topItems, byBand, bySource] = await Promise.all([
    safe((q) =>
      q.one(
        `select count(*) filter (where ${REAL}) as real, count(*) filter (where not (${REAL})) as demo,
                count(*) filter (where ${REAL} and u."createdAt" > now() - interval '1 day') as d1,
                count(*) filter (where ${REAL} and u."createdAt" > now() - interval '7 days') as d7,
                count(*) filter (where ${REAL} and u."createdAt" > now() - interval '30 days') as d30
         from "user" u`,
      ),
    ),
    safe((q) => q.one(`select count(*) as n from profiles p join "user" u on u.id = p.id where p.onboarded_at is not null and ${REAL}`)),
    safe((q) =>
      q.one(
        `select count(distinct s."userId") filter (where s."updatedAt" > now() - interval '1 day') as d1,
                count(distinct s."userId") filter (where s."updatedAt" > now() - interval '7 days') as d7,
                count(distinct s."userId") filter (where s."updatedAt" > now() - interval '30 days') as d30
         from session s join "user" u on u.id = s."userId" where ${REAL}`,
      ),
    ),
    safe((q) => q<{ platform: string; n: unknown }>(`select t.platform, count(distinct t.user_id) as n from push_tokens t join "user" u on u.id = t.user_id where ${REAL} group by 1 order by 2 desc`)),
    safe((q) =>
      q.one(
        `select (select count(*) from contacts c join "user" u on u.id = c.user_id where ${REAL}) as contacts,
                (select count(*) from notes n join "user" u on u.id = n.author_id where ${REAL}) as notes,
                (select count(*) from contact_groups g join "user" u on u.id = g.user_id where g.builtin is null and ${REAL}) as folders,
                (select count(distinct c.user_id) from contacts c join "user" u on u.id = c.user_id where ${REAL}) as owners`,
      ),
    ),
    safe((q) =>
      q.one(
        `select count(*) filter (where i.created_at > now() - interval '1 day') as s1, count(*) filter (where i.created_at > now() - interval '7 days') as s7,
                count(*) filter (where i.created_at > now() - interval '30 days') as s30,
                count(*) filter (where i.used_at > now() - interval '1 day') as a1, count(*) filter (where i.used_at > now() - interval '7 days') as a7,
                count(*) filter (where i.used_at > now() - interval '30 days') as a30
         from invites i join "user" u on u.id = i.inviter_id where ${REAL}`,
      ),
    ),
    safe((q) =>
      q<{ name: string; d1: unknown; d7: unknown; d30: unknown }>(
        `select e.name, count(*) filter (where e.at > now() - interval '1 day') as d1, count(*) filter (where e.at > now() - interval '7 days') as d7,
                count(*) filter (where e.at > now() - interval '30 days') as d30
         from app_events e left join "user" u on u.id = e.user_id where (e.user_id is null or ${REAL}) group by 1`,
      ),
    ),
    safe((q) =>
      q<{ day: string; n: unknown }>(
        `select to_char(u."createdAt" at time zone 'Asia/Seoul', 'YYYY-MM-DD') as day, count(*) as n from "user" u
         where ${REAL} and u."createdAt" > now() - interval '30 days' group by 1`,
      ),
    ),
    safe((q) =>
      q<{ day: string; n: unknown }>(
        `select to_char(e.at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as day, count(*) as n from app_events e left join "user" u on u.id = e.user_id
         where e.name = 'gift_click' and e.at > now() - interval '30 days' and (e.user_id is null or ${REAL}) group by 1`,
      ),
    ),
    safe((q) =>
      q<{ item: string; n: unknown }>(
        `select e.item, count(*) as n from app_events e left join "user" u on u.id = e.user_id
         where e.name = 'gift_click' and e.item is not null and e.at > now() - interval '30 days' and (e.user_id is null or ${REAL}) group by 1 order by 2 desc limit 10`,
      ),
    ),
    safe((q) =>
      q<{ band: string; n: unknown }>(
        `select e.band, count(*) as n from app_events e left join "user" u on u.id = e.user_id
         where e.name = 'gift_click' and e.band is not null and e.at > now() - interval '30 days' and (e.user_id is null or ${REAL}) group by 1`,
      ),
    ),
    safe((q) =>
      q<{ source: string; n: unknown }>(
        `select coalesce(e.source, '-') as source, count(*) as n from app_events e left join "user" u on u.id = e.user_id
         where e.name = 'gift_click' and e.at > now() - interval '30 days' and (e.user_id is null or ${REAL}) group by 1 order by 2 desc`,
      ),
    ),
  ]);
  const owners = num(records?.owners);
  return {
    users: users ? { real: num(users.real), demo: num(users.demo), onboarded: num(onboarded?.n), new: win(users) } : null,
    active: active ? win(active) : null,
    installs: installs ? installs.map((r) => ({ platform: r.platform, n: num(r.n) })) : null,
    records: records ? { contacts: num(records.contacts), notes: num(records.notes), folders: num(records.folders), avgContacts: owners ? num(records.contacts) / owners : 0 } : null,
    asks: asks ? { sent: { d1: num(asks.s1), d7: num(asks.s7), d30: num(asks.s30) }, answered: { d1: num(asks.a1), d7: num(asks.a7), d30: num(asks.a30) } } : null,
    events: events ? Object.fromEntries(events.map((r) => [r.name, win(r)])) : null,
    signupsByDay: signups ? days(signups) : null,
    clicksByDay: clicks ? days(clicks) : null,
    topItems: topItems ? topItems.map((r) => ({ item: r.item, n: num(r.n) })) : null,
    byBand: byBand ? byBand.map((r) => ({ band: r.band, n: num(r.n) })) : null,
    bySource: bySource ? bySource.map((r) => ({ source: r.source, n: num(r.n) })) : null,
  };
}
