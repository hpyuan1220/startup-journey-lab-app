-- 班級名單：登入時擋掉不在名單上的學號（student-api 讀這張表）。
-- 只建表，不含任何學生資料；名單用另一段私有 SQL 匯入（docs/private/，不進 git）。
begin;

create table if not exists public.class_roster (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id text not null,
  student_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (class_id, student_id),
  constraint class_roster_student_id_format check (student_id = upper(btrim(student_id)) and student_id !~ '\s')
);

alter table public.class_roster enable row level security;
revoke all on public.class_roster from anon, authenticated;
grant select on public.class_roster to authenticated;
grant all on public.class_roster to service_role;
drop policy if exists teacher_scope on public.class_roster;
create policy teacher_scope on public.class_roster for select to authenticated using (public.teaches_class(class_id));

commit;

select count(*) as roster_rows from public.class_roster;
