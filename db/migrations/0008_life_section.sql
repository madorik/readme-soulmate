-- 새 항목 "생활과 여행"(life): 좋아하는 것들의 '일상' 묶음(계절·디저트·가 보고 싶은 곳·동물·책)을 따로 뺀다.
-- 좋아하는 색은 '선물'에서 '좋아하는 것들'로 옮긴다. 세 칸 모두 암호화하지 않는 칸(payload = {"v":1,"data":{...}})이라 SQL로 옮긴다.
-- 좋아하는 것들을 이미 보여 주던 공유·요청에는 생활과 여행도 허락한다(예전에 같은 칸에서 보이던 것을 계속 보이게. 새로 넓히지는 않는다).

alter table public.card_sections drop constraint card_sections_section_check;
alter table public.card_sections add constraint card_sections_section_check check (section in ('safety', 'taste', 'sizes', 'gifts', 'favorites', 'life', 'dates'));

alter table public.grants drop constraint grants_sections_check;
alter table public.grants add constraint grants_sections_check check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'life', 'dates']);

alter table public.invites drop constraint invites_sections_check;
alter table public.invites add constraint invites_sections_check check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'life', 'dates'] and cardinality(sections) > 0);

create or replace function public.accept_share(p_token_hash text default null, p_code text default null, p_send_back boolean default false)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid text := app.uid();
  i public.invites;
  state text;
  contact uuid;
  back_sections text[];
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  i := public.find_invite(p_token_hash, p_code);
  if i.id is null or i.kind <> 'share' then raise exception 'not_found'; end if;
  perform 1 from public.invites where id = i.id for update;
  select * into i from public.invites where id = i.id;
  if i.inviter_id = uid then raise exception 'self'; end if;
  state := public.invite_state(i);
  if state <> 'active' then raise exception '%', state; end if;

  insert into public.grants (owner_id, viewer_id, relation, sections)
  values (i.inviter_id, uid, i.relation, i.sections)
  on conflict (owner_id, viewer_id) do update set relation = excluded.relation, sections = excluded.sections, revoked_at = null;

  update public.invites set used_at = now(), used_by = uid where id = i.id;

  insert into public.contacts (user_id, person_id) values (uid, i.inviter_id)
  on conflict (user_id, person_id) do update set person_id = excluded.person_id
  returning id into contact;

  if p_send_back then
    back_sections := case i.relation
      when 'partner' then array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'life', 'dates']
      when 'friend' then array['safety', 'taste', 'gifts', 'favorites', 'life', 'dates']
      else array['safety', 'taste', 'sizes', 'favorites', 'life', 'dates'] end;
    insert into public.grants (owner_id, viewer_id, relation, sections)
    values (uid, i.inviter_id, i.relation, back_sections)
    on conflict (owner_id, viewer_id) do update set revoked_at = null;
    insert into public.contacts (user_id, person_id) values (i.inviter_id, uid)
    on conflict (user_id, person_id) do nothing;
  end if;

  insert into public.notifications (user_id, kind, actor_id) values (i.inviter_id, 'accepted', uid);
  return contact;
end $$;

