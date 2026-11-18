-- 쓰던 기억해유 계정을 토스 미니앱에 잇는 코드(앱 설정 > 토스에서 쓰기). 10분, 한 번만 쓴다. 코드는 해시로만 둔다.
-- 서버(시스템 권한)만 읽고 쓴다(앱 역할 정책 없음)
create table if not exists public.toss_link_codes (
  code_hash text primary key,
  user_id text not null references public."user" (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists toss_link_codes_user_idx on public.toss_link_codes (user_id);
alter table public.toss_link_codes enable row level security;
