# PROJECT_STATE

最後更新：2026-09-17

## 目前狀態

| 項目 | 狀態 |
| --- | --- |
| Week 1 學生起點卡 | 已上線 |
| Week 1 教師洞察 | 已上線 |
| Week 1 AI 學習建議 | 已部署並通過實測（2026-09-17） |
| Week 2–10 | 僅有學習藍圖頁面 |

## 架構

- 前端：GitHub Pages 靜態網站（`index.html`、`app.js`、`styles.css`、`week.html`、`week.js`）。
- AI 回饋前端：`ai-feedback.js`、`ai-feedback.css`，獨立於 `app.js`。
- 後端：Supabase。
  - `student-api` Edge Function：學生登入、讀取與儲存起點卡。
  - `ai-feedback` Edge Function：Week 1 AI 學習建議，唯一持有模型金鑰的位置。
- 資料表：`classes`、`teacher_profiles`、`student_sessions`、`week1_submissions`、`week1_ai_feedback`。

## 驗收測試結果（2026-09-17 實機驗證）

- [x] 1. 必填欄位未完成時不送出 AI 請求（前端擋下，伺服器端二次檢查）
- [x] 2. AI 不會收到姓名、學號或登入資料
      實測攔截請求內容：top-level 只有 action / token / submission；
      submission 只有六個欄位；headers 只有 apikey 與 Content-Type。
- [x] 3. 回傳失敗時學生資料不會消失（OpenAI 無額度時實測，草稿完好）
- [x] 4. 每項分數與合計計算正確（單元測試 10 項全過；實機 1+2+1+2+2 = 8/20）
- [x] 5. 相同內容不會重複呼叫模型（第二次顯示「內容未變動，沿用先前結果」）
- [x] 6. 學生修改後狀態變為「你已修改內容，可以重新取得建議」
- [x] 7. 重新整理後恢復最新回饋（顯示「已載入上次的 AI 建議」，總分 8/20）
- [x] 9. 手機寬度（375px）無水平溢位：scrollWidth === clientWidth === 375
- [x] 10. 瀏覽器主控台無 JavaScript 錯誤
- [x] 11. API Key 不出現在前端檔案、Network 請求或 GitHub

仍待驗證：

- [x] 8. 教師洞察查看回饋且不影響成績（teacher-ai-feedback.js，顯示證據準備度與缺口，可隱藏單則，不寫入成績）
- [ ] 12. 50 位學生同時使用（腳本已備妥：scripts/load-test.mjs，需在本機執行；沙箱環境連不到 supabase.co）

## 安全修正紀錄

- 2026-09-17： 檢視表原本繞過 RLS，帶公開 anon key 可讀到全班回饋與學號。
  成因：Postgres 檢視表預設以擁有者權限執行，且 Supabase 預設將 public schema 新物件 SELECT 授予 anon。
  修正：（security_invoker = true + revoke from anon）。
  修正後以 anon key 查詢回傳 401 permission denied。
  教訓：**每次新增 view 都要單獨驗證 anon 權限，底層資料表有 RLS 不代表 view 安全。**

## 營運設定

- 模型：gpt-4o-mini（可用 OPENAI_MODEL 覆寫）
- 每位學生每日呼叫上限：12 次（AI_FEEDBACK_DAILY_LIMIT）
- OpenAI 帳號：已儲值 10 美元，自動儲值開啟（低於 5 補到 10，每月上限 15）

## Week 5 以後

投資人視角（模擬投資人追問）已保留資料結構與功能入口，Week 1 不啟用。
`week1_ai_feedback` 的 `week_number` 欄位可直接沿用到後續週次。

## 已知待辦

- `app.js` 呼叫的 Edge Function 路徑為 `/functions/v1/Student-api`（大寫 S），與資料夾名稱不一致，目前運作中，暫不更動。
- 專案資料夾內的 `Claude.dmg`（約 369MB）已列入 `.gitignore`，不進版控。
