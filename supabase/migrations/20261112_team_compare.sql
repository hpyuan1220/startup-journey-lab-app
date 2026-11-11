-- Week 10 比較頁：一組一份 teams.compare（五問 × 三家計分與證據、反方三格、選定一家與理由）。任一組員可存；老師頁只讀。
begin;
alter table public.teams add column if not exists compare jsonb not null default '{}'::jsonb;
commit;
select count(*) filter (where compare<>'{}'::jsonb) as teams_with_compare, count(*) as teams from public.teams;
