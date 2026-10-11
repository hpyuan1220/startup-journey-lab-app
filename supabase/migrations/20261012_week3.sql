-- Week 3 訪談紀錄卡。結構比照 week2_submissions：一人一列、版本號、快照到 learning_versions（week=3）。
-- record jsonb：{interviews:[{who,role,when_where,quotes,cost,workaround,surprise,fits}×3], judgment, learned, statement}
begin;

create table if not exists public.week3_submissions (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 student_id text not null,
 record jsonb not null,
 status text not null default 'draft' check(status in ('draft','submitted')),
 version integer not null default 1,
 review_status text not null default 'pending' check(review_status in ('pending','approved','revision','hold')),
 teacher_note text not null default '',
 teacher_target text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz,
 unique(class_id,student_id)
);

-- 與 week2 同一組觸發器：學生改內容才跳版本；教師欄位不跳；每個新版本快照一份。
drop trigger if exists week3_version on public.week3_submissions;
create trigger week3_version before update on public.week3_submissions for each row execute function public.bump_learning_version();
drop trigger if exists week3_snapshot on public.week3_submissions;
create trigger week3_snapshot after insert or update on public.week3_submissions for each row execute function public.snapshot_learning('3');

alter table public.week3_submissions enable row level security;
revoke all on public.week3_submissions from anon, authenticated;
grant select on public.week3_submissions to authenticated;
grant all on public.week3_submissions to service_role;
drop policy if exists teacher_scope on public.week3_submissions;
create policy teacher_scope on public.week3_submissions for select to authenticated using (public.teaches_class(class_id));

commit;

select count(*) as week3_rows from public.week3_submissions;
