# Week 1 AI 學習建議 — 設定步驟

只需四步。模型 API Key 只會存在 Supabase Function Secrets，不會進入 config.js、瀏覽器 JavaScript、GitHub Repository 或 GitHub Pages。

## 步驟 1：建立資料表

Supabase Dashboard → SQL Editor → New query，貼上
`supabase/migrations/20260917_week1_ai_feedback.sql` 全部內容 → Run。

這個檔案只新增 `week1_ai_feedback` 資料表、索引、RLS 政策與 `week1_ai_feedback_latest` 檢視表，
不會修改 `week1_submissions` 或任何既有政策，可重複執行。

## 步驟 2：部署 Edge Function

Dashboard → Edge Functions → Deploy a new function → Via Editor，名稱填 `ai-feedback`，
把 **`supabase/functions/ai-feedback/index.bundled.ts`** 整份貼進 `index.ts`，Deploy。

Dashboard 的多檔案編輯器重新命名檔案不穩定，所以改用單一檔案版本：
`index.bundled.ts` 是 `validate.ts` + `index.ts` 自動合併的結果，內容完全相同。
改過原始檔之後重新產生：

```
node scripts/build-edge-function.mjs
```

若使用 CLI：

```
supabase functions deploy ai-feedback --no-verify-jwt
```

`--no-verify-jwt` 是必要的：學生沒有 Supabase 帳號，改用既有的 session token 驗證
（與 `student-api` 同一套 `student_sessions` 資料表）。

## 步驟 3：設定 Secrets

Dashboard → Edge Functions → ai-feedback → Secrets（或 Project Settings → Edge Functions → Secrets）：

| 名稱 | 必要 | 說明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 是 | OpenAI API 金鑰，從 platform.openai.com → API keys 建立 |
| `OPENAI_MODEL` | 否 | 預設 `gpt-4o-mini`；要換模型時才設定 |
| `AI_FEEDBACK_DAILY_LIMIT` | 否 | 每位學生每日模型呼叫上限，預設 12 |

`SUPABASE_URL` 與 `SUPABASE_SERVICE_ROLE_KEY` 由 Supabase 自動注入，不需要自己填。

## 步驟 4：更新前端

把 `index.html`、`ai-feedback.js`、`ai-feedback.css` 推上 GitHub，GitHub Pages 會自動更新。
`config.js` 不需要任何改動。

## 成本與流量控制

- 相同內容以 SHA-256 雜湊比對，直接讀取先前結果，不重複呼叫模型。
- 每位學生每日呼叫上限由 `AI_FEEDBACK_DAILY_LIMIT` 控制。
- 單次請求逾時 25 秒，失敗時自動重試一次。
- 回傳內容為短 JSON，`max_completion_tokens` 設為 1200。

## 隱私

- 送給模型的只有六個欄位：`observed_problem`、`affected_user`、`known_fact`、
  `unverified_assumption`、`expected_learning`、`concern`。
- 姓名、學號、班級邀請碼、登入權杖都不會送到模型。
- 一般執行日誌只記錄事件代碼，不記錄姓名、學號、權杖或學生原文。
- 資料表記錄 `student_id`、`class_id`、`week_number`、`submission_updated_at`、
  `feedback_json`、`model_name`、`prompt_version`、`created_at`，供教師檢視與稽核。

## 教師端

- 教師可讀取 `week1_ai_feedback_latest` 檢視表，看到每位學生最新回饋與證據準備度。
- 教師可將任一筆設為 `teacher_hidden = true` 隱藏，或在 `teacher_note` 寫下覆寫說明。
- AI 結果不寫入任何成績欄位，正式成績仍由教師決定。
