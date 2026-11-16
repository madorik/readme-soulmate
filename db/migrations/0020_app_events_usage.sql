-- 이용 기록 넓히기(우리 통계 /admin): 화면 보기·머문 시간(path·value), 로그인 전 방문자(anon, 기기에 둔 무작위 id), 어디서(platform: ios·android·web).
-- 화면 주소는 사람 id·토큰을 지운 모양(/people/:id/reminder)으로만 남긴다. 날짜별 활성 사용자(DAU·WAU·MAU)·리텐션·이탈 화면을 여기서 센다.

alter table public.app_events
  add column path text check (path ~ '^/[A-Za-z0-9:/._-]{0,80}$'),
  add column value integer check (value >= 0),
  add column anon text check (anon ~ '^[A-Za-z0-9]{8,32}$'),
  add column platform text check (platform in ('ios', 'android', 'web'));

create index app_events_at_idx on public.app_events (at);
create index app_events_user_at_idx on public.app_events (user_id, at) where user_id is not null;
create index app_events_anon_idx on public.app_events (anon, at) where anon is not null;
