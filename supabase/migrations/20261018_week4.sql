-- Week 4 第一輪研究：一人一列。data jsonb＝學生填的（pain、industry、q1、q2、q1_ai、q2_ai、card1–3），
-- stamps jsonb＝每個欄位最後一次有內容變動的時間（伺服器蓋章，學生改不了）。出席＝q1、q2 的章落在上課時段內。
-- week_questions：每週課堂兩題與「講義重點」，老師隨時可改；沒有列就用程式裡的預設。
begin;

create table if not exists public.week4_research (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 student_id text not null,
 data jsonb not null default '{}'::jsonb,
 stamps jsonb not null default '{}'::jsonb,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(class_id,student_id)
);
-- 與 week2／week3 同一組觸發器：內容有變才跳版本；每個新版本快照一份到 learning_versions（week=4）。
drop trigger if exists week4_version on public.week4_research;
create trigger week4_version before update on public.week4_research for each row execute function public.bump_learning_version();
drop trigger if exists week4_snapshot on public.week4_research;
create trigger week4_snapshot after insert or update on public.week4_research for each row execute function public.snapshot_learning('4');

alter table public.week4_research enable row level security;
revoke all on public.week4_research from anon, authenticated;
grant select on public.week4_research to authenticated;
grant all on public.week4_research to service_role;
drop policy if exists teacher_scope on public.week4_research;
create policy teacher_scope on public.week4_research for select to authenticated using (public.teaches_class(class_id));

create table if not exists public.week_questions (
 class_id uuid not null references public.classes(id),
 week integer not null check (week between 1 and 12),
 q1 text not null default '',
 q2 text not null default '',
 points text not null default '',
 updated_at timestamptz not null default now(),
 primary key(class_id,week)
);
alter table public.week_questions enable row level security;
revoke all on public.week_questions from anon, authenticated;
grant select on public.week_questions to authenticated;
grant all on public.week_questions to service_role;
drop policy if exists teacher_scope on public.week_questions;
create policy teacher_scope on public.week_questions for select to authenticated using (public.teaches_class(class_id));

commit;

select (select count(*) from public.week4_research) as week4_rows,(select count(*) from public.week_questions) as question_rows;
