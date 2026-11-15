-- 새 항목 "문화생활"(culture): 좋아하는 것들의 영화·드라마·TV·음악과 생활과 여행의 책을 모은다.
-- 생활과 여행의 디저트는 좋아하는 음식(taste)으로, 동물은 좋아하는 것들(favorites)로 옮긴다. 생활과 여행에는 취미·계절·가 보고 싶은 곳만 남는다.
-- 옮기는 칸은 모두 암호화하지 않는 칸(payload = {"v":1,"data":{...}})이라 SQL로 옮긴다. '최근 고침' 시각은 그대로 둔다(새 줄도 원래 줄의 시각으로).
-- 좋아하는 것들을 보여 주던 공유·요청에는 문화생활도 허락한다(영화·음악은 예전에 좋아하는 것들에서 보이던 것).

alter table public.card_sections drop constraint card_sections_section_check;
alter table public.card_sections add constraint card_sections_section_check check (section in ('safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'dates'));

alter table public.grants drop constraint grants_sections_check;
alter table public.grants add constraint grants_sections_check check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'dates']);

alter table public.invites drop constraint invites_sections_check;
alter table public.invites add constraint invites_sections_check check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'dates'] and cardinality(sections) > 0);

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
      when 'partner' then array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'dates']
      when 'friend' then array['safety', 'taste', 'gifts', 'favorites', 'culture', 'life', 'dates']
      else array['safety', 'taste', 'sizes', 'favorites', 'culture', 'life', 'dates'] end;
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
  select uid, g.requester_id, i.relation, array(select k from jsonb_object_keys(g.sections) k where k = any (array['safety', 'taste', 'sizes', 'gifts', 'favorites', 'culture', 'life', 'dates']))
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

-- ── 저장된 값 옮기기 ──
create function pg_temp.has_any(d jsonb, keys text[]) returns boolean language sql immutable as $f$
  select exists (select 1 from unnest(keys) k where (jsonb_typeof(d->k) = 'array' and jsonb_array_length(d->k) > 0) or (jsonb_typeof(d->k) = 'string' and d->>k <> ''))
$f$;
create function pg_temp.pick(d jsonb, keys text[]) returns jsonb language sql immutable as $f$
  select coalesce(jsonb_object_agg(k, d->k), '{}'::jsonb) from unnest(keys) k where d ? k
$f$;

-- 내 리드미(card_sections): src 항목의 keys를 dst 항목으로. dst 줄이 없으면 원래 줄의 시각으로 새로 만든다
create function pg_temp.move_card(src text, dst text, keys text[]) returns void language plpgsql as $f$
begin
  insert into public.card_sections as c (owner_id, section, payload, updated_at)
  select s.owner_id, dst, jsonb_build_object('v', 1, 'data', pg_temp.pick(s.payload->'data', keys)), s.updated_at
  from public.card_sections s
  where s.section = src and s.payload ? 'data' and pg_temp.has_any(s.payload->'data', keys)
  on conflict (owner_id, section) do update
    set payload = jsonb_set(c.payload, '{data}', (excluded.payload->'data') || (c.payload->'data'))
    where c.payload ? 'data';
  update public.card_sections set payload = jsonb_set(payload, '{data}', (payload->'data') - keys)
  where section = src and payload ? 'data' and (payload->'data') ?| keys;
end
$f$;

-- 앱 없이 답한 리드미·직접 적어 둔 리드미: 항목별 payload를 담은 sections 맵 안에서 같은 옮기기
create function pg_temp.move_map(m jsonb, src text, dst text, keys text[]) returns jsonb language sql immutable as $f$
  select case
    when m is null or not coalesce(m->src ? 'data', false) then m
    when not pg_temp.has_any(m->src->'data', keys) then jsonb_set(m, array[src, 'data'], (m->src->'data') - keys)
    when m ? dst and not coalesce(m->dst ? 'data', false) then m
    else jsonb_set(
      jsonb_set(m || jsonb_build_object(dst, coalesce(m->dst, '{"v":1,"data":{}}'::jsonb)), array[dst, 'data'], pg_temp.pick(m->src->'data', keys) || coalesce(m->dst->'data', '{}'::jsonb)),
      array[src, 'data'], (m->src->'data') - keys)
  end
$f$;

alter table public.card_sections disable trigger card_sections_touch;
alter table public.guest_cards disable trigger guest_cards_touch;
alter table public.contact_cards disable trigger contact_cards_touch;

select pg_temp.move_card('favorites', 'culture', array['movieGenres', 'movie', 'drama', 'shows', 'musicGenres', 'song']);
select pg_temp.move_card('life', 'culture', array['book']);
select pg_temp.move_card('life', 'favorites', array['animal']);
select pg_temp.move_card('life', 'taste', array['dessert']);

update public.guest_cards set sections =
  pg_temp.move_map(pg_temp.move_map(pg_temp.move_map(pg_temp.move_map(sections,
    'favorites', 'culture', array['movieGenres', 'movie', 'drama', 'shows', 'musicGenres', 'song']),
    'life', 'culture', array['book']),
    'life', 'favorites', array['animal']),
    'life', 'taste', array['dessert'])
where sections ? 'favorites' or sections ? 'life';

update public.contact_cards set sections =
  pg_temp.move_map(pg_temp.move_map(pg_temp.move_map(pg_temp.move_map(sections,
    'favorites', 'culture', array['movieGenres', 'movie', 'drama', 'shows', 'musicGenres', 'song']),
    'life', 'culture', array['book']),
    'life', 'favorites', array['animal']),
    'life', 'taste', array['dessert'])
where sections ? 'favorites' or sections ? 'life';

alter table public.card_sections enable trigger card_sections_touch;
alter table public.guest_cards enable trigger guest_cards_touch;
alter table public.contact_cards enable trigger contact_cards_touch;

-- 좋아하는 것들을 보여 주던 공유·요청에 문화생활도
update public.grants set sections = array_append(sections, 'culture') where 'favorites' = any (sections) and not ('culture' = any (sections));
update public.invites set sections = array_append(sections, 'culture') where 'favorites' = any (sections) and not ('culture' = any (sections));
