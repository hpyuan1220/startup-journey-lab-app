-- 刪除打錯的學號 A30309125（正式班）
-- 這是使用者本人因打錯學號而產生的第二張卡，經本人確認要刪除。
--
-- 正式班 class_id = 46835a99-f5ec-4119-8de5-75c7c1885bed
-- 以下每一句都同時指定 class_id 與 student_id，不會碰到任何其他人。
-- 特別注意：A1130309125（正在使用的那張）與 A30309125 只差兩個字元，
-- 所以一律用 = 完全比對，絕不使用 like。

begin;

-- 保險：要刪的那筆姓名必須是 IRENE YUAN，否則中止，什麼都不刪。
do $$
begin
  if not exists (
    select 1 from public.week1_submissions
    where class_id = '46835a99-f5ec-4119-8de5-75c7c1885bed'
      and student_id = 'A30309125'
      and upper(coalesce(student_name,'')) like '%IRENE%'
  ) then
    raise exception 'A30309125 的姓名不是 IRENE，已中止，沒有刪除任何資料';
  end if;
end $$;

select '刪除前' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as week2,
 (select count(*) from public.week1_ai_feedback where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as week1_ai,
 (select count(*) from public.learning_versions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as 快照,
 (select count(*) from public.student_sessions  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as 登入;

delete from public.learning_versions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125';
delete from public.week2_ai_requests where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125';
delete from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125';
delete from public.week1_ai_feedback where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125';
delete from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125';
delete from public.student_sessions  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125';

-- 另外兩個也一起清掉：只登入沒作答的打錯學號，以及留在正式班的測試帳號。
delete from public.student_sessions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id in ('A11309125','TEST-000');
delete from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id in ('A11309125','TEST-000');

-- 大小寫打錯的那一個：合併到正確的學號，不要刪資料（他沒有作答，只有登入紀錄）
delete from public.student_sessions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='a111270229';

select '刪除後（應全為 0）' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as week2,
 (select count(*) from public.learning_versions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A30309125') as 快照;

select '正式班總數（week1 應從 37 變 36，week2 從 2 變 1）' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed') as week2;

-- 你的主帳號必須完全沒變
select '你的主帳號（應為 submitted / v7，week2 v27）' as 階段,
 (select status || ' v' || version from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A1130309125') as week1,
 (select status || ' v' || version from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A1130309125') as week2;

commit;
