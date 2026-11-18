-- 토스 미니앱 생일·기념일 알림: 토스 알림 동의(Notification.requestAgreement)를 받은 사람만 토스 기능성 메시지로 보낸다(기본 꺼짐).
-- 앱·웹의 알림 받기(push_enabled)와 따로 둔다: 토스 계정은 동의한 뒤에만 보낼 수 있다
alter table public.profiles add column if not exists toss_reminders boolean not null default false;
