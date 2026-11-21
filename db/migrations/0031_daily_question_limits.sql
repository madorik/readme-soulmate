-- 오늘의 질문을 덜 귀찮게.
-- profiles.question_day / question_count: 오늘(그 사람 시간대 날짜) 질문 카드를 몇 번 처리했나(답하기·건너뛰기·물어보기·그만 묻기). 하루 두 번까지만 카드가 뜬다.
-- (날짜는 글자 'YYYY-MM-DD'로 둔다: date로 읽으면 서버 시간대에 따라 하루가 밀린다)
alter table public.profiles add column if not exists question_day text check (question_day ~ '^\d{4}-\d{2}-\d{2}$');
alter table public.profiles add column if not exists question_count smallint not null default 0;

-- contacts.ask_off: '이 사람에 대해 다시 묻지 않기'(사람 화면에서 다시 켤 수 있다)
alter table public.contacts add column if not exists ask_off boolean not null default false;

-- contacts.view_days / viewed_on: 사람 상세 화면을 연 날 수(하루에 한 번만 센다). 자주 보는 사람에게만 질문하려고 쓴다
alter table public.contacts add column if not exists view_days integer not null default 0;
alter table public.contacts add column if not exists viewed_on date;
