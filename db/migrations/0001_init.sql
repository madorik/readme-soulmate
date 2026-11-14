-- 리드미 스키마(Postgres 16+, 운영은 Supabase 서울).
-- 원칙(PLAN.md "보안 원칙"): 공개 검색 없음, 항목 단위 공유, RLS가 "주인 또는 그 항목을 허락받은 사람"만 읽게 한다.
-- 앱 서버는 요청마다 트랜잭션 안에서 `set local role app_user` + `set_config('app.user_id', <로그인한 사람>, true)`로 바꾼 뒤 쿼리한다(lib/db.ts).
-- 그래서 서버 코드에 실수가 있어도 DB가 남의 리드미를 돌려주지 않는다. 시스템 작업(크론·앱 없이 답하기·초대 미리보기)만 소유자 권한으로 돈다.
-- 알레르기(safety)·사이즈(sizes)·메모·요청 초안은 앱 서버가 암호화해서 payload에 넣는다(DB는 내용을 모른다).

-- ── 로그인(Better Auth) ─────────────────────────────
create table "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "isAnonymous" boolean default false
);

create table session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" (id) on delete cascade
);
create index session_user_idx on session ("userId");

create table account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" (id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null
);
create index account_user_idx on account ("userId");

create table verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index verification_identifier_idx on verification (identifier);

-- ── 요청한 사람(RLS) ─────────────────────────────────
create schema if not exists app;
create function app.uid() returns text language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;
grant app_user to current_user;
grant usage on schema public, app to app_user;
grant execute on function app.uid() to app_user;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── 프로필 ─────────────────────────────────────────────
create table public.profiles (
  id text primary key references "user" (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  -- 직접 고른 언어. null이면 기기(시스템) 언어를 따른다
  locale text check (locale in ('ko', 'en')),
  -- 마지막으로 본 기기 언어(알림 문구용)
  system_locale text not null default 'ko' check (system_locale in ('ko', 'en')),
  time_zone text not null default 'Asia/Seoul' check (char_length(time_zone) <= 64),
  avatar jsonb not null default '{}'::jsonb check (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 2048),
  reminder_offsets int[] not null default '{7,0}' check (reminder_offsets <@ array[14, 7, 3, 0]),
  notify_views boolean not null default false,
  app_lock boolean not null default false,
  is_demo boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- 가입하면 프로필을 만든다(이름은 구글·애플이 준 이름, 데모는 빈 이름)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, case when coalesce(new."isAnonymous", false) then '' else left(coalesce(new.name, ''), 40) end)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_user_created after insert on "user" for each row execute function public.handle_new_user();

-- ── 리드미(카드) 항목 ──────────────────────────────────
create table public.card_sections (
  owner_id text not null references "user" (id) on delete cascade,
  section text not null check (section in ('safety', 'taste', 'sizes', 'gifts', 'dates')),
  payload jsonb not null check (pg_column_size(payload) < 32768),
  updated_at timestamptz not null default now(),
  primary key (owner_id, section)
);

create trigger card_sections_touch before update on public.card_sections for each row execute function public.touch_updated_at();

-- ── 공유 허락(grant): owner가 viewer에게 sections를 보여 준다 ─────
create table public.grants (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references "user" (id) on delete cascade,
  viewer_id text not null references "user" (id) on delete cascade,
  relation text check (relation in ('partner', 'family', 'friend')),
  sections text[] not null check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'dates']),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

create index grants_viewer_idx on public.grants (viewer_id);

create function public.grants_guard() returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id or new.viewer_id <> old.viewer_id or new.created_at <> old.created_at then
    raise exception 'grant owner/viewer cannot change';
  end if;
  return new;
end $$;

create trigger grants_guard before update on public.grants for each row execute function public.grants_guard();

-- 지금 요청한 사람이 owner의 section을 볼 수 있는지
create function public.can_view(p_owner text, p_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = app.uid()
    or exists (
      select 1 from public.grants g
      where g.owner_id = p_owner and g.viewer_id = app.uid() and g.revoked_at is null and p_section = any (g.sections)
    );
$$;

-- ── 초대(공유 링크·요청 링크) ───────────────────────────
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('share', 'request')),
  inviter_id text not null references "user" (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  relation text check (relation in ('partner', 'family', 'friend')),
  sections text[] not null check (sections <@ array['safety', 'taste', 'sizes', 'gifts', 'dates'] and cardinality(sections) > 0),
  recipient_name text not null default '' check (char_length(recipient_name) <= 40),
  prefill jsonb not null default '{}'::jsonb check (pg_column_size(prefill) < 32768),
  message text not null default '' check (char_length(message) <= 300),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by text references "user" (id) on delete set null,
  canceled_at timestamptz,
  check (expires_at > created_at and expires_at <= created_at + interval '8 days')
);

