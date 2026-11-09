-- AI 新創群島尋寶：一人一列，整包進度（方向、候選、每箱的找島／三題／網址／探索／估價／開箱時間）存 data jsonb。
-- 學生端 localStorage 當快取，每次存檔同步到這裡；老師頁只讀（看誰開了哪些箱）。不進成績。
begin;

create table if not exists public.islands_progress (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 student_id text not null,
 data jsonb not null default '{}'::jsonb,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(class_id,student_id)
);
drop trigger if exists islands_progress_version on public.islands_progress;
create trigger islands_progress_version before update on public.islands_progress for each row execute function public.week4_bump_version();

alter table public.islands_progress enable row level security;
revoke all on public.islands_progress from anon, authenticated;
grant select on public.islands_progress to authenticated;
grant all on public.islands_progress to service_role;
drop policy if exists teacher_scope on public.islands_progress;
create policy teacher_scope on public.islands_progress for select to authenticated using (public.teaches_class(class_id));

commit;

select (select count(*) from public.islands_progress) as islands_rows,
       (select count(*) from pg_trigger where tgrelid='public.islands_progress'::regclass and not tgisinternal) as triggers;
