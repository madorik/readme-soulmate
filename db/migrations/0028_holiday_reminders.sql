-- 명절·챙기는 날(설날·추석·크리스마스·어버이날 …) 알림.
-- profiles.holiday_reminders: 설정 > '명절·챙기는 날 알림'(기본 켜짐. 알림 받기(push_enabled)가 켜져 있을 때만 의미가 있다)
alter table public.profiles add column if not exists holiday_reminders boolean not null default true;

-- 알림 표에 종류 'holiday'를 더한다(사람 없이 날 이름만: contact_id는 비고, label에 날 이름 코드)
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('birthday', 'anniversary', 'accepted', 'answered', 'viewed', 'holiday'));

-- 같은 명절 알림은 한 번만. 기존 notifications_once는 contact_id가 비면(null은 서로 다른 값) 겹침을 못 막아서 따로 둔다
create unique index if not exists notifications_holiday_once on public.notifications (user_id, event_date, offset_days, label) where kind = 'holiday';
