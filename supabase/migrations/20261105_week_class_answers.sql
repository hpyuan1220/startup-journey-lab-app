-- 只有課堂兩題的週（Week 6 起；例如 11/6 跟 Week 5 同一天上、沒有自己的作答頁）：一人一週一列。
-- data jsonb＝q1、q2、q1_ai、q2_ai；stamps jsonb＝伺服器蓋的存檔時間（出席＝q1、q2 都在那一週上課時段內）＋ qai（AI 評語次數）。
-- 版本觸發器沿用 week4_bump_version。不掛 snapshot_learning（避免清測試帳號時撞版本快照唯一鍵）。
begin;

create table if not exists public.week_class_answers (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 student_id text not null,
 week integer not null check (week between 1 and 12),
 data jsonb not null default '{}'::jsonb,
 stamps jsonb not null default '{}'::jsonb,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(class_id,student_id,week)
);
drop trigger if exists week_class_answers_version on public.week_class_answers;
create trigger week_class_answers_version before update on public.week_class_answers for each row execute function public.week4_bump_version();

alter table public.week_class_answers enable row level security;
revoke all on public.week_class_answers from anon, authenticated;
grant select on public.week_class_answers to authenticated;
grant all on public.week_class_answers to service_role;
drop policy if exists teacher_scope on public.week_class_answers;
create policy teacher_scope on public.week_class_answers for select to authenticated using (public.teaches_class(class_id));

commit;

select (select count(*) from public.week_class_answers) as week_class_rows,
       (select count(*) from pg_trigger where tgrelid='public.week_class_answers'::regclass and not tgisinternal) as triggers;
