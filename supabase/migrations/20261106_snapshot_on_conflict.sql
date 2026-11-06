-- 修正「資料讀寫失敗」：learning_versions 留著同一週同一版的舊快照時（例如學生的作業列被刪掉、或測試帳號清資料只清了主表），
-- 學生再存檔會建立第 1 版 → 快照又寫第 1 版 → 撞唯一鍵 → 整筆存檔被退回。
-- 2026-11-06 A113270021 的 Week 4 就是這樣：learning_versions 有 10/19 的 week 4 v1，但 week4_research 沒有她的列，存 6 次都失敗。
-- 修法：快照遇到同一版已存在就略過（on conflict do nothing）。不刪資料、不改任何學生內容；所有週一起生效。
create or replace function public.snapshot_learning() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP = 'UPDATE' and new.version = old.version then
   return new;
 end if;
 insert into public.learning_versions(class_id,student_id,week,version,snapshot)
 values(new.class_id,new.student_id,TG_ARGV[0]::integer,new.version,to_jsonb(new))
 on conflict do nothing;
 return new;
end $$;

select prosrc like '%on conflict do nothing%' as fixed from pg_proc where proname='snapshot_learning';
