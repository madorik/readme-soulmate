-- 속도 제한 저장소(여러 서버 인스턴스가 같이 센다) + 토스 미니앱 정리.
--
-- rate_hit(key, window, max): 창(초) 안에서 이 key의 요청을 하나 세고, max 안이면 true, 넘으면 false.
-- 로그인 API(Better Auth customStorage)와 관리자 키 입력이 쓴다. 한 문장으로 세고 올리니 동시에 와도 한도를 넘어 통과하지 못한다.
create table if not exists public.rate_hits (
  key text primary key,
  n integer not null,
  reset_at timestamptz not null
);
create index if not exists rate_hits_reset_idx on public.rate_hits (reset_at);
-- 앱 역할에는 열지 않는다(정책 없음 = 못 봄). 서버(소유자)만 함수로 쓴다
alter table public.rate_hits enable row level security;

create or replace function public.rate_hit(p_key text, p_window integer, p_max integer)
returns boolean
language plpgsql
as $$
declare
  v_n integer;
begin
  insert into public.rate_hits as r (key, n, reset_at)
  values (p_key, 1, now() + make_interval(secs => greatest(p_window, 1)))
  on conflict (key) do update
    set n = case when r.reset_at <= now() then 1 else r.n + 1 end,
        reset_at = case when r.reset_at <= now() then now() + make_interval(secs => greatest(p_window, 1)) else r.reset_at end
  returning n into v_n;
  return v_n <= p_max;
end;
$$;

-- Supabase Data API·앱 역할이 새 표·함수를 열지 않게(0006과 같은 방침)
revoke all on function public.rate_hit(text, integer, integer) from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.rate_hits from %I', r);
      execute format('revoke all on function public.rate_hit(text, integer, integer) from %I', r);
    end if;
  end loop;
end $$;

-- 토스 미니앱을 접었다(2026-11-18 중단, 2026-11-21 코드 제거): 연결 코드 표와 토스 알림 동의 칸을 지운다
drop table if exists public.toss_link_codes;
alter table public.profiles drop column if exists toss_reminders;
