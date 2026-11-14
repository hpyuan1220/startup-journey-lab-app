# 交接文件（2026-11-12）— 給接手改內容、顧後半學期的人

先讀這一頁，再讀 `docs/PROJECT_STATE.md` 的最後十段（每次改了什麼、雜湊、測試數字都在那裡）。不含任何學生姓名、學號、邀請碼。

## 1. 這是什麼、東西在哪

Startup Journey Lab：世新大學企管三甲的 12 週 AI 創業課（43 位學生＋1 個老師測試帳號）。學生用手機填每週的卡，老師在教師洞察頁看全班；下半學期玩「AI 新創群島」尋寶，期末一組講一家 AI 新創。

| 東西 | 在哪 | 備註 |
|---|---|---|
| 網站（所有前端） | GitHub `hpyuan1220/startup-journey-lab-app` → GitHub Pages `https://hpyuan1220.github.io/startup-journey-lab-app/` | 推上 main 幾十秒後上線；靜態檔靠 `?v=` 版本號破快取 |
| 後端 | Supabase 專案 `lyrggicbsuynsjtsfwed`；Edge Functions `Student-api`（登入）、`week2-api`（其餘全部，bundle）、`ai-feedback` | **線上跑的是 Dashboard 按 Deploy 那份**，不是 GitHub；兩步都要做 |
| 資料表定義 | `supabase/migrations/*.sql`（依日期） | 新欄位要在 SQL Editor Run 一次 |
| 老師電腦的本機副本 | `~/Desktop/2026 class/116 AI start up class/Startup Journey Lab Project/` | 就是 repo clone；教材副本在上一層 `116 AI start up class/` |
| 學生名單、邀請碼、含名單的報表 | `docs/private/`（gitignore） | 永不進 repo、不貼進對話 |
| 群島美術原檔（45 MB） | `materials/islands/_source/`（gitignore） | repo 只放縮小版 |
| 模型 API 金鑰 | 只在 Supabase → Edge Functions → Secrets | 不在任何檔案裡 |
| 課程設計文件 | `docs/COURSE_V3_12WEEKS.md`（12 週）、`docs/SECOND_HALF_FLOW.md`（下半學期漏斗與每週）、`docs/GAME_AI_ISLANDS.md`（遊戲）、`docs/THEORY_BASE_V3.md`（理論出處） | |
| 講義／簡報原始檔 | `docs/handouts/WEEK*_HANDOUT.html`（→ `materials/Week*_講義.pdf`）、`docs/WEEK*_SLIDES_SOURCE.json`（→ `materials/Week*_教學簡報.pptx/pdf`） | 做法見 `docs/handouts/README.md` |

## 2. 工作規則（老師定的，不要改）

1. **老師按** git push、SQL Run、Deploy；助理準備、貼進編輯器、驗證。助理不輸入密碼、金鑰、邀請碼。
2. **不動學生資料**：不改學生輸入、不刪、不擋存檔。測試只用老師測試學號或合成資料（`A1139900xx` 之類），測完給清理 SQL 讓老師 Run。
3. 學生姓名／學號只在 `docs/private/`。
4. AI 回饋只建議，不給分；分數類的東西（群島三題、估價）只是紀錄，不進成績。
5. 每次改動記在 `docs/PROJECT_STATE.md`；測試全綠才 commit；標「實證／推論」；繁體中文。

## 3. 每次改程式的流程

```
# 在 repo 根目錄
node --test tests/*.test.mjs                       # 單元（228 條）
node scripts/build-week2-function.mjs             # 動到 *-core.mjs 或 supabase/functions/week2-api/index.ts 時
WEEK2_HANDLER=bundled node --test tests/*.test.mjs # 測實際部署的 bundle
SJL_WRITE_OPEN_AT=2000-01-01T00:00:00Z PORT=4261 node tests/serve-acceptance.mjs &   # 假後端＋靜態檔
node tests/week8-student.mjs; node tests/islands-student.mjs; node tests/week10-student.mjs   # 真瀏覽器（Playwright）
```
1. 改 → 測 → 改 `?v=` 版本號（哪個檔改了就改引用它的 `<script src>`／`import` 的版本字串）→ `docs/PROJECT_STATE.md` 加一段 → commit。
2. 老師 `git push origin main`。
3. 有新 migration：助理從 `raw.githubusercontent.com/hpyuan1220/startup-journey-lab-app/<commit SHA>/supabase/migrations/<file>.sql` 抓檔貼進 SQL Editor，老師 Run；SQL 最後一句 `select` 是預期值。
4. 動到 week2-api：照 `docs/RELEASE_PROCESS.md`／skill `supabase-edge-deploy`——從 commit SHA 的 raw 網址抓 `index.bundled.ts`，用 monaco `pushEditOperations` 貼進 Dashboard 編輯器，三方雜湊（本機 `shasum -a 256`、GitHub、編輯器）一致 → 老師按 Deploy updates（兩次）→ 驗 M 標記 0、打一次線上 API。
5. 正式站用老師測試帳號走一遍；不留資料。

