-- 清理負載測試班：「系統驗收測試班 20260927（非正式學生）」
-- class_id = 281c5ac4-955c-4b94-84aa-0f34fd5c7e2c
--
-- 這個班的 50 筆 Week 1 + 50 筆 Week 2 全是合成資料，沒有授權任何老師。
-- 正式班是 46835a99-f5ec-4119-8de5-75c7c1885bed，以下每一句都只刪測試班，絕不碰它。
--
-- 用法：整段貼進 SQL Editor 按 Run。它會先顯示刪除前的筆數、刪除、再顯示刪除後的筆數。
-- 若最後一段不是全部 0，請把結果貼給我，不要自己再跑第二次。

begin;

-- 保險：如果這個 id 不是那個測試班，直接中止，什麼都不刪。
do $$
begin
  if not exists (
    select 1 from public.classes
    where id = '281c5ac4-955c-4b94-84aa-0f34fd5c7e2c'
      and name like '%測試%'
  ) then
    raise exception '這個 class_id 不是測試班，已中止，沒有刪除任何資料';
  end if;
end $$;

-- 刪除前的筆數
select '刪除前' as 階段,
 (select count(*) from public.week1_submissions  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as week1,
 (select count(*) from public.week1_ai_feedback  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as week1_ai,
 (select count(*) from public.week2_submissions  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as week2,
 (select count(*) from public.week2_ai_requests  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as week2_ai,
 (select count(*) from public.learning_versions  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as 版本快照,
 (select count(*) from public.student_sessions   where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as 登入,
 (select count(*) from public.week2_settings     where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as 設定;

delete from public.learning_versions  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.week2_ai_requests  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.week2_submissions  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.week2_settings     where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.week1_ai_feedback  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.week1_submissions  where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.student_sessions   where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.teacher_classes    where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';
delete from public.classes            where id      ='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c';

-- 刪除後應該全部是 0，正式班的數字必須完全沒變
select '刪除後（測試班，應全為 0）' as 階段,
 (select count(*) from public.week1_submissions where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as week1,
 (select count(*) from public.week2_submissions where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as week2,
 (select count(*) from public.learning_versions where class_id='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as 版本快照,
 (select count(*) from public.classes           where id      ='281c5ac4-955c-4b94-84aa-0f34fd5c7e2c') as 班級;

select '正式班（應維持 37 / 2）' as 階段,
 (select count(*) from public.week1_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed') as week1,
 (select count(*) from public.week2_submissions where class_id='46835a99-f5ec-4119-8de5-75c7c1885bed') as week2;

commit;
