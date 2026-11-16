-- 유입 경로·기기(우리 통계 /admin): 첫 화면(visit)에 어디서 왔는지(source: google·naver·kakaotalk·direct·utm 이름 …), 들어온 사이트(ref: 도메인만),
-- 광고 캠페인(campaign: utm_campaign), 기기 OS(os)·브라우저/인앱(browser). 주소의 나머지(검색어 등)는 남기지 않는다.

alter table public.app_events
  add column ref text check (ref ~ '^[a-z0-9.-]{1,80}$'),
  add column campaign text check (campaign ~ '^[A-Za-z0-9_.-]{1,60}$'),
  add column os text check (os in ('ios', 'android', 'windows', 'mac', 'linux', 'other')),
  add column browser text check (browser ~ '^[a-z_]{1,20}$');

create index app_events_visit_idx on public.app_events (at) where name = 'visit';
