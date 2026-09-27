begin;
create table if not exists public.teacher_classes (
 teacher_id uuid not null references public.teacher_profiles(id), class_id uuid not null references public.classes(id), primary key(teacher_id,class_id)
);
alter table public.teacher_classes enable row level security;
create policy "own assignments" on public.teacher_classes for select to authenticated using(teacher_id=auth.uid());
grant select on public.teacher_classes to authenticated;
create or replace function public.teaches_class(cid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from teacher_classes where teacher_id=auth.uid() and class_id=cid) $$;
revoke all on function public.teaches_class(uuid) from public;
grant execute on function public.teaches_class(uuid) to authenticated;
-- Assignments MUST be populated explicitly by the administrator before enabling scoped policies.
create table public.week2_settings (
 class_id uuid primary key references public.classes(id), course_mode text not null default 'guided', ai_support_level text not null default 'guided_options', teacher_review_policy text not null default 'sample_review', weekly_ai_limit integer check(weekly_ai_limit between 0 and 10), topic_pack_id text not null default 'startup-week2', rules_version text not null default 'w2-20260927'
);
create table public.week2_submissions (
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classes(id),student_id text not null,
 card jsonb not null, status text not null default 'draft' check(status in ('draft','submitted')),
 version integer not null default 1, attempts integer not null default 0,
 rules_version text not null default 'w2-20260927', review_status text not null default 'pending' check(review_status in ('pending','approved','revision','hold')),
 teacher_note text not null default '', ai_help boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),submitted_at timestamptz,
 unique(class_id,student_id)
);
create table public.learning_versions (
 id bigint generated always as identity primary key, class_id uuid not null references public.classes(id),student_id text not null,week integer not null,version integer not null,snapshot jsonb not null,created_at timestamptz not null default now(),unique(class_id,student_id,week,version)
);
alter table public.week1_submissions add column if not exists version integer not null default 1;
insert into public.learning_versions(class_id,student_id,week,version,snapshot) select class_id,student_id,1,version,to_jsonb(s) from public.week1_submissions s on conflict do nothing;
-- A separate BEFORE UPDATE trigger is required: upsert also fires BEFORE INSERT,
-- which must not create a duplicate version before ON CONFLICT resolves.
create function public.bump_learning_version() returns trigger language plpgsql set search_path=public as $$
begin
 new.version=old.version+1;
 if old.submitted_at is not null then new.submitted_at=old.submitted_at;end if;
 new.updated_at=now();return new;
end $$;
create function public.snapshot_learning() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.learning_versions(class_id,student_id,week,version,snapshot) values(new.class_id,new.student_id,TG_ARGV[0]::integer,new.version,to_jsonb(new));
 return new;
end $$;
create trigger week1_version before update on public.week1_submissions for each row execute function public.bump_learning_version();
create trigger week2_version before update on public.week2_submissions for each row execute function public.bump_learning_version();
create trigger week1_snapshot after insert or update on public.week1_submissions for each row execute function public.snapshot_learning('1');
create trigger week2_snapshot after insert or update on public.week2_submissions for each row execute function public.snapshot_learning('2');
create table public.week2_ai_requests (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id), student_id text not null,week integer not null default 2,
 content_hash text not null,kind text not null check(kind in ('explore','review')),model text not null,prompt_version text not null,submission_version integer,
 state text not null default 'pending' check(state in ('pending','complete','failed')), feedback jsonb, tokens integer not null default 0, created_at timestamptz not null default now(),unique(class_id,student_id,content_hash)
);
create index week2_ai_scope on public.week2_ai_requests(class_id,student_id,created_at);
do $$ declare t text; begin foreach t in array array['week2_settings','week2_submissions','learning_versions','week2_ai_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy teacher_scope on public.%I for select to authenticated using(public.teaches_class(class_id))',t);
end loop;end $$;
-- Writes use the authenticated edge endpoint with explicit class checks and allowlists.
create function public.reserve_week2_ai(cid uuid,sid text,h text,k text,m text,p text,v integer,lim integer) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;begin
 if lim is null or lim<0 or lim>10 then raise exception 'invalid limit';end if;
 perform pg_advisory_xact_lock(hashtextextended(cid::text||':'||sid,0));
 if exists(select 1 from week2_ai_requests where class_id=cid and student_id=sid and content_hash=h) then return null;end if;
 if (select count(*) from week2_ai_requests where class_id=cid and student_id=sid)>=lim then return null;end if;
 insert into week2_ai_requests(class_id,student_id,content_hash,kind,model,prompt_version,submission_version) values(cid,sid,h,k,m,p,v) returning id into rid;return rid;
end $$;
revoke all on function public.reserve_week2_ai(uuid,text,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_week2_ai(uuid,text,text,text,text,text,integer,integer) to service_role;
commit;
