-- 刪除驗收用假學號 A999999901（正式班）
-- 這是 2026-10-02 上課前，用真環境走完 Week 1 + Week 2 時產生的假學生資料。
-- 正式班 class_id = 46835a99-f5ec-4119-8de5-75c7c1885bed
-- 每一句都同時指定 class_id 與 student_id，一律用 = 完全比對，不會碰到任何其他人。

begin;

-- 保險 1：要刪的那筆姓名必須是「測試用假學生」，否則中止，什麼都不刪。
do $$
begin
  if not exists (
    select 1 from public.week1_submissions
    where class_id = '46835a99-f5ec-4119-8de5-75c7c1885bed'
      and student_id = 'A999999901'
      and student_name = '測試用假學生'
  ) then
    raise exception 'A999999901 的姓名不是「測試用假學生」，已中止，沒有刪除任何資料';
  end if;
end $$;

select '刪除前' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week2,
 (select count(*) from public.week1_ai_feedback where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week1_ai,
 (select count(*) from public.week2_ai_requests where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week2_ai,
 (select count(*) from public.learning_versions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as 快照,
 (select count(*) from public.student_sessions  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as 登入;

delete from public.learning_versions  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901';
delete from public.week2_ai_requests  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901';
delete from public.week2_submissions  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901';
delete from public.week1_ai_feedback  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901';
delete from public.week1_submissions  where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901';
delete from public.student_sessions   where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901';

select '刪除後（應全為 0）' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week2,
 (select count(*) from public.week2_ai_requests where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as week2_ai,
 (select count(*) from public.learning_versions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A999999901') as 快照;

-- 保險 2：正式班人數應該回到 36；你的主帳號必須完全沒變。
select '正式班總數（week1 應為 36）' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed') as week2;
select '你的主帳號 A1130309125' as 階段,
 (select status || ' v' || version from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A1130309125') as week1,
 (select status || ' v' || version from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed' and student_id='A1130309125') as week2;

commit;
