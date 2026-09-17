# PROJECT_STATE

最後更新：2026-09-17

## 目前狀態

| 項目 | 狀態 |
| --- | --- |
| Week 1 學生起點卡 | 已上線 |
| Week 1 教師洞察 | 已上線 |
| Week 1 AI 學習建議 | 程式碼完成，**尚未部署與實測**，不可對全班開放 |
| Week 2–10 | 僅有學習藍圖頁面 |

## 架構

- 前端：GitHub Pages 靜態網站（`index.html`、`app.js`、`styles.css`、`week.html`、`week.js`）。
- AI 回饋前端：`ai-feedback.js`、`ai-feedback.css`，獨立於 `app.js`。
- 後端：Supabase。
  - `student-api` Edge Function：學生登入、讀取與儲存起點卡。
  - `ai-feedback` Edge Function：Week 1 AI 學習建議，唯一持有模型金鑰的位置。
- 資料表：`classes`、`teacher_profiles`、`student_sessions`、`week1_submissions`、`week1_ai_feedback`。

## 尚未完成的驗收測試

以下需要實際部署後才能驗證，完成前不要宣布功能可供全班使用：

- [ ] 2. AI 不會收到姓名、學號或登入資料（部署後檢查 Network 請求內容）
- [ ] 3. 回傳 JSON 格式錯誤時，學生資料不會消失
- [ ] 5. 相同內容不會產生重複費用（連按兩次應顯示沿用先前結果）
- [ ] 6. 學生修改後可以取得新版回饋
- [ ] 7. 重新整理後能恢復最新回饋
- [ ] 8. 教師洞察能查看回饋，但不會自動改變成績
- [ ] 9. 手機與桌面沒有溢位或遮擋
- [ ] 10. 瀏覽器主控台沒有 JavaScript 錯誤
- [ ] 11. API Key 不出現在 Network response
- [ ] 12. 50 位學生同時使用時有清楚的等待、速率限制與錯誤提示

已於本機通過：

- [x] 1. 必填欄位未完成時不送出 AI 請求（前端擋下，伺服器端二次檢查）
- [x] 4. 每項分數與合計計算正確（`tests/ai-feedback.test.mjs`，10 項測試全數通過）
- [x] 11. API Key 不出現在前端檔案與 GitHub（靜態掃描）

## Week 5 以後

投資人視角（模擬投資人追問）已保留資料結構與功能入口，Week 1 不啟用。
`week1_ai_feedback` 的 `week_number` 欄位可直接沿用到後續週次。

## 已知待辦

- `app.js` 呼叫的 Edge Function 路徑為 `/functions/v1/Student-api`（大寫 S），與資料夾名稱不一致，目前運作中，暫不更動。
- 專案資料夾內的 `Claude.dmg`（約 369MB）已列入 `.gitignore`，不進版控。
