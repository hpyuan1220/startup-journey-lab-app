-- 修正：week4_research 不能沿用 bump_learning_version（那個函式會讀 submitted_at 等 Week 2／3 才有的欄位，
-- 導致 UPDATE 一律失敗「資料讀寫失敗」）。改用 Week 4 自己的版本觸發器：data 或 stamps 有變才 +1。
-- 2026-10-18 已在正式庫執行；正式站以測試學號驗證 insert→update→update 版本 1→2→3、同內容不跳版、舊版本 409。
begin;

create or replace function public.week4_bump_version() returns trigger language plpgsql set search_path=public as $$
begin
 if new.data is distinct from old.data or new.stamps is distinct from old.stamps then
   new.version := old.version + 1;
 else
   new.version := old.version;
 end if;
 new.updated_at := now();
 return new;
end $$;

drop trigger if exists week4_version on public.week4_research;
create trigger week4_version before update on public.week4_research for each row execute function public.week4_bump_version();

commit;

select tgname, tgenabled from pg_trigger where tgrelid='public.week4_research'::regclass and not tgisinternal;
