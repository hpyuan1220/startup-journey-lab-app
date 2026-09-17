-- 修正：week1_ai_feedback_latest 檢視表繞過 RLS
--
-- 問題：Postgres 檢視表預設以「擁有者」權限執行，不套用呼叫者的 RLS；
-- 而 Supabase 預設會把 public schema 的新物件 SELECT 權限授予 anon。
-- 結果是任何人拿公開的 anon key 就能讀到全班的 AI 回饋與學號。
-- 實測確認：帶 anon key 查 week1_ai_feedback 回傳 []（RLS 正常），
-- 但查 week1_ai_feedback_latest 會回傳真實資料列。
--
-- 修法有兩層，兩層都做：
--   1. security_invoker = true → 檢視表改用呼叫者身分，套用底層資料表的 RLS
--   2. 明確收回 anon 的權限 → 即使 security_invoker 失效也讀不到
--
-- 在 Supabase SQL Editor 執行一次。可重複執行。

drop view if exists public.week1_ai_feedback_latest;

create view public.week1_ai_feedback_latest
with (security_invoker = true) as
select distinct on (class_id, student_id, week_number)
  id, class_id, student_id, week_number, total_readiness, model_name,
  prompt_version, submission_updated_at, created_at, feedback_json
from public.week1_ai_feedback
where teacher_hidden = false
order by class_id, student_id, week_number, created_at desc;

revoke all on public.week1_ai_feedback_latest from anon;
revoke all on public.week1_ai_feedback_latest from public;
grant select on public.week1_ai_feedback_latest to authenticated;

-- 驗證：帶 anon key 呼叫
--   GET /rest/v1/week1_ai_feedback_latest?select=student_id
-- 應回傳 [] 或 401/403，不得回傳任何學生資料。