## 4. 程式地圖（改哪裡）

**學生端**
- `index.html`＋`app.js`：首頁、學生起點卡（登入：學號＋邀請碼）、教師洞察入口。
- `week.html`＋`week.js`：所有週的頁；每週一個 `<section id="week-N-materials">`（教材與說明）＋作答區。切換在 `week.js` 的 `ids` 對照表；**Week 8 的內容就在 `week.html` 的 `#week-eight-materials` 這一段（講座說明、教材連結）**，課堂兩題題目在 `week4-core.mjs` 的 `DEFAULT_QUESTIONS[8]`。**題數可以是 2–5**：在 `DEFAULT_QUESTIONS[8]` 加 `q3`、`q4`、`q5`（字串，留白＝沒有這題）就多題，學生頁、老師頁、出席（全答在課中）自動跟著；改了 core 要重跑 `node scripts/build-week2-function.mjs` 並 Deploy。老師也能不改程式，在教師洞察 Week 8 區的 Q3–Q5 欄位填（要先在 Supabase 跑 `supabase/migrations/20261113_week_questions_extra.sql`）。
- 作答模組：`week2.js`～`week5.js`、`classq.js`（Week 6/8/9/10 課堂兩題）、`team.js`（Week 7 建組、Week 9「我的組」）、`company-card.js`（Week 9 理由卡）、`compare.js`（Week 10 比較表＋期末框架）。
- 群島：`islands.html`／`islands.js`／`islands.css`／`islands-data.mjs`（15 家公司的題庫、七格卡、故事、估價題）／`islands-core.mjs`（公司→島→方向）／`materials/islands/`（圖）。
- 共用規則（前端與後端同一份）：`week2-core.mjs`…`week5-core.mjs`、`team-core.mjs`、`islands-core.mjs`、`compare-core.mjs`、`progress-core.mjs`。**改規則只改這裡**，bundle 會包進 Edge。

**教師端**（都掛在 `index.html#teacher`，各自一個 `teacher-*.js`，順序在 `teacher-fold.mjs` 的 `ORDER`）
- `teacher-compare.js`（Week 10 比較與選定）、`teacher-classq.js`（課堂兩題，自動依 `CLASSQ_WEEKS`）、`teacher-islands.js`（群島：誰沒登入／沒組／開了哪些箱／推薦與理由卡）、`teacher-team.js`（建組：指定進組、認方向、鎖定、CSV）、`teacher-midterm.js`（期中評分表）、`teacher-week4/5.js`、`teacher-week2.js`、`teacher-note.js`、`teacher-remarks.js`、`teacher-ai-feedback.js`。

**後端** `supabase/functions/week2-api/index.ts`：所有 action 用 `b.action` 分支；學生端要 token（Student-api 登入拿到）、老師端要 JWT。新 action 加在對應區塊，跑 build，寫 `tests/*.test.mjs`（harness 在 `tests/support/week2-harness.mjs`，假 DB）。

**資料表**（Supabase）：`classes`、`class_roster`、`week1_*`、`week2_*`、`week3_*`、`week4_research`、`week5_compare`、`week_class_answers`（課堂兩題）、`teams`（含 `compare`）、`team_members`（含 `directions`、`reps`）、`islands_progress`、`teacher_remarks`、`class_settings`…；RLS 全開，學生端走 service role 在 Edge 內做權限。

## 5. 下半學期的時程與每週要做的事（老師版）

| 週 | 日期 | 上課前看 | 課堂 | app 已備好 |
|---|---|---|---|---|
| 7 | 11/13 | 老師頁 Week 7 期中評分表；`docs/private/期中前狀態_1112.csv` | 期中上台 2 分鐘／人；提醒建組 | 期中評分表、建組區 |
| 8 | 11/20 | — | 講師講座；課堂兩題；下課前提醒建組 | Week 8 頁、課堂兩題 |
| 9 | 11/27 | 老師頁「Week 7 建組」還沒有組名單→現場指定；「Week 9 群島」三個檢查塊 | 確認分組 10 分 → 三把尺 25 分（`materials/Week9_教學簡報.pdf`、`docs/handouts/ISLANDS_INTRO.pdf`）→ 群島開 2 箱 → 推薦 1 家 → 課堂兩題 | Week 9 頁（我的組、進群島、理由卡、教材）、群島 15 箱、老師頁群島區 |
| 10 | 12/4 | 老師頁「Week 10 比較」：三家到齊的組、已選定 | 五問公司版 20 分（`Week10_教學簡報.pdf`）→ 比較表 → 選定 → 反方 → 期末框架 → 工作坊 | Week 10 頁比較表＋期末框架、老師頁比較區 |
| 11 | 12/11 | 老師頁比較區：每組選了誰 | 預演 6＋3 分鐘 × 組 | （講評表尚未做：可用期中評分表樣式再做一個） |
| 12 | 12/18 | — | 上台 6 分鐘；PDF 13:00 前交 TronClass | （期末評分表尚未做） |

