-- 이용 기록 접기(비용 방어): 화면 보기·머문 시간(page_view·page_time)은 하루 수십 줄이 쌓여 표가 가장 빨리 커진다.
-- p_keep_days일(최소 90)보다 오래된 날은 (한국 날짜, 사람)마다 줄 하나로 접는다:
--   page_view = 그날 첫 줄만 남기고 지운다(그날 활동한 사람 수 DAU·WAU·MAU·리텐션·방문자 수는 그대로, 화면 보기 수·화면별 숫자는 그 날부터 줄어든다)
--   page_time = 그날 첫 줄에 머문 시간 합계를 넣고 나머지를 지운다(머문 시간 합계는 그대로)
-- 사람 id도 익명 id도 없는 줄은 센 적이 없어 지운다. 다른 기록(visit·기능 기록)은 건드리지 않는다.
-- 날짜 단위로 접으므로 여러 번 불러도 같은 결과다. 지운 줄 수를 돌려준다. 시스템 권한(asSystem)으로만 부른다.

create function public.compact_app_events(p_keep_days integer)
returns integer
language plpgsql
as $$
declare
  cutoff timestamptz := (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') - make_interval(days => greatest(p_keep_days, 90));
  merged integer := 0;
  removed integer := 0;
begin
  -- 머문 시간: 그날 첫 줄에 합계를 넣는다
  with old as (
    select id, value, coalesce(user_id, 'a:' || anon) as who, (at at time zone 'Asia/Seoul')::date as d
      from public.app_events where name = 'page_time' and at < cutoff
  ), g as (
    select min(id) as keep_id, sum(coalesce(value, 0))::bigint as total
      from old where who is not null group by who, d having count(*) > 1
  )
  update public.app_events e set value = least(g.total, 2000000000)::integer from g where e.id = g.keep_id;
  get diagnostics merged = row_count;

  -- 그날 첫 줄 말고는 지운다(page_view·page_time 모두)
  with old as (
    select id, coalesce(user_id, 'a:' || anon) as who, (at at time zone 'Asia/Seoul')::date as d, name
      from public.app_events where name in ('page_view', 'page_time') and at < cutoff
  ), ranked as (
    select id, who, row_number() over (partition by name, who, d order by id) as rn from old
  )
  delete from public.app_events e using ranked r where e.id = r.id and (r.who is null or r.rn > 1);
  get diagnostics removed = row_count;

  return removed;
end;
$$;

revoke all on function public.compact_app_events(integer) from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function public.compact_app_events(integer) from %I', r);
    end if;
  end loop;
end $$;
