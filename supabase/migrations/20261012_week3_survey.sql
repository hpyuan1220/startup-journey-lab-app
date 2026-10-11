-- 全班痛點普查：題目（老師可改）＋每人每題一列回答。沒有任何學生姓名；代稱由學生自填。
begin;

create table if not exists public.week3_survey_topics (
 class_id uuid not null references public.classes(id) on delete cascade,
 topic_id integer not null check(topic_id between 1 and 99),
 label text not null,
 hint text not null default '',
 active boolean not null default true,
 sort integer not null default 0,
 updated_at timestamptz not null default now(),
 primary key (class_id, topic_id)
);

create table if not exists public.week3_survey_responses (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id) on delete cascade,
 student_id text not null,
 topic_id integer not null,
 experienced boolean not null default false,
 last_time text not null default '',
 cost text not null default '',
 workaround text not null default '',
 willing boolean not null default false,
 alias text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (class_id, student_id, topic_id)
);
create index if not exists week3_survey_responses_scope on public.week3_survey_responses(class_id, topic_id);

do $$ declare t text; begin foreach t in array array['week3_survey_topics','week3_survey_responses'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('drop policy if exists teacher_scope on public.%I',t);
 execute format('create policy teacher_scope on public.%I for select to authenticated using(public.teaches_class(class_id))',t);
end loop; end $$;

commit;

select (select count(*) from public.week3_survey_topics) as topics, (select count(*) from public.week3_survey_responses) as responses;
