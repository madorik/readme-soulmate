-- 반려동물 항목(pets): 내 리드미(card_sections)와 물어보기(invites)의 항목 이름 목록에 더한다.
-- 사람 기록(contact_cards.sections)은 jsonb라 따로 바꿀 것이 없다.
alter table public.card_sections drop constraint card_sections_section_check;
alter table public.card_sections add constraint card_sections_section_check
  check (section in ('safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'pets', 'dates'));

alter table public.invites drop constraint invites_sections_check;
alter table public.invites add constraint invites_sections_check
  check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'pets', 'dates']::text[] and cardinality(sections) > 0);
