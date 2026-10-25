-- Week 5 三個機會比一比：一人一列。data jsonb＝學生填的（q1、q2、q1_ai、q2_ai、opps、scores、choice、rebuttal、page），
-- stamps jsonb＝每個欄位最後一次有內容變動的時間（伺服器蓋章）。出席＝q1、q2 的章落在上課時段內。
-- 版本觸發器沿用 Week 4 的 week4_bump_version（只看 data／stamps 有沒有變）；快照沿用 snapshot_learning('5')。
begin;

create table if not exists public.week5_compare (
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
drop trigger if exists week5_version on public.week5_compare;
create trigger week5_version before update on public.week5_compare for each row execute function public.week4_bump_version();
drop trigger if exists week5_snapshot on public.week5_compare;
create trigger week5_snapshot after insert or update on public.week5_compare for each row execute function public.snapshot_learning('5');

alter table public.week5_compare enable row level security;
revoke all on public.week5_compare from anon, authenticated;
grant select on public.week5_compare to authenticated;
grant all on public.week5_compare to service_role;
drop policy if exists teacher_scope on public.week5_compare;
create policy teacher_scope on public.week5_compare for select to authenticated using (public.teaches_class(class_id));

commit;

select (select count(*) from public.week5_compare) as week5_rows,
       (select count(*) from pg_trigger where tgrelid='public.week5_compare'::regclass and not tgisinternal) as triggers;
