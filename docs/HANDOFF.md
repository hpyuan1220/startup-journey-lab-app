# 交接單（給下一個對話／下一個班／下一位協作者）

讀這一頁加 `docs/PROJECT_STATE.md` 最後幾段，就能接手。不含任何學生姓名、學號、邀請碼。

## 這是什麼

Startup Journey Lab：世新大學十週 AI 創業課的教學互動系統。學生用手機填每週的卡（Week 1 起點卡、Week 2 痛點探索卡、Week 3 訪談準備單＋紀錄卡＋全班普查），老師在「教師洞察」一人一張卡地看、確認、指路。AI 建議是形成性的，**永遠不是成績**。

- 網站：`https://hpyuan1220.github.io/startup-journey-lab-app/`（GitHub Pages，repo `hpyuan1220/startup-journey-lab-app`）
- 後端：Supabase 專案 `lyrggicbsuynsjtsfwed`；Edge Functions `Student-api`（單檔）、`week2-api`（bundle，含 Week 3 與普查）、`ai-feedback`
- 本機：`~/Desktop/2026 class/116 AI start up class/Startup Journey Lab Project`；教材副本放上一層的 116 資料夾
- 學生入口 `index.html#student`；Week 2 `week.html?week=2#card`；Week 3 `week.html?week=3#card`；教師 `index.html#teacher`

## 工作規則（老師定的，不要改）

1. **老師按** push、SQL Run、Deploy；我準備、貼進編輯器、驗證、讀結果。我不輸入密碼。
2. 不用真實學生資料測試；用老師測試學號，測完用清理 SQL 刪（只刪測試學號）。正式站上只做唯讀查詢或只填畫面不存。
3. 學生姓名／學號／邀請碼只存 `docs/private/`（gitignore），永不進 repo、不貼進對話摘要。
4. 不改學生的原始輸入；新功能只加、不覆蓋。
5. 永遠不用「卡住」逼學生：三階完成度、一次只講一件缺的事、可點選的寫法、老師一鍵指路。
6. 每次回覆標「實證／推論」；失敗照實說；全部用繁體中文。
7. 上線前一定有測試證據：單元 `node --test tests/*.test.mjs`、bundle 模式、真瀏覽器測試（Playwright）；部署三方雜湊比對；部署後零寫入探針。

## 現在上線到哪（2026-10-12）

- Week 1、2、3 全部可用；名單閘門（不在名單擋 422）；老師端加名單；全班痛點普查 18 題開放。
- 班上 46 位學生，42 位已進系統、4 位還沒；Week 2 已交 36；品質分布 A 25／B 15／C 0。
- 週四 10/16（推論）上 Week 3：普查→準備單→兩輪模擬訪談；課後一週三次真實訪談。

## 下一步（照優先順序）

1. 老師課前審 36 張 Week 2 卡（「已交、還沒審」篩選；A 確認、其餘指路一句）。
2. Week 3 之後：每張卡重新評分，每群選代表，期中前收斂到 15 個有原話的題目；可做「把原話帶回 Week 2 卡」一鍵功能。
3. Week 4 起尚未建置（只有學習藍圖頁）。
4. 給另一位老師用：先填 `教學互動系統_開課工作單_v2.md`（116 資料夾）；要寫 `docs/ADAPTATION_GUIDE.md` 給對方的 AI 助理；對方的 repo 與 Supabase 開在他自己帳號下。

## 怎麼接手

- 開新班（同一門課）：`docs/NEW_CLASS_PLAYBOOK.md`。
- 做一週教材：照 Week 3 的做法（`docs/WEEK3_SLIDES_SOURCE.json`＋`scripts/build-week3-slides.py`）。
- 上線：`supabase-edge-deploy` 技能；順序 push → migration → deploy → 探針 → 記錄。
- 踩過的坑都在 `docs/PROJECT_STATE.md`（Supabase SQL Editor「Too small」錯誤、git lock、student_sessions 唯一鍵、tgenabled 轉型、驗收伺服器一台一個測試）。
