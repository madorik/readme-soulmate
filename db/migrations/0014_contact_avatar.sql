-- 사람마다 내가 정한 얼굴(내 프로필처럼 내가 꾸민다). 없으면 이어진 사람의 얼굴, 그것도 없으면 첫 글자 동그라미.
-- 모양은 profiles.avatar와 같다(앱이 sanitizeAvatar로 읽는다)
alter table public.contacts
  add column avatar jsonb check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 2048));
