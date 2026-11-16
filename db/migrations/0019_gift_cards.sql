-- 가족에게 보내는 선물 카드의 짧은 주소(/g/<8글자>). 내용은 부르는 말·날 한 줄·고른 선물 id뿐(기록·메모·이유는 없다).
-- id는 카드 내용에서 서버 키로 만든 값이라 같은 카드는 같은 주소. 로그인 없이 여는 카드 화면이 시스템 권한(asSystem)으로만 읽는다. 계정을 지우면 함께 지워진다.

create table public.gift_cards (
  id text primary key check (id ~ '^[A-Za-z0-9]{8}$'),
  user_id text not null references "user" (id) on delete cascade,
  payload jsonb not null check (pg_column_size(payload) < 8192),
  created_at timestamptz not null default now()
);

create index gift_cards_user_idx on public.gift_cards (user_id);

-- 앱 역할에는 열지 않는다(정책 없음 = 못 봄)
alter table public.gift_cards enable row level security;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.gift_cards from %I', r);
    end if;
  end loop;
end $$;
