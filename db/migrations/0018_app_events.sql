-- 이용 기록(우리 통계용, /admin): 선물 추천을 본 것·쿠팡 링크 누름·카드 보내기·카드 열림·선물 완료.
-- 이름·기록·메모 같은 내용은 남기지 않는다(선물 목록 id·가격대·어디서만). 계정을 지우면 그 사람 기록도 지워진다. 시스템 권한(asSystem)으로만 쓴다.

create table public.app_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  name text not null check (name ~ '^[a-z_]{2,40}$'),
  user_id text references "user" (id) on delete cascade,
  item text check (item ~ '^[a-z0-9-]{1,40}$'),
  band text check (band in ('1', '3', '5', '10')),
  source text check (source ~ '^[a-z_]{1,20}$')
);

create index app_events_name_at_idx on public.app_events (name, at desc);
create index app_events_user_idx on public.app_events (user_id);

-- 앱 역할에는 열지 않는다(정책 없음 = 못 봄)
alter table public.app_events enable row level security;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.app_events from %I', r);
    end if;
  end loop;
end $$;
