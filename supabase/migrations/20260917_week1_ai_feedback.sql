-- Startup Journey Lab — Week 1 AI 學習建議
-- 只新增資料表，不修改既有資料表與政策。可重複執行。
-- 在 Supabase SQL Editor 執行一次。

create table if not exists public.week1_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id text not null,
  week_number int not null default 1,
  content_hash text not null,
  submission_updated_at timestamptz,
  feedback_json jsonb not null,
  model_name text not null default '',
  prompt_version text not null default '',
  total_readiness int not null default 0,
  teacher_hidden boolean not null default false,
  teacher_note text not null default '',
  created_at timestamptz not null default now(),
  unique (class_id, student_id, week_number, content_hash)
);

create index if not exists week1_ai_feedback_lookup_idx
  on public.week1_ai_feedback (class_id, student_id, week_number, created_at desc);

alter table public.week1_ai_feedback enable row level security;

-- 只有教師可讀；學生一律透過 Edge Function（service role）存取。
drop policy if exists "teachers read ai feedback" on public.week1_ai_feedback;
create policy "teachers read ai feedback" on public.week1_ai_feedback
  for select using (exists (select 1 from public.teacher_profiles where id = auth.uid()));

-- 教師可手動隱藏或加註不適當的 AI 回饋。
drop policy if exists "teachers moderate ai feedback" on public.week1_ai_feedback;
create policy "teachers moderate ai feedback" on public.week1_ai_feedback
  for update using (exists (select 1 from public.teacher_profiles where id = auth.uid()))
  with check (exists (select 1 from public.teacher_profiles where id = auth.uid()));

-- 教師檢視：每位學生最新一筆、未被隱藏的回饋與證據準備度。
create or replace view public.week1_ai_feedback_latest as
select distinct on (class_id, student_id, week_number)
  class_id, student_id, week_number, total_readiness, model_name,
  prompt_version, submission_updated_at, created_at, feedback_json
from public.week1_ai_feedback
where teacher_hidden = false
order by class_id, student_id, week_number, created_at desc;

-- 說明：AI 結果不寫入任何成績欄位，正式成績仍由教師決定。
