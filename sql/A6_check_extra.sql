-- A6 補充檢查（同樣只讀）。三個問題一次問完：

-- 1. teaches_class() 這個函式到底存不存在？
select case when count(*)>0 then '✅ teaches_class 函式存在'
            else '❌ 函式不存在 —— 20260927b 幾乎確定沒跑' end as 函式狀態
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='teaches_class';

-- 2. 每位老師被授權了幾個班？（沒有任何授權 = migration 的前置守衛會擋下）
select count(*) as 教師班級授權筆數,
       count(distinct teacher_id) as 老師人數,
       count(distinct class_id)   as 班級數
from public.teacher_classes;

-- 3. 有沒有「已經有學生資料、卻沒有授權任何老師」的班級？
--    （這正是 20260927b 第 5 行會 raise exception 中止的條件）
select c.id as 未授權班級, count(s.*) as 學生筆數
from public.classes c
join public.week1_submissions s on s.class_id=c.id
where not exists (select 1 from public.teacher_classes tc where tc.class_id=c.id)
group by c.id;
