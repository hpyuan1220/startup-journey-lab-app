-- 方向代表：team_members.reps jsonb，{"2":"owner"}（方向→公司 id）。由學生在群島情報袋「設為我的代表」寫入；老師頁與 Week 9 組卡三格讀。
begin;
alter table public.team_members add column if not exists reps jsonb not null default '{}'::jsonb;
commit;
select count(*) filter (where reps<>'{}'::jsonb) as members_with_reps, count(*) as members from public.team_members;
