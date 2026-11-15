-- 공유 허락(grants)·공유 링크·손님 카드(guest_cards)를 없앤다. 주소록의 모든 사람은 내 기록(contact_cards) 하나를 갖는다.
-- 남의 표를 읽는 길이 없어져서 앱 역할(app_user)은 자기 줄만 읽는다. 물어보기 답은 시스템 함수가 물어본 사람의 기록에 넣는다.

-- 복사할 것이 없는 칸(직접 적은 사람·답 기다리는 사람)은 빈 기록을 만든다
insert into public.contact_cards (contact_id, author_id)
select c.id, c.user_id from public.contacts c
where c.person_id is null and c.guest_card_id is null
  and not exists (select 1 from public.contact_cards cc where cc.contact_id = c.id);

-- 공유받던 사람·앱 없이 답한 사람은 scripts/records-copy.mts가 기록으로 복사해 둬야 한다(안 했으면 데이터를 잃지 않게 멈춘다)
do $$
begin
  if exists (select 1 from public.contacts c where not exists (select 1 from public.contact_cards cc where cc.contact_id = c.id)) then
    raise exception 'records not copied: run "pnpm db:records-copy" and migrate again';
  end if;
end $$;

-- ── 물어보기만 남긴다 ──
delete from public.invites where kind = 'share';
delete from public.invites where contact_id is null; -- 주소록에서 지운 사람에게 보냈던 것
alter table public.invites alter column contact_id set not null;

drop function public.accept_share(text, text, boolean);
drop function public.claim_guest_card(text);
drop function public.invite_preview(text, text);
drop function public.record_view(text);
drop function public.request_for_answer(text);
drop function public.submit_request_answer(text, text, jsonb, boolean);

-- ── 내 리드미는 나만 읽는다 ──
drop policy card_select on public.card_sections;
create policy card_select on public.card_sections for select to app_user using (owner_id = app.uid());
drop function public.can_view(text, text);

-- 프로필: 나와, 물어보기에 로그인하고 답해서 내 주소록에 이어진 사람(얼굴·이름만 쓴다)
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to app_user using (
  id = app.uid() or exists (select 1 from public.contacts c where c.user_id = app.uid() and c.person_id = profiles.id)
);

-- 물어보기는 내 주소록 사람에게만
drop policy invites_insert on public.invites;
create policy invites_insert on public.invites for insert to app_user with check (
  inviter_id = app.uid() and exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = app.uid())
);

alter table public.contacts drop column guest_card_id;
alter table public.contacts drop column request_invite_id;
drop table public.guest_cards;
drop table public.grants;
drop function public.grants_guard();

alter table public.invites drop column kind;
alter table public.invites drop column relation;

delete from public.notifications where kind in ('accepted', 'viewed');
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('birthday', 'anniversary', 'answered'));

alter table public.profiles drop column notify_views;

-- 주소록 칸을 앱 사용자와 잇는 것(person_id)은 답하기 함수만 한다. 그룹은 내 것만(0007과 같다)
create or replace function public.contacts_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'app_user' and new.person_id is not null and (tg_op = 'INSERT' or new.person_id is distinct from old.person_id) then
    raise exception 'not connected';
  end if;
  if new.group_id is not null and (tg_op = 'INSERT' or new.group_id is distinct from old.group_id) and not exists (
    select 1 from public.contact_groups g where g.id = new.group_id and g.user_id = new.user_id
  ) then
    raise exception 'not your group';
  end if;
  return new;
end $$;

-- ── 답하는 웹 화면(시스템 전용) ──
-- 물어본 사람·대상 사람·물어본 항목·미리 채운 값(물어본 사람의 기록에서, 서버가 토큰 범위로 암호화)
create function public.request_for_answer(p_token_hash text)
returns table (invite_id uuid, state text, inviter_id text, inviter_name text, contact_id uuid, recipient_name text, sections text[], prefill jsonb, message text)
language plpgsql stable security definer set search_path = public as $$
declare
  i public.invites;
begin
  i := public.find_invite(p_token_hash, null);
  if i.id is null then
    return query select null::uuid, 'not_found'::text, null::text, null::text, null::uuid, null::text, null::text[], null::jsonb, null::text;
    return;
  end if;
  return query select i.id, public.invite_state(i), i.inviter_id, (select display_name from public.profiles where id = i.inviter_id), i.contact_id,
    i.recipient_name, i.sections, i.prefill, i.message;
end $$;

-- 답하기(시스템 전용). 답은 서버가 물어본 사람의 기록 범위(aad.contact)로 암호화해서 넘긴다.
-- 물어본 항목만 덮어쓰고 답한 때를 남긴다. 로그인하고 답했으면 그 사람 얼굴·이름이 보이게 주소록 칸을 잇는다
create function public.submit_request_answer(p_token_hash text, p_sections jsonb, p_consent boolean, p_answerer text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  i public.invites;
  keys text[];
begin
  i := public.find_invite(p_token_hash, null);
  if i.id is null then raise exception 'not_found'; end if;
  perform 1 from public.invites where id = i.id for update;
  select * into i from public.invites where id = i.id;
  if public.invite_state(i) <> 'active' then raise exception '%', public.invite_state(i); end if;
  if p_answerer is not null and p_answerer = i.inviter_id then raise exception 'self'; end if;
  if jsonb_typeof(p_sections) <> 'object' then raise exception 'bad_answer'; end if;
  if (p_sections ? 'safety') and not p_consent then raise exception 'consent_required'; end if;
  keys := array(select k from jsonb_object_keys(p_sections) k where k = any (i.sections));

  insert into public.contact_cards (contact_id, author_id)
  select c.id, c.user_id from public.contacts c where c.id = i.contact_id
  on conflict (contact_id) do nothing;
  update public.contact_cards set
    sections = sections || (select coalesce(jsonb_object_agg(k, p_sections -> k), '{}'::jsonb) from unnest(keys) k),
    answered = answered || (select coalesce(jsonb_object_agg(k, to_jsonb(now())), '{}'::jsonb) from unnest(keys) k)
  where contact_id = i.contact_id;

  update public.invites set used_at = now(), used_by = p_answerer where id = i.id;

  if p_answerer is not null then
    update public.contacts c set person_id = p_answerer
    where c.id = i.contact_id and c.person_id is null
      and not exists (select 1 from public.contacts x where x.user_id = c.user_id and x.person_id = p_answerer);
  end if;

  insert into public.notifications (user_id, kind, contact_id, label) values (i.inviter_id, 'answered', i.contact_id, i.recipient_name);
  return i.contact_id;
end $$;

revoke all on function public.request_for_answer(text), public.submit_request_answer(text, jsonb, boolean, text) from public;
