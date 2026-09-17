-- Run once in Supabase SQL Editor before deploying the updated Week 1 form.
alter table public.week1_submissions
  add column if not exists verbatim_complaint text not null default '',
  add column if not exists observed_context text not null default '',
  add column if not exists interview_next_question text not null default '';
