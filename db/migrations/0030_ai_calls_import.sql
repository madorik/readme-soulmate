-- 메모 가져오기(긴 글을 통째로 읽는 AI 호출)를 호출 한도의 한 종류로 센다: ai_calls.kind에 'import'를 허용한다.
-- 한 번 가져오기가 한 줄이다(조각을 여러 번 불러도 한 번으로 센다). 한도는 앱이 넘긴다(AI_IMPORT_DAILY_LIMIT, 기본 5).

alter table public.ai_calls drop constraint ai_calls_kind_check;
alter table public.ai_calls add constraint ai_calls_kind_check check (kind in ('capture', 'gift', 'import'));
