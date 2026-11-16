-- 선물 추천: 사람 기록을 보고 고른 '찾을 말'(gift_ideas)과 쿠팡 파트너스 검색 결과(coupang_searches).
-- gift_ideas: 내 주소록 사람마다 하나. 기록이 바뀌면(basis가 달라지면) 새로 고른다. payload는 서버 키로 봉인한다.
-- coupang_searches: 찾을 말 → 상품 목록(사람 정보 없음). 쿠팡 API는 호출 한도가 있어 하루 동안 다시 쓴다. coupang_calls: 부른 때(한도 세기). 둘 다 시스템 권한(asSystem)으로만 쓴다.

create table public.gift_ideas (
  user_id text not null references "user" (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  basis text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, contact_id)
);

create index gift_ideas_contact_idx on public.gift_ideas (contact_id);

grant select, insert, update, delete on public.gift_ideas to app_user;
alter table public.gift_ideas enable row level security;
create policy gift_ideas_all on public.gift_ideas for all to app_user using (user_id = app.uid()) with check (
  user_id = app.uid() and exists (select 1 from public.contacts c where c.id = gift_ideas.contact_id and c.user_id = app.uid())
);

create table public.coupang_searches (
  keyword text primary key,
  payload jsonb,
  ok boolean not null default false,
  fetched_at timestamptz not null default now()
);

create index coupang_searches_fetched_idx on public.coupang_searches (fetched_at);

-- 쿠팡 API를 부른 때(성공·실패 모두). 지난 한 시간 수로 한도를 지킨다. limited = 쿠팡이 429로 막았다
create table public.coupang_calls (
  at timestamptz not null default now(),
  limited boolean not null default false
);

create index coupang_calls_at_idx on public.coupang_calls (at);

-- 앱 역할에는 열지 않는다(정책 없음 = 못 봄)
alter table public.coupang_searches enable row level security;
alter table public.coupang_calls enable row level security;

-- Supabase Data API가 새 표를 열지 않게(0006과 같은 방침)
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.gift_ideas from %I', r);
      execute format('revoke all on public.coupang_searches from %I', r);
      execute format('revoke all on public.coupang_calls from %I', r);
    end if;
  end loop;
end $$;
