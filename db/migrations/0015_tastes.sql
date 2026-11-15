-- 선물의 향·꽃 → 취향(favorites). 선물은 '해주고 싶은 선물'(내가 기록하는 입장)로 쓰임이 바뀌고, 향·꽃은 취향으로 묶는다.
-- 선물·취향 항목은 암호화하지 않는 항목이라(payload.data) SQL로 옮긴다. 이미 보낸 물어보기의 미리 채운 값은 앱이 열 때 옮긴다(liftGiftTastes).
alter table public.card_sections disable trigger card_sections_touch;
alter table public.contact_cards disable trigger contact_cards_touch;

-- 내 리드미
insert into public.card_sections as c (owner_id, section, payload)
select owner_id, 'favorites', jsonb_build_object('v', 1, 'data', jsonb_strip_nulls(jsonb_build_object(
    'scent', nullif(payload->'data'->>'scent', ''), 'flowers', nullif(payload->'data'->>'flowers', ''))))
from public.card_sections
where section = 'gifts' and payload ? 'data'
  and (coalesce(payload->'data'->>'scent', '') <> '' or coalesce(payload->'data'->>'flowers', '') <> '')
on conflict (owner_id, section) do update
  set payload = jsonb_set(c.payload, '{data}', excluded.payload->'data' || coalesce(c.payload->'data', '{}'::jsonb), true)
  where c.payload ? 'data';
update public.card_sections set payload = payload #- '{data,scent}' #- '{data,flowers}'
where section = 'gifts' and payload ? 'data' and payload->'data' ?| array['scent', 'flowers'];

-- 사람마다 내 기록(항목별 payload를 담은 sections 안에서)
update public.contact_cards set sections = jsonb_set(
    sections || jsonb_build_object('favorites', coalesce(sections->'favorites', '{"v":1,"data":{}}'::jsonb)),
    '{favorites,data}',
    jsonb_strip_nulls(jsonb_build_object('scent', nullif(sections->'gifts'->'data'->>'scent', ''), 'flowers', nullif(sections->'gifts'->'data'->>'flowers', '')))
      || coalesce(sections->'favorites'->'data', '{}'::jsonb),
    true)
where (coalesce(sections->'gifts'->'data'->>'scent', '') <> '' or coalesce(sections->'gifts'->'data'->>'flowers', '') <> '')
  and (not (sections ? 'favorites') or sections->'favorites' ? 'data');
update public.contact_cards set sections = sections #- '{gifts,data,scent}' #- '{gifts,data,flowers}'
where sections->'gifts'->'data' ?| array['scent', 'flowers'];

alter table public.card_sections enable trigger card_sections_touch;
alter table public.contact_cards enable trigger contact_cards_touch;

-- 아직 답을 기다리는 물어보기: 선물을 물었으면 취향도(향·꽃이 그리로 옮겨 갔다)
update public.invites set sections = array_append(sections, 'favorites')
where 'gifts' = any (sections) and not ('favorites' = any (sections))
  and used_at is null and canceled_at is null and expires_at > now();
