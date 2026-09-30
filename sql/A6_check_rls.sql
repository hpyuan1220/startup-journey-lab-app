-- A6 稽核：確認教師的 RLS 是否已收斂到「只能看自己的班」。
-- 只讀，不改任何東西。把整段貼進 Supabase SQL Editor 按 Run。
--
-- 判讀方式：
--   最後一欄 判定 若全部是「✅ 已收斂」→ 沒問題，A6 結案。
--   只要出現「❌ 只要是老師就能看全部」→ 20260927b 沒跑成功，任何一位老師都能
--   讀寫所有班級的學生資料，必須處理。

select
  tablename                                  as 資料表,
  policyname                                 as 政策名稱,
  cmd                                        as 動作,
  case
    when coalesce(qual,'') like '%teaches_class%'
      or coalesce(with_check,'') like '%teaches_class%'
      then '✅ 已收斂到自己的班'
    when coalesce(qual,'') like '%teacher_profiles%'
      then '❌ 只要是老師就能看全部'
    else '⚠ 需人工判讀：' || left(coalesce(qual,'(無條件)'), 80)
  end                                        as 判定
from pg_policies
where schemaname = 'public'
  and tablename in ('classes','week1_submissions','week1_ai_feedback',
                    'week2_submissions','week2_settings','week2_ai_requests','learning_versions')
order by
  case when coalesce(qual,'') like '%teacher_profiles%' then 0 else 1 end,
  tablename, cmd, policyname;
