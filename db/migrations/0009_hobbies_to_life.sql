-- 선물의 '좋아하는 것·취미'(gifts.loves) → 생활과 여행의 '취미'(life.hobbies)
-- 선물·생활과 여행은 암호화하지 않는 칸이라 SQL로 옮긴다. '최근 고침' 시각은 그대로 둔다.
-- 공유 범위는 넓히지 않는다: 선물만 보여 주고 생활과 여행은 안 보여 주던 상대에게는 이제 취미가 안 보인다.

alter table public.card_sections disable trigger card_sections_touch;
alter table public.guest_cards disable trigger guest_cards_touch;
alter table public.contact_cards disable trigger contact_cards_touch;

-- 내 리드미
insert into public.card_sections as c (owner_id, section, payload)
select owner_id, 'life', jsonb_build_object('v', 1, 'data', jsonb_build_object('hobbies', payload->'data'->'loves'))
from public.card_sections
where section = 'gifts' and payload ? 'data' and jsonb_typeof(payload->'data'->'loves') = 'array' and jsonb_array_length(payload->'data'->'loves') > 0
on conflict (owner_id, section) do update
  set payload = jsonb_set(c.payload, '{data,hobbies}', excluded.payload->'data'->'hobbies', true)
  where c.payload ? 'data' and jsonb_array_length(coalesce(c.payload->'data'->'hobbies', '[]'::jsonb)) = 0;
update public.card_sections set payload = payload #- '{data,loves}' where section = 'gifts' and payload ? 'data' and payload->'data' ? 'loves';

-- 앱 없이 답한 리드미(guest_cards)와 직접 적어 둔 리드미(contact_cards): 항목별 payload를 담은 sections 안에서
update public.guest_cards set sections = jsonb_set(
    sections || jsonb_build_object('life', coalesce(sections->'life', '{"v":1,"data":{}}'::jsonb)),
    '{life,data,hobbies}', sections->'gifts'->'data'->'loves', true) #- '{gifts,data,loves}'
where jsonb_typeof(sections->'gifts'->'data'->'loves') = 'array' and jsonb_array_length(sections->'gifts'->'data'->'loves') > 0
  and (not (sections ? 'life') or sections->'life' ? 'data');
update public.guest_cards set sections = sections #- '{gifts,data,loves}' where sections->'gifts'->'data' ? 'loves';

update public.contact_cards set sections = jsonb_set(
    sections || jsonb_build_object('life', coalesce(sections->'life', '{"v":1,"data":{}}'::jsonb)),
    '{life,data,hobbies}', sections->'gifts'->'data'->'loves', true) #- '{gifts,data,loves}'
where jsonb_typeof(sections->'gifts'->'data'->'loves') = 'array' and jsonb_array_length(sections->'gifts'->'data'->'loves') > 0
  and (not (sections ? 'life') or sections->'life' ? 'data');
update public.contact_cards set sections = sections #- '{gifts,data,loves}' where sections->'gifts'->'data' ? 'loves';

alter table public.card_sections enable trigger card_sections_touch;
alter table public.guest_cards enable trigger guest_cards_touch;
alter table public.contact_cards enable trigger contact_cards_touch;
