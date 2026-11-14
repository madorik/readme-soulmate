-- 운영 DB를 Supabase(서울)로 옮겼다. 리드미는 Supabase의 Data API(PostgREST)·Supabase Auth를 쓰지 않고,
-- 앱 서버만 postgres 계정으로 붙어서 app_user로 바꿔 쿼리한다(lib/db.ts).
-- Supabase는 public 스키마의 표·함수를 anon·authenticated·service_role 역할에 자동으로 열어 두므로, 로그인 표(session·account 등)까지
-- API 키로 읽힐 수 있다. 그 길을 닫는다. 이 역할이 없는 DB(로컬 도커)에서는 아무 일도 하지 않는다.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('revoke usage on schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end $$;