create index invites_inviter_idx on public.invites (inviter_id, created_at desc);

-- 앱 권한으로는 새 초대를 "안 쓴 상태"로만 만들 수 있다(쓰임·취소는 함수로만)
create function public.invites_guard() returns trigger language plpgsql as $$
begin
  if current_user = 'app_user' then
    if new.used_at is not null or new.used_by is not null or new.canceled_at is not null then
      raise exception 'invite must start unused';
    end if;
    new.created_at := now();
  end if;
  return new;
end $$;

create trigger invites_guard before insert on public.invites for each row execute function public.invites_guard();

-- ── 앱 없이 답한 리드미(요청에 대한 답) ─────────────────
create table public.guest_cards (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid unique references public.invites (id) on delete set null,
  requester_id text not null references "user" (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  sections jsonb not null default '{}'::jsonb check (jsonb_typeof(sections) = 'object' and pg_column_size(sections) < 65536),
  consent_health_at timestamptz,
  claimed_by text references "user" (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guest_cards_requester_idx on public.guest_cards (requester_id);
create trigger guest_cards_touch before update on public.guest_cards for each row execute function public.touch_updated_at();

-- ── 내 사람들(주소록) ──────────────────────────────────
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  person_id text references "user" (id) on delete set null,
  guest_card_id uuid references public.guest_cards (id) on delete set null,
  request_invite_id uuid references public.invites (id) on delete set null,
  nickname text not null default '' check (char_length(nickname) <= 40),
  created_at timestamptz not null default now(),
  unique (user_id, person_id),
  unique (user_id, guest_card_id),
  unique (user_id, request_invite_id),
  check (person_id is null or person_id <> user_id)
);

-- 주소록에는 내가 볼 수 있는 사람만 직접 이을 수 있다(아무 사용자 id나 넣어 프로필을 엿보지 못하게).
-- 일반 권한으로 돈다: 앱이 부르면 current_user = app_user, 함수(accept_share 등) 안에서는 소유자라 건너뛴다
create function public.contacts_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'app_user' then
    if new.person_id is not null and (tg_op = 'INSERT' or new.person_id is distinct from old.person_id) and not exists (
      select 1 from public.grants g where g.owner_id = new.person_id and g.viewer_id = new.user_id
    ) then
      raise exception 'not connected';
    end if;
    if new.guest_card_id is not null and (tg_op = 'INSERT' or new.guest_card_id is distinct from old.guest_card_id) and not exists (
      select 1 from public.guest_cards c where c.id = new.guest_card_id and c.requester_id = new.user_id
    ) then
      raise exception 'not your guest card';
    end if;
    if new.request_invite_id is not null and (tg_op = 'INSERT' or new.request_invite_id is distinct from old.request_invite_id) and not exists (
      select 1 from public.invites i where i.id = new.request_invite_id and i.inviter_id = new.user_id
    ) then
      raise exception 'not your invite';
    end if;
  end if;
  return new;
end $$;

create trigger contacts_guard before insert or update on public.contacts for each row execute function public.contacts_guard();

-- ── 나만 보는 메모 ─────────────────────────────────────
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references "user" (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 40),
  payload jsonb not null check (pg_column_size(payload) < 8192),
  created_at timestamptz not null default now()
);

create index notes_contact_idx on public.notes (contact_id, created_at desc);

-- ── 알림 ───────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  kind text not null check (kind in ('birthday', 'anniversary', 'accepted', 'answered', 'viewed')),
  contact_id uuid references public.contacts (id) on delete cascade,
  actor_id text references "user" (id) on delete set null,
  event_date date,
  offset_days int,
  label text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  pushed_at timestamptz,
  -- 같은 생일 알림은 한 번만(다른 종류는 event_date가 null이라 겹치지 않는다)
  constraint notifications_once unique (user_id, contact_id, kind, event_date, offset_days, label)
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  user_id text not null references "user" (id) on delete cascade,
  token text not null check (char_length(token) <= 4096),
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ── 권한 ───────────────────────────────────────────────
-- 앱 역할은 우리 표만 다룬다. 로그인 표(user·session·account·verification)는 못 읽는다
grant select, insert, update, delete on public.profiles, public.card_sections, public.grants, public.invites, public.guest_cards,
  public.contacts, public.notes, public.notifications, public.push_tokens to app_user;

alter table public.profiles enable row level security;
alter table public.card_sections enable row level security;
alter table public.grants enable row level security;
alter table public.invites enable row level security;
alter table public.guest_cards enable row level security;
alter table public.contacts enable row level security;
alter table public.notes enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

-- 프로필: 나, 내게 리드미를 보여 주는 사람, 내가 리드미를 보여 준 사람(공유 관리 목록)
create policy profiles_select on public.profiles for select to app_user using (
  id = app.uid()
  or exists (select 1 from public.grants g where g.owner_id = profiles.id and g.viewer_id = app.uid() and g.revoked_at is null)
  or exists (select 1 from public.grants g where g.owner_id = app.uid() and g.viewer_id = profiles.id)
);
create policy profiles_update on public.profiles for update to app_user using (id = app.uid()) with check (id = app.uid());

create policy card_select on public.card_sections for select to app_user using (public.can_view(owner_id, section));
create policy card_insert on public.card_sections for insert to app_user with check (owner_id = app.uid());
create policy card_update on public.card_sections for update to app_user using (owner_id = app.uid()) with check (owner_id = app.uid());
create policy card_delete on public.card_sections for delete to app_user using (owner_id = app.uid());

create policy grants_select on public.grants for select to app_user using (owner_id = app.uid() or viewer_id = app.uid());
create policy grants_update on public.grants for update to app_user using (owner_id = app.uid()) with check (owner_id = app.uid());
create policy grants_delete on public.grants for delete to app_user using (owner_id = app.uid() or viewer_id = app.uid());

create policy invites_select on public.invites for select to app_user using (inviter_id = app.uid());
create policy invites_insert on public.invites for insert to app_user with check (inviter_id = app.uid());

create policy guest_select on public.guest_cards for select to app_user using (requester_id = app.uid() or claimed_by = app.uid());
create policy guest_delete on public.guest_cards for delete to app_user using (requester_id = app.uid());

create policy contacts_all on public.contacts for all to app_user using (user_id = app.uid()) with check (user_id = app.uid());

create policy notes_all on public.notes for all to app_user using (author_id = app.uid()) with check (
  author_id = app.uid() and exists (select 1 from public.contacts c where c.id = notes.contact_id and c.user_id = app.uid())
);

create policy notifications_select on public.notifications for select to app_user using (user_id = app.uid());
create policy notifications_update on public.notifications for update to app_user using (user_id = app.uid()) with check (user_id = app.uid());

create policy push_all on public.push_tokens for all to app_user using (user_id = app.uid()) with check (user_id = app.uid());

-- ── 함수 ───────────────────────────────────────────────

-- 토큰 해시나 코드로 초대를 찾는다(내부용)
create function public.find_invite(p_token_hash text, p_code text) returns public.invites
language sql stable security definer set search_path = public as $$
  select * from public.invites
  where (p_token_hash is not null and token_hash = p_token_hash)
     or (p_token_hash is null and p_code is not null and code = upper(p_code))
  limit 1;
$$;

create function public.invite_state(i public.invites) returns text language sql stable as $$
  select case
    when i.id is null then 'not_found'
    when i.canceled_at is not null then 'canceled'
    when i.used_at is not null then 'used'
    when i.expires_at <= now() then 'expired'
    else 'active'
  end;
$$;

-- 초대 미리보기(가입 전에도). 보낸 사람 이름·아바타와 무엇을 보여 주는지만
create function public.invite_preview(p_token_hash text default null, p_code text default null)
returns table (
  kind text, state text, inviter_name text, inviter_avatar jsonb, relation text, sections text[],
  recipient_name text, expires_at timestamptz, is_self boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  i public.invites;
  p public.profiles;
begin
  i := public.find_invite(p_token_hash, p_code);
  if i.id is null then
    return query select null::text, 'not_found'::text, null::text, null::jsonb, null::text, null::text[], null::text, null::timestamptz, false;
    return;
  end if;
  select * into p from public.profiles where id = i.inviter_id;
  return query select i.kind, public.invite_state(i), coalesce(p.display_name, ''), coalesce(p.avatar, '{}'::jsonb), i.relation, i.sections,
    i.recipient_name, i.expires_at, coalesce(app.uid() = i.inviter_id, false);
end $$;

-- 공유 초대 받기: 허락(grant)을 만들고 내 주소록에 넣는다. send_back이면 내 리드미도 같은 관계 기본 항목으로 돌려준다
create function public.accept_share(p_token_hash text default null, p_code text default null, p_send_back boolean default false)
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
      when 'partner' then array['safety', 'taste', 'sizes', 'gifts', 'dates']
      when 'friend' then array['safety', 'taste', 'gifts', 'dates']
      else array['safety', 'taste', 'sizes', 'dates'] end;
    insert into public.grants (owner_id, viewer_id, relation, sections)
    values (uid, i.inviter_id, i.relation, back_sections)
    on conflict (owner_id, viewer_id) do update set revoked_at = null;
    insert into public.contacts (user_id, person_id) values (i.inviter_id, uid)
    on conflict (user_id, person_id) do nothing;
  end if;

  insert into public.notifications (user_id, kind, actor_id) values (i.inviter_id, 'accepted', uid);
  return contact;
end $$;

-- 내 초대 취소(아직 안 열린 것만)
create function public.cancel_invite(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.invites set canceled_at = now()
  where id = p_id and inviter_id = app.uid() and used_at is null and canceled_at is null;
  return found;
end $$;

-- 요청 미리보기(답하는 웹 화면용, 시스템 전용): 암호화된 초안은 서버가 풀어서 보여 준다
create function public.request_for_answer(p_token_hash text)
returns table (invite_id uuid, state text, inviter_name text, recipient_name text, sections text[], prefill jsonb, message text, guest_card_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  i public.invites;
begin
  i := public.find_invite(p_token_hash, null);
  if i.id is null or i.kind <> 'request' then
    return query select null::uuid, 'not_found'::text, null::text, null::text, null::text[], null::jsonb, null::text, null::uuid;
    return;
  end if;
  return query select i.id, public.invite_state(i), (select display_name from public.profiles where id = i.inviter_id), i.recipient_name,
    i.sections, i.prefill, i.message, (select g.id from public.guest_cards g where g.invite_id = i.id);
end $$;

-- 요청에 답하기(시스템 전용). 답은 서버가 항목별로 정리·암호화해서 넘긴다
create function public.submit_request_answer(p_token_hash text, p_display_name text, p_sections jsonb, p_consent boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  i public.invites;
  card uuid;
begin
  i := public.find_invite(p_token_hash, null);
  if i.id is null or i.kind <> 'request' then raise exception 'not_found'; end if;
  perform 1 from public.invites where id = i.id for update;
  select * into i from public.invites where id = i.id;
  if public.invite_state(i) <> 'active' then raise exception '%', public.invite_state(i); end if;
  if (p_sections ? 'safety') and not p_consent then raise exception 'consent_required'; end if;

  insert into public.guest_cards (invite_id, requester_id, display_name, sections, consent_health_at)
  values (i.id, i.inviter_id, left(coalesce(p_display_name, ''), 40), p_sections, case when p_consent then now() end)
  returning id into card;

  update public.invites set used_at = now() where id = i.id;

  update public.contacts set guest_card_id = card where user_id = i.inviter_id and request_invite_id = i.id;
  if not found then
    insert into public.contacts (user_id, guest_card_id, request_invite_id, nickname) values (i.inviter_id, card, i.id, i.recipient_name);
  end if;

  insert into public.notifications (user_id, kind, contact_id, label)
  select i.inviter_id, 'answered', c.id, i.recipient_name from public.contacts c where c.user_id = i.inviter_id and c.guest_card_id = card;
  return card;
end $$;

-- 앱 없이 답한 사람이 나중에 가입해서 자기 리드미로 가져오기(답한 링크로, 30일 안에)
-- 항목 내용 복사는 서버가 다시 암호화해서 넣는다(암호화 범위가 guest → owner로 바뀌므로). 여기서는 연결만 한다
create function public.claim_guest_card(p_token_hash text) returns table (claimed_card_id uuid, claimed_requester_id text, claimed_sections text[])
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
  select uid, g.requester_id, i.relation, array(select k from jsonb_object_keys(g.sections) k where k = any (array['safety', 'taste', 'sizes', 'gifts', 'dates']))
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

-- 계정 삭제: 로그인 사용자를 지우면 모든 표가 따라 지워진다
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if app.uid() is null then raise exception 'not_signed_in'; end if;
  delete from "user" where id = app.uid();
end $$;

-- 열람 알림: viewer가 owner의 리드미를 열면, owner가 켜 둔 경우에만 하루 한 번 남긴다
create function public.record_view(p_owner text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if app.uid() is null or app.uid() = p_owner then return; end if;
  if not exists (select 1 from public.grants g where g.owner_id = p_owner and g.viewer_id = app.uid() and g.revoked_at is null) then return; end if;
  if not exists (select 1 from public.profiles where id = p_owner and notify_views) then return; end if;
  if exists (
    select 1 from public.notifications n
    where n.user_id = p_owner and n.kind = 'viewed' and n.actor_id = app.uid() and n.created_at > now() - interval '1 day'
  ) then return; end if;
  insert into public.notifications (user_id, kind, actor_id) values (p_owner, 'viewed', app.uid());
end $$;

-- 함수 실행 권한: 앱 역할은 자기 일에 필요한 것만. 시스템 전용(find_invite·request_for_answer·submit_request_answer)은 소유자만
revoke all on all functions in schema public from public;
grant execute on function public.can_view(text, text), public.invite_state(public.invites), public.invite_preview(text, text),
  public.accept_share(text, text, boolean), public.cancel_invite(uuid), public.claim_guest_card(text), public.delete_my_account(),
  public.record_view(text), public.touch_updated_at(), public.grants_guard(), public.invites_guard(), public.contacts_guard()
  to app_user;
