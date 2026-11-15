-- 방향 바꿈(2026-11-15): 남이 허락한 리드미를 "보는" 대신, 사람마다 내 기록(contact_cards) 하나를 둔다.
-- 물어보기에 상대가 답하면 그 답이 내 기록에 들어가고, 그 뒤로는 내가 고친다.
-- 이 파일은 지우지 않고 더하기만 한다. 다음 순서:
--   1) 0012(이 파일): 기록에 '답한 때' 칸, 물어보기에 '누구에게' 칸
--   2) scripts/records-copy.mts: 공유받던 리드미·앱 없이 받은 답을 내 기록으로 복사(암호화 범위가 바뀌어 서버 키로 다시 암호화)
--   3) 0013: 공유 허락·공유 링크·손님 카드를 없앤다(2를 안 했으면 멈춘다)

-- 항목별로 상대가 답한 때 {"sizes": "2026-11-15T…"}. 내가 그 항목을 고치면 지운다
alter table public.contact_cards add column answered jsonb not null default '{}'::jsonb check (jsonb_typeof(answered) = 'object');

-- 물어보기는 주소록의 한 사람에게 간다(같은 사람에게 여러 번 물어볼 수 있다)
alter table public.invites add column contact_id uuid references public.contacts (id) on delete cascade;
update public.invites i set contact_id = c.id from public.contacts c where c.request_invite_id = i.id;
create index invites_contact_idx on public.invites (contact_id, created_at desc);
