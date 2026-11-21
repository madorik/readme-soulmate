-- 내 기록을 짧은 링크(/s/<10글자>)로 보내기: 링크에는 아무 정보도 담지 않는다. 고른 항목은 서버 키로 암호화해 여기에 두고,
-- 링크를 받은 사람이 로그인한 앱에서 열어 자기 사람들에 저장한다(어디에 저장할지·있던 값을 유지할지 덮어쓸지는 받는 사람이 고른다).
-- 주소는 해시만 저장한다. 7일 뒤에 끝나고(지난 줄은 크론이 지운다) 받을 수 있는 횟수도 정해져 있다. 계정을 지우면 함께 지워진다.
-- 로그인 없이 여는 링크 화면과 저장이 시스템 권한(asSystem)으로만 읽는다.

create table public.record_shares (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id text not null references "user" (id) on delete cascade,
  payload jsonb not null check (pg_column_size(payload) < 32768),
  claims int not null default 0 check (claims >= 0),
  max_claims int not null default 10 check (max_claims between 1 and 50),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index record_shares_user_idx on public.record_shares (user_id, created_at);
create index record_shares_expires_idx on public.record_shares (expires_at);

-- 앱 역할에는 열지 않는다(정책 없음 = 못 봄)
alter table public.record_shares enable row level security;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.record_shares from %I', r);
    end if;
  end loop;
end $$;
