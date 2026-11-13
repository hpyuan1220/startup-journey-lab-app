-- 課堂題數 2–5：week_questions 多一欄 extra（第 3–5 題，jsonb 陣列，老師在教師洞察填；留白用程式預設）。
-- 沒跑這支也能用：程式預設的第 3–5 題照常出現，只是老師不能在頁面上改第 3 題以後。
alter table public.week_questions add column if not exists extra jsonb not null default '[]'::jsonb;
select count(*) as question_rows, count(*) filter (where jsonb_array_length(extra)>0) as with_extra from public.week_questions;
