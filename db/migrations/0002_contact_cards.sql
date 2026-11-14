-- ── 내가 직접 적어 둔 사람의 리드미 ─────────────────────
-- 앱을 쓰지 않는 사람도 메모장처럼 주소록에 넣고 취향·알레르기·사이즈·선물·생일을 적어 둔다.
-- 주소록 칸(contacts) 하나에 카드 하나. 적은 사람만 보고(상대에게도 안 보인다), 항목은 서버가 암호화해서 넣는다(aad.contact).
create table public.contact_cards (
  contact_id uuid primary key references public.contacts (id) on delete cascade,
  author_id text not null references "user" (id) on delete cascade,
  sections jsonb not null default '{}'::jsonb check (jsonb_typeof(sections) = 'object' and pg_column_size(sections) < 65536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_cards_author_idx on public.contact_cards (author_id);
create trigger contact_cards_touch before update on public.contact_cards for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.contact_cards to app_user;
alter table public.contact_cards enable row level security;

-- 내 주소록 칸에만, 내 이름으로만
create policy contact_cards_all on public.contact_cards for all to app_user using (author_id = app.uid()) with check (
  author_id = app.uid() and exists (select 1 from public.contacts c where c.id = contact_cards.contact_id and c.user_id = app.uid())
);
