# Startup Journey Lab 教學網站

為台灣大學生設計的十週 AI Startup 實作課程。

[開啟教學平台](https://hpyuan1220.github.io/startup-journey-lab-app/)

## 教材下載

- [Week 1 教學簡報 PowerPoint](materials/Week1_教學簡報.pptx)：19 頁，繁體中文，16:9，可編輯文字與圖形。
- [Week 1 教學簡報 PDF](materials/Week1_教學簡報.pdf)：與 PowerPoint 內容相同的閱讀版本。
- [Week 1 學生學習單 Word](materials/Week1_學生學習單.docx)
- [Week 1 學生學習單 PDF](materials/Week1_學生學習單.pdf)
- [十週教師指引手冊](docs/Startup_Journey_Lab_十週教師指引手冊.docx)
- [十週學習藍圖 V1](docs/COURSE_BLUEPRINT_V1.md)：每週主題、學習成果、學生任務與評量規劃。

學習藍圖 V1 保留課程最初規劃，其中 Web App 第一版限制屬當時版本描述。

## 單一主專案結構

- Repository 根目錄：GitHub Pages 使用的 Web App 前端。
- `materials/`：學生與教師實際使用的最新教材；後續教材只更新此處。
- `docs/`：課程藍圖、教師手冊與專案狀態。
- `supabase/`：資料庫、migration、Edge Function 與設定說明，不保存秘密金鑰。
- `skills/startup-journey-class/`：製作 Week 2–10 時使用的 Codex Skill 備份。

本資料夾是 Week 2–10 的唯一主專案工作區。舊資料夾只保留作為備份，不再直接修改。

## Week 1 AI 學習建議

學生完成起點卡的六個關鍵欄位後，可按「取得 AI 學習建議」，由 AI 檢查問題是否具體、
事實與假設是否分開，並提出一週內可完成的下一步。

- 設定步驟：[supabase/AI_FEEDBACK_SETUP.md](supabase/AI_FEEDBACK_SETUP.md)
- 專案狀態與待驗收項目：[docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)
- 離線測試：`node tests/ai-feedback.test.mjs`

模型 API Key 只存在 Supabase Function Secrets，不在前端檔案或本 Repository 中。
AI 回饋不寫入成績，正式評分由教師決定。
