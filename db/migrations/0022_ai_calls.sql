-- AI 호출 한도(비용 방어): OpenAI를 부르기 전에 reserve_ai_call로 자리를 잡는다.
-- 사람마다·종류마다(capture = 말로 적기, gift = 선물 추천) 지난 24시간 호출 수와, 서비스 전체 지난 24시간 호출 수를 센다.
-- 한도는 앱(환경 변수)이 넘긴다. 시스템 권한(asSystem)으로만 부른다(앱 역할이 남의 횟수를 늘리지 못하게 실행 권한을 걷는다).
-- 호출 기록은 크론이 3일 지나면 지운다.

create table public.ai_calls (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id text not null references "user" (id) on delete cascade,
  kind text not null check (kind in ('capture', 'gift'))
);

create index ai_calls_user_idx on public.ai_calls (user_id, kind, at desc);
create index ai_calls_at_idx on public.ai_calls (at);

-- 앱 역할에는 열지 않는다(정책 없음 = 못 봄)
alter table public.ai_calls enable row level security;

-- 'ok' = 자리를 잡았다, 'user_limit' = 이 사람이 오늘 쓸 만큼 썼다, 'global_limit' = 서비스 전체 한도에 닿았다
create function public.reserve_ai_call(p_user text, p_kind text, p_user_limit integer, p_global_limit integer)
returns text
language plpgsql
as $$
begin
  -- 같은 사람의 동시 요청이 한도를 넘어 통과하지 못하게 사람마다 줄을 세운다
  perform pg_advisory_xact_lock(hashtextextended('ai_calls:' || p_user, 0));
  if (select count(*) from public.ai_calls where user_id = p_user and kind = p_kind and at > now() - interval '24 hours') >= greatest(p_user_limit, 0) then
    return 'user_limit';
  end if;
  if (select count(*) from public.ai_calls where at > now() - interval '24 hours') >= greatest(p_global_limit, 0) then
    return 'global_limit';
  end if;
  insert into public.ai_calls (user_id, kind) values (p_user, p_kind);
  return 'ok';
end;
$$;

-- Supabase Data API·앱 역할이 새 표·함수를 열지 않게(0006과 같은 방침)
revoke all on function public.reserve_ai_call(text, text, integer, integer) from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.ai_calls from %I', r);
      execute format('revoke all on function public.reserve_ai_call(text, text, integer, integer) from %I', r);
    end if;
  end loop;
end $$;
