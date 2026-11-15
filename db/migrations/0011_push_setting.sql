-- 설정 > 알림 받기(켜고 끄기). 끄면 생일 알림·요청 답장·공유 수락 푸시를 보내지 않고, 기기 로컬 알림도 예약하지 않는다
alter table public.profiles add column if not exists push_enabled boolean not null default true;