create or replace function public.claim_guest_card(p_token_hash text) returns table (claimed_card_id uuid, claimed_requester_id text, claimed_sections text[])
language plpgsql security definer set search_path = public as $$
declare
  uid text := app.uid();
  i public.invites;
  g public.guest_cards;
  existing uuid;
  guest_contact uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  i := public.find_invite(p_token_hash, null);
  if i.id is null or i.kind <> 'request' then raise exception 'not_found'; end if;
  select * into g from public.guest_cards where invite_id = i.id for update;
  if g.id is null then raise exception 'not_answered'; end if;
  if g.claimed_by is not null and g.claimed_by <> uid then raise exception 'used'; end if;
  if g.created_at < now() - interval '30 days' then raise exception 'expired'; end if;
  if i.inviter_id = uid then raise exception 'self'; end if;

  update public.guest_cards set claimed_by = uid where id = g.id;

  insert into public.grants (owner_id, viewer_id, relation, sections)
  select uid, g.requester_id, i.relation, array(select k from jsonb_object_keys(g.sections) k where k = any (array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'life', 'dates']))
  on conflict (owner_id, viewer_id) do update set sections = excluded.sections, revoked_at = null;

  -- 요청한 사람의 주소록 칸을 진짜 사람으로 바꾼다. 이미 그 사람 칸이 있으면 메모를 옮기고 손님 칸은 지운다
  select id into existing from public.contacts where user_id = g.requester_id and person_id = uid;
  select id into guest_contact from public.contacts where user_id = g.requester_id and guest_card_id = g.id;
  if existing is not null and guest_contact is not null then
    update public.notes set contact_id = existing where contact_id = guest_contact;
    delete from public.contacts where id = guest_contact;
  elsif guest_contact is not null then
    update public.contacts set person_id = uid where id = guest_contact;
  end if;

  return query select g.id, g.requester_id, array(select k from jsonb_object_keys(g.sections) k);
end $$;

-- ── 저장된 값 옮기기('최근 고침' 시각은 그대로 둔다) ──
alter table public.card_sections disable trigger card_sections_touch;
alter table public.guest_cards disable trigger guest_cards_touch;
alter table public.contact_cards disable trigger contact_cards_touch;

-- 내 리드미: 선물의 색 → 좋아하는 것들
insert into public.card_sections as c (owner_id, section, payload)
select owner_id, 'favorites', jsonb_build_object('v', 1, 'data', jsonb_build_object('colors', payload->'data'->'colors'))
from public.card_sections
where section = 'gifts' and payload ? 'data' and jsonb_typeof(payload->'data'->'colors') = 'array' and jsonb_array_length(payload->'data'->'colors') > 0
on conflict (owner_id, section) do update
  set payload = jsonb_set(c.payload, '{data,colors}', excluded.payload->'data'->'colors', true)
  where c.payload ? 'data' and jsonb_array_length(coalesce(c.payload->'data'->'colors', '[]'::jsonb)) = 0;
update public.card_sections set payload = payload #- '{data,colors}' where section = 'gifts' and payload ? 'data' and payload->'data' ? 'colors';

-- 내 리드미: 좋아하는 것들의 일상 → 생활과 여행
insert into public.card_sections (owner_id, section, payload)
select owner_id, 'life', jsonb_build_object('v', 1, 'data', jsonb_strip_nulls(jsonb_build_object('seasons', payload->'data'->'seasons', 'dessert', payload->'data'->'dessert', 'travel', payload->'data'->'travel', 'animal', payload->'data'->'animal', 'book', payload->'data'->'book')))
from public.card_sections
where section = 'favorites' and payload ? 'data' and (jsonb_array_length(coalesce(payload->'data'->'seasons', '[]'::jsonb)) > 0 or coalesce(payload->'data'->>'dessert', '') <> '' or coalesce(payload->'data'->>'travel', '') <> '' or coalesce(payload->'data'->>'animal', '') <> '' or coalesce(payload->'data'->>'book', '') <> '')
on conflict (owner_id, section) do nothing;
update public.card_sections set payload = payload #- '{data,seasons}' #- '{data,dessert}' #- '{data,travel}' #- '{data,animal}' #- '{data,book}'
where section = 'favorites' and payload ? 'data' and payload->'data' ?| array['seasons', 'dessert', 'travel', 'animal', 'book'];

-- guest_cards: 같은 옮기기(항목별 payload를 담은 sections 안에서)
update public.guest_cards set sections = jsonb_set(
    sections || jsonb_build_object('favorites', coalesce(sections->'favorites', '{"v":1,"data":{}}'::jsonb)),
    '{favorites,data,colors}', sections->'gifts'->'data'->'colors', true) #- '{gifts,data,colors}'
where jsonb_typeof(sections->'gifts'->'data'->'colors') = 'array' and jsonb_array_length(sections->'gifts'->'data'->'colors') > 0
  and (not (sections ? 'favorites') or sections->'favorites' ? 'data');
