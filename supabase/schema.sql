-- Startup Journey Lab — Week 1 MVP. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create type public.app_role as enum ('teacher');
create type public.submission_status as enum ('draft', 'submitted');
create table public.classes (id uuid primary key default gen_random_uuid(), name text not null, invite_code_hash text not null, created_at timestamptz not null default now());
create table public.teacher_profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '教師', role public.app_role not null default 'teacher', created_at timestamptz not null default now());
create table public.student_sessions (id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade, student_id text not null, token_hash text not null unique, expires_at timestamptz not null, created_at timestamptz not null default now(), unique(class_id, student_id));
create table public.week1_submissions (id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id) on delete cascade, student_id text not null, student_name text not null default '', team_preference text not null default '', verbatim_complaint text not null default '', observed_context text not null default '', observed_problem text not null default '', affected_user text not null default '', known_fact text not null default '', unverified_assumption text not null default '', interview_next_question text not null default '', expected_learning text not null default '', concern text not null default '', consent_to_share_in_class boolean not null default false, status public.submission_status not null default 'draft', teacher_note text not null default '', needs_follow_up boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), submitted_at timestamptz, unique(class_id, student_id));
create index week1_submissions_class_status_idx on public.week1_submissions(class_id, status);
alter table public.classes enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.student_sessions enable row level security;
alter table public.week1_submissions enable row level security;
create policy "teachers read profiles" on public.teacher_profiles for select using (auth.uid() = id);
create policy "teachers read classes" on public.classes for select using (exists (select 1 from public.teacher_profiles where id = auth.uid()));
create policy "teachers read submissions" on public.week1_submissions for select using (exists (select 1 from public.teacher_profiles where id = auth.uid()));
create policy "teachers update submissions" on public.week1_submissions for update using (exists (select 1 from public.teacher_profiles where id = auth.uid())) with check (exists (select 1 from public.teacher_profiles where id = auth.uid()));
create or replace function public.week1_teacher_summary() returns table(total bigint, drafts bigint, submitted bigint, follow_ups bigint) language sql stable security invoker as $$ select count(*), count(*) filter (where status = 'draft'), count(*) filter (where status = 'submitted'), count(*) filter (where needs_follow_up) from public.week1_submissions; $$;
grant execute on function public.week1_teacher_summary() to authenticated;
create or replace function public.validate_class_invite(p_invite_code text) returns uuid language sql stable security definer set search_path = public, extensions as $$ select id from public.classes where invite_code_hash = extensions.crypt(p_invite_code, invite_code_hash) limit 1; $$;
revoke all on function public.validate_class_invite(text) from public;
-- Create the class after choosing a long code:
-- insert into public.classes (name, invite_code_hash) values ('Startup Journey Lab 2026', extensions.crypt('CHANGE_ME', extensions.gen_salt('bf')));
-- Create your teacher in Authentication > Users, then:
-- insert into public.teacher_profiles (id, display_name) values ('YOUR_AUTH_USER_UUID', 'Irene');