## 6. 還沒做的（依優先）

1. **期末評分表**（老師頁 Week 11／12）：每組一列、六頁各 0／5／10、每人講的頁、PDF 五段；可複製 `teacher-midterm.js` 改成組版（資料來源 `teams`＋`team_members`＋`compare`）。
2. **PPT 檔自動生成**：現在期末框架是文字（六頁＋講稿，複製貼進任何簡報）；要產 .pptx 可用 `scripts/build-slides.py` 的做法加一個模板。
3. 探索站／找碴的 AI 回饋（現在只存不評）；群島第三題網址的自動檢查。
4. Week 4／5 凍結按鈕、AI 評分規格（`docs/AI_GRADING_SPEC.md`）——舊待辦，期中後再議。
5. 給下一個班用：`docs/NEW_CLASS_PLAYBOOK.md`、`docs/ADAPTATION_GUIDE.md`。

## 7. 常見狀況

- **頁面改了看不到**：GitHub Pages 快取，`?v=` 版本號要換；學生端叫他們重整兩次。
- **老師頁某區「請重新登入教師帳號」**：JWT 過期，重新登入；群島與比較區會自己重試兩次。
- **Deploy 後功能沒變**：編輯器雜湊沒對上（貼錯分支）或沒按第二次 Deploy；照第 3 節重做。
- **學生說進度不見**：群島進度存雲端，請他登入同一個學號；localStorage 只是快取。
- **兩人組**：一人認兩個方向、推薦兩家，期末 A 講 1–3 頁、B 講 4–6 頁，程式已支援。
- **建組鎖定**：12/19 00:00 自動鎖；老師頁可提前鎖或解鎖；鎖的是名單，比較表照樣能存。
- **git commit 後出現 `.git/HEAD.lock`**：老師電腦上 `rm -f .git/HEAD.lock .git/objects/*/tmp_obj_*`。

## 8. 與工程師共同開發（2026-11-14 起，先從 Week 8 開始）

**權限（老師在 GitHub 設定）**
- Repo → Settings → Collaborators → Add people → 工程師的 GitHub 帳號 → 角色 **Write**（不要 Admin）。
- Settings → Branches → Add branch ruleset：`main` 需要 Pull Request 才能合併（Require a pull request before merging）。這樣誰都不能直接推 main，老師 merge 才上線。
- Supabase 先**不**給：Week 8 內容是前端（`week.html` 的 `#week-eight-materials`＋課堂兩題，已經能動）。若之後要改 Edge Function，再到 Supabase → Project Settings → Team 加 **Developer**；Secrets 永遠不給。

**工程師的流程**
```
git clone https://github.com/hpyuan1220/startup-journey-lab-app.git
cd startup-journey-lab-app && npm install            # 只有 playwright（真瀏覽器測試）
git checkout -b week8-<主題>                          # 一個功能一條分支
# 改 → 本機測（見第 3 節的指令）→ 改 ?v= 版本號 → docs/PROJECT_STATE.md 加一段 → commit → push 分支 → 開 PR 到 main
```
- PR 描述寫：改了哪些檔、測試數字（單元幾條、瀏覽器幾條）、要不要跑 migration／Deploy。
- 老師（或助理）review → merge → GitHub Pages 自動上線；有 migration／Edge 變更時由老師在 Supabase 按。

**界線（寫在 PR 範本裡，也口頭講一次）**
1. `docs/private/` 不存在於 repo，也不要向任何人要學生名單；測試只用合成學號 `A1139900xx`（假後端 `tests/serve-acceptance.mjs` 的邀請碼是 `GOOD-CODE`）。
2. 不改 `*-core.mjs` 的既有規則、不改 `teacher_remarks` 的格式（`MT2|…`、`FG1|…`、`RH1|…`），不動 `supabase/functions/*` 除非 PR 標題寫明。
3. 前端檔改了就改引用它的 `?v=`；不改 `CLASSQ_WEEKS`、週名、日期。
4. 本機 `.git` 的 `HEAD.lock`／`index.lock` 問題只發生在老師電腦（Cowork 無刪除權），工程師自己的 clone 不會有。

**Week 8 現況（給工程師的起點）**
- 頁面：`week.html` → `<section id="week-eight-materials">`；流程文件 `docs/SECOND_HALF_FLOW.md`（11/20 講座課：講師講三個方向、課堂兩題、下課前確認分組）。
- 已有：課堂兩題（`classq.js`，`CLASSQ_WEEKS` 含 8，可 2–5 題）、建組（`team.js`）、老師頁對應區塊。
- 測試：`tests/week8-student.mjs`（23 條）是 Week 8 的驗收，改完要全綠。