update public.guest_cards set sections = sections #- '{gifts,data,colors}' where sections->'gifts'->'data' ? 'colors';
update public.guest_cards set sections = jsonb_set(sections, '{life}', jsonb_build_object('v', 1, 'data', jsonb_strip_nulls(jsonb_build_object('seasons', sections->'favorites'->'data'->'seasons', 'dessert', sections->'favorites'->'data'->'dessert', 'travel', sections->'favorites'->'data'->'travel', 'animal', sections->'favorites'->'data'->'animal', 'book', sections->'favorites'->'data'->'book'))), true)
where sections->'favorites' ? 'data' and not (sections ? 'life') and (jsonb_array_length(coalesce(sections->'favorites'->'data'->'seasons', '[]'::jsonb)) > 0 or coalesce(sections->'favorites'->'data'->>'dessert', '') <> '' or coalesce(sections->'favorites'->'data'->>'travel', '') <> '' or coalesce(sections->'favorites'->'data'->>'animal', '') <> '' or coalesce(sections->'favorites'->'data'->>'book', '') <> '');
update public.guest_cards set sections = sections #- '{favorites,data,seasons}' #- '{favorites,data,dessert}' #- '{favorites,data,travel}' #- '{favorites,data,animal}' #- '{favorites,data,book}'
where sections->'favorites'->'data' ?| array['seasons', 'dessert', 'travel', 'animal', 'book'];

-- contact_cards: 같은 옮기기(항목별 payload를 담은 sections 안에서)
update public.contact_cards set sections = jsonb_set(
    sections || jsonb_build_object('favorites', coalesce(sections->'favorites', '{"v":1,"data":{}}'::jsonb)),
    '{favorites,data,colors}', sections->'gifts'->'data'->'colors', true) #- '{gifts,data,colors}'
where jsonb_typeof(sections->'gifts'->'data'->'colors') = 'array' and jsonb_array_length(sections->'gifts'->'data'->'colors') > 0
  and (not (sections ? 'favorites') or sections->'favorites' ? 'data');
update public.contact_cards set sections = sections #- '{gifts,data,colors}' where sections->'gifts'->'data' ? 'colors';
update public.contact_cards set sections = jsonb_set(sections, '{life}', jsonb_build_object('v', 1, 'data', jsonb_strip_nulls(jsonb_build_object('seasons', sections->'favorites'->'data'->'seasons', 'dessert', sections->'favorites'->'data'->'dessert', 'travel', sections->'favorites'->'data'->'travel', 'animal', sections->'favorites'->'data'->'animal', 'book', sections->'favorites'->'data'->'book'))), true)
where sections->'favorites' ? 'data' and not (sections ? 'life') and (jsonb_array_length(coalesce(sections->'favorites'->'data'->'seasons', '[]'::jsonb)) > 0 or coalesce(sections->'favorites'->'data'->>'dessert', '') <> '' or coalesce(sections->'favorites'->'data'->>'travel', '') <> '' or coalesce(sections->'favorites'->'data'->>'animal', '') <> '' or coalesce(sections->'favorites'->'data'->>'book', '') <> '');
update public.contact_cards set sections = sections #- '{favorites,data,seasons}' #- '{favorites,data,dessert}' #- '{favorites,data,travel}' #- '{favorites,data,animal}' #- '{favorites,data,book}'
where sections->'favorites'->'data' ?| array['seasons', 'dessert', 'travel', 'animal', 'book'];

alter table public.card_sections enable trigger card_sections_touch;
alter table public.guest_cards enable trigger guest_cards_touch;
alter table public.contact_cards enable trigger contact_cards_touch;

-- 좋아하는 것들을 보여 주던 공유·요청에 생활과 여행도
update public.grants set sections = array_append(sections, 'life') where 'favorites' = any (sections) and not ('life' = any (sections));
update public.invites set sections = array_append(sections, 'life') where 'favorites' = any (sections) and not ('life' = any (sections));
