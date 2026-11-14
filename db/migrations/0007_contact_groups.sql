-- 사람들 그룹과 즐겨찾기.
-- 그룹: 사람마다 기본 그룹 네 개(가족·회사·연인·친구들, builtin 코드로 두고 이름은 화면 언어로)와 직접 만든 그룹.
--   기본 그룹은 처음 쓸 때 앱이 만든다(unique (user_id, builtin)로 한 번만). 사람(주소록 칸)은 그룹 하나에 들어간다.
-- 즐겨찾기: 주소록 칸마다 켜고 끈다(사람들 맨 위에 고정).
create table public.contact_groups (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  builtin text check (builtin in ('family', 'work', 'partner', 'friends')),
  name text not null default '' check (char_length(name) <= 30),
  created_at timestamptz not null default now(),
  unique (user_id, builtin),
  check (builtin is not null or char_length(btrim(name)) > 0)
);

create index contact_groups_user_idx on public.contact_groups (user_id);

alter table public.contacts add column group_id uuid references public.contact_groups (id) on delete set null;
alter table public.contacts add column favorite boolean not null default false;

grant select, insert, update, delete on public.contact_groups to app_user;
alter table public.contact_groups enable row level security;
create policy contact_groups_all on public.contact_groups for all to app_user using (user_id = app.uid()) with check (user_id = app.uid());

-- 기본 그룹은 이름을 바꾸거나 지울 수 없다(화면 언어로 이름을 붙인다)
create function public.contact_groups_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.builtin is not null and current_user = 'app_user' then raise exception 'builtin group'; end if;
    return old;
  end if;
  if new.user_id <> old.user_id or new.builtin is distinct from old.builtin then raise exception 'group owner/builtin cannot change'; end if;
  if old.builtin is not null and new.name <> old.name then raise exception 'builtin group'; end if;
  return new;
end $$;

create trigger contact_groups_guard before update or delete on public.contact_groups for each row execute function public.contact_groups_guard();
revoke all on function public.contact_groups_guard() from public;

-- 주소록 칸의 그룹은 내 그룹만(남의 그룹 id를 넣지 못하게). 나머지 검사는 0001과 같다
create or replace function public.contacts_guard() returns trigger language plpgsql set search_path = public as $$
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
  if new.group_id is not null and (tg_op = 'INSERT' or new.group_id is distinct from old.group_id) and not exists (
    select 1 from public.contact_groups g where g.id = new.group_id and g.user_id = new.user_id
  ) then
    raise exception 'not your group';
  end if;
  return new;
end $$;

-- Supabase Data API가 새 표를 열지 않게(0006과 같은 방침)
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.contact_groups from %I', r);
    end if;
  end loop;
end $$;
