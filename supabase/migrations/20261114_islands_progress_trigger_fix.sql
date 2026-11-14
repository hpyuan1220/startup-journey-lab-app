-- 修 bug（2026-11-14 實機測出）：islands_progress 沒有 stamps 欄，但 20261109 把更新觸發器接到 week4_bump_version（會讀 new.stamps），
-- 所以第一次存（insert）成功、之後每次存（update）都丟 record "new" has no field "stamps" → 學生畫面「沒存到雲端，重試中」。
-- 改用 teams 用的 bump_version_touch（只加版本、蓋時間）。可重複執行。
begin;
drop trigger if exists islands_progress_version on public.islands_progress;
create trigger islands_progress_version before update on public.islands_progress for each row execute function public.bump_version_touch();
commit;

-- 確認：觸發器掛的是 bump_version_touch；然後實際 update 一次自己的列不會錯（用老師測試帳號）
select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.islands_progress'::regclass and not tgisinternal;
update public.islands_progress set data = data where student_id='A1130309125' returning student_id, version, updated_at;
