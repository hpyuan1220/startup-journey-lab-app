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

## Week 2 適應式學習（功能分支，待正式部署）

2026-09-27：已建立 Week 2 前端、Edge Function、SQL migration 及教材。**尚未套用正式資料庫／發布此分支**，不能把本機測試當成已上線。部署門檻與回復方式：[Week 2 部署文件](docs/WEEK2_DEPLOYMENT.md)；實測範圍：[驗收紀錄](docs/REVIEW.md)。

- [Week 2 教師完整教案](docs/WEEK2_LESSON_PLAN.md)
- [Week 2 PPT，20 頁](materials/Week2_教學簡報.pptx)
- [同內容 PDF 閱讀版](materials/Week2_教學簡報.pdf)
- [Week 2 學生學習單，5 頁](materials/Week2_學生學習單.pdf)
- 三條路徑共用核心成果，Week 1 未交先補交，規則完整後提交；AI 失敗不阻擋。
- 教師以授權班級查閱，抽查／小幅修訂／先討論三種回應；不要求逐一核對必填。
- 規則模組 `week2-core.mjs` 同時供瀏覽器與 Edge Function 使用；版本在資料庫記錄。

本機測試（Node 24）：`node --test tests/*.test.mjs`。瀏覽器測試伺服器：`node tests/serve-week2.mjs`，只使用合成資料，不連正式服務。`/_fixture` 可建立測試登入。

AI 比較：`node scripts/eval-week2.mjs` 預設只列測試計畫；加 `--run` 才會以本機環境的 OPENAI_API_KEY 執行 6 個合成案例 × 2 模型。尚未實際比較 gpt-5.4-mini，不自動更換正式模型。
