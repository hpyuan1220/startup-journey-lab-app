-- Week 8 建組：teams（一組一列：組碼、組名、產業線、老師鎖定）、team_members（一人一列：在哪一組、認領的方向、想被分組）。
-- 學生端只經由 Edge Function（service_role）讀寫；老師頁可讀。
begin;
create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 code text not null,
 name text not null,
 industry jsonb not null default '{"card":null,"custom":""}'::jsonb,
 locked boolean not null default false,
 created_by text not null default '',
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(class_id,code)
);
create table if not exists public.team_members (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 student_id text not null,
 team_id uuid references public.teams(id) on delete set null,
 directions integer[] not null default '{}',
 wants_assignment boolean not null default false,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(class_id,student_id)
);
create index if not exists team_members_team_idx on public.team_members(class_id,team_id);
-- 這兩張表沒有 data／stamps 欄，不能用 week4_bump_version；用簡單的版本＋時間觸發器。
create or replace function public.bump_version_touch() returns trigger language plpgsql set search_path=public as $$
begin new.version := old.version + 1; new.updated_at := now(); return new; end $$;
drop trigger if exists teams_version on public.teams;
create trigger teams_version before update on public.teams for each row execute function public.bump_version_touch();
drop trigger if exists team_members_version on public.team_members;
create trigger team_members_version before update on public.team_members for each row execute function public.bump_version_touch();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
revoke all on public.teams, public.team_members from anon, authenticated;
grant select on public.teams, public.team_members to authenticated;
grant all on public.teams, public.team_members to service_role;
drop policy if exists teacher_scope on public.teams;
create policy teacher_scope on public.teams for select to authenticated using (public.teaches_class(class_id));
drop policy if exists teacher_scope on public.team_members;
create policy teacher_scope on public.team_members for select to authenticated using (public.teaches_class(class_id));
commit;

select (select count(*) from public.teams) as teams,(select count(*) from public.team_members) as members,
 (select count(*) from pg_trigger where tgrelid='public.teams'::regclass and not tgisinternal) as triggers;
