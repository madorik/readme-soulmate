-- 새 항목 "마음과 성향"(care): 마음이 전해지는 방식, 힘들 때 해 주면 좋은 것, 조심할 것, 연락 방법, MBTI, 반려동물.
-- 항목 이름이 묶여 있는 검사 조건과 함수(받으면서 내 것도 보내기, 앱 없이 답한 리드미 가져오기)에 care를 더한다.
alter table public.card_sections drop constraint card_sections_section_check;
alter table public.card_sections add constraint card_sections_section_check check (section in ('safety', 'taste', 'sizes', 'gifts', 'dates', 'care'));

alter table public.grants drop constraint grants_sections_check;
alter table public.grants add constraint grants_sections_check check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'dates', 'care']);

alter table public.invites drop constraint invites_sections_check;
alter table public.invites add constraint invites_sections_check check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'dates', 'care'] and cardinality(sections) > 0);

-- 관계별 기본 항목(packages/core RELATION_PRESETS와 같게)
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
      when 'partner' then array['safety', 'taste', 'sizes', 'gifts', 'dates', 'care']
      when 'friend' then array['safety', 'taste', 'gifts', 'dates', 'care']
      else array['safety', 'taste', 'sizes', 'dates', 'care'] end;
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
  select uid, g.requester_id, i.relation, array(select k from jsonb_object_keys(g.sections) k where k = any (array['safety', 'taste', 'sizes', 'gifts', 'dates', 'care']))
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
