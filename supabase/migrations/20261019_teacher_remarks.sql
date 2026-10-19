-- 老師備註（學生看不到）：每位學生每週一格，快速標記（積極／普通／沒參與／缺席）＋一句備註，當評分參考。
-- 只有教師帳號（teaches_class）讀得到；寫入走 Edge Function（service_role）。學生端任何 API 都不回傳這張表。
begin;

create table if not exists public.teacher_remarks (
 class_id uuid not null references public.classes(id),
 student_id text not null,
 week integer not null check (week between 1 and 12),
 tag text not null default '' check (tag in ('', 'active', 'normal', 'passive', 'absent')),
 note text not null default '' check (char_length(note) <= 500),
 updated_at timestamptz not null default now(),
 primary key (class_id, student_id, week)
);
alter table public.teacher_remarks enable row level security;
revoke all on public.teacher_remarks from anon, authenticated;
grant select on public.teacher_remarks to authenticated;
grant all on public.teacher_remarks to service_role;
drop policy if exists teacher_scope on public.teacher_remarks;
create policy teacher_scope on public.teacher_remarks for select to authenticated using (public.teaches_class(class_id));

commit;

select count(*) as remark_rows from public.teacher_remarks;
