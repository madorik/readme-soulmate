-- 그룹 → 폴더. 한 사람이 여러 폴더에 들어간다(예: 아내 = 가족·연인·여행메이트).
-- 폴더 = contact_groups(이름은 그대로 두고 모양 icon·색 color를 더한다), 들어 있는 사람 = contact_group_members.
-- contacts.group_id는 이 이관 뒤로 앱이 쓰지 않는다(배포 사이에 예전 앱이 깨지지 않게 남겨 두고, 다음에 지운다).

alter table public.contact_groups
  add column icon text not null default 'star' check (icon in ('heart', 'star', 'home', 'work', 'plane', 'gift', 'cake', 'cup')),
  add column color text not null default 'lavender' check (color in ('mango', 'pink', 'peach', 'mint', 'lavender', 'sky'));

-- 기본 폴더 모양·색: 가족 집·망고, 회사 가방·하늘, 연인 하트·분홍, 친구들 별·민트
update public.contact_groups set
  icon = case builtin when 'family' then 'home' when 'work' then 'work' when 'partner' then 'heart' else 'star' end,
  color = case builtin when 'family' then 'mango' when 'work' then 'sky' when 'partner' then 'pink' else 'mint' end
where builtin is not null;

create table public.contact_group_members (
  group_id uuid not null references public.contact_groups (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  user_id text not null references "user" (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, contact_id)
);

create index contact_group_members_contact_idx on public.contact_group_members (contact_id);
create index contact_group_members_user_idx on public.contact_group_members (user_id);

grant select, insert, update, delete on public.contact_group_members to app_user;
alter table public.contact_group_members enable row level security;
create policy contact_group_members_all on public.contact_group_members for all to app_user using (user_id = app.uid()) with check (user_id = app.uid());

-- 내 폴더에 내 사람만 넣는다(남의 폴더·남의 사람 id를 못 넣게)
create function public.contact_group_members_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.contact_groups g where g.id = new.group_id and g.user_id = new.user_id)
     or not exists (select 1 from public.contacts c where c.id = new.contact_id and c.user_id = new.user_id) then
    raise exception 'not your folder';
  end if;
  return new;
end $$;

create trigger contact_group_members_guard before insert or update on public.contact_group_members for each row execute function public.contact_group_members_guard();
revoke all on function public.contact_group_members_guard() from public;

-- 지금 그룹에 든 사람은 그 폴더에 그대로
insert into public.contact_group_members (group_id, contact_id, user_id)
select c.group_id, c.id, c.user_id from public.contacts c where c.group_id is not null
on conflict do nothing;

-- Supabase Data API가 새 표를 열지 않게(0006과 같은 방침)
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.contact_group_members from %I', r);
    end if;
  end loop;
end $$;
