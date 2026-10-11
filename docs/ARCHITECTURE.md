# 系統架構說明

給工程師和老師的 AI 助理。全部是實證（從程式碼與資料庫定義整理），2026-10-12 的狀態。

## 1. 一句話的架構

**靜態網站（GitHub Pages）＋ Supabase（Postgres 資料庫、Auth、Edge Functions）＋ OpenAI（只在學生按 AI 建議時）。** 沒有自己的伺服器，沒有框架，沒有 build 步驟（除了把共用模組打包進 Edge Function）。一個班一學期的費用：主機 0 元、資料庫免費方案、AI 幾十到幾百元台幣。

```
手機／電腦瀏覽器
  index.html  (Week 1 起點卡、教師洞察)        week.html?week=N  (學習頁 + 每週的卡)
  app.js      teacher-*.js                      week.js  week2.js  week3.js
  共用純邏輯：week2-core.mjs  week2-quality.mjs  week3-core.mjs   ← 瀏覽器與後端共用
        │  fetch（apikey + 學生 token 或教師 JWT）
        ▼
Supabase Edge Functions（Deno）
  Student-api   登入（學號＋邀請碼→token）、Week 1 讀寫
  week2-api     Week 2 讀寫、AI 建議、Week 3 讀寫、普查、所有教師端讀寫
  ai-feedback   Week 1 的 AI 回饋
        │  service role
        ▼
Postgres（RLS：老師只看自己的班；學生不直接碰資料庫）
```

## 2. 引擎 vs 內容（要給新課用，先分清楚這兩層）

| 引擎（不要動） | 內容（換課要改） |
|---|---|
| 登入與 session（`Student-api` login、`student_sessions`） | 十週標題／摘要／步驟（`week.js` 的 `weeks`、`highlights`） |
| 名單閘門（`class_roster`） | 每週學習頁（`week.html` 的 `#week-N-materials`） |
| 卡片的草稿／提交／版本／快照（`bump_learning_version`、`snapshot_learning`、`learning_versions`） | 卡片的格子與檢查（Week 1：`index.html`＋`app.js`＋`Student-api`；Week 2：`week2-core.mjs`；Week 3：`week3-core.mjs`） |
| 三階完成度與可點選寫法的機制（`completion()`、`chips()`） | 品質標準本身（`week2-quality.mjs` 的 `ITEMS` 與正則） |
| AI 建議的管線：去識別化、額度預留、快取、版本綁定（`week2-api` 的 `ai` 動作、`reserve_week2_ai`） | AI 提示詞與可看的欄位（`aiInput()`、prompt 字串） |
| 教師洞察的骨架：一人一卡、篩選、排序、確認／指路、CSV（`teacher-week2.js`） | 卡內顯示哪些欄位（同檔案裡的欄位清單） |
| 班級名單、普查的機制 | 普查預設題目（`week3-core.mjs` 的 `DEFAULT_SURVEY_TOPICS`） |
| 測試骨架（`tests/support/*`、`serve-acceptance.mjs`） | 每張卡的測試資料與斷言 |

## 3. 資料模型

所有表都有 `class_id`；學生用 `student_id`（學號，大寫無空白）識別，沒有學生帳號。

| 表 | 用途 | 關鍵欄位 |
|---|---|---|
| `classes` | 班級 | `name`、`invite_code_hash`（bcrypt，原碼不存） |
| `teacher_profiles` | 老師（對應 Supabase Auth 使用者） | `id`＝auth uid |
| `teacher_classes` | 老師↔班級授權 | 老師只看得到這裡綁定的班 |
| `class_roster` | 班級名單 | 有名單的班，不在名單的學號登入被擋（422） |
| `student_sessions` | 學生登入 token（只存雜湊） | 到期時間；唯一 `(class_id, student_id)` |
| `week1_submissions` | Week 1 起點卡 | 11 個文字欄、`status`、`version`、教師欄位 |
| `week2_submissions` | Week 2 痛點卡 | `card` jsonb、`status`、`version`、`attempts`、`review_status`、`teacher_note`、`teacher_target` |
| `week3_submissions` | Week 3 訪談紀錄卡 | `record` jsonb（三次訪談＋判斷） |
| `learning_versions` | 每次版本跳動的快照 | `(class_id, student_id, week, version)` 唯一 |
| `week1_ai_feedback`、`week2_ai_requests` | AI 建議與額度 | 內容雜湊快取、`state`、`submission_version` |
| `week2_settings` | 每班 AI 上限 | `weekly_ai_limit` |
| `week3_survey_topics`、`week3_survey_responses` | 普查題目與回答 | 一人一題一列 |

觸發器：`bump_learning_version`（學生欄位有變才 +1 版本；教師欄位不跳）、`snapshot_learning('N')`（每個新版本快照一份）。改學號之類的資料修正要先關觸發器。

## 4. API（都是 POST JSON；學生帶 `token`，老師帶 `Authorization: Bearer <JWT>`）

Student-api：`login`（學號、邀請碼、可選 `confirm_new`）、`load`、`save`。
week2-api 學生：`load`、`save`、`ai`（`kind: explore|review`，需 `privacy_confirmed`）、`week3_load`、`week3_save`、`survey_load`、`survey_save`。
week2-api 老師（`teacher_` 開頭，先驗 JWT 再驗 `teacher_classes`）：`teacher_load`（一次回全部班級資料）、`teacher_review`（`review_status`、`note`、`target`、`version` 防衝突）、`teacher_history`、`teacher_settings`、`teacher_roster`（add/remove）、`teacher_survey_topics`。

錯誤慣例：401 身分、403 不是你的班、409 衝突或前置未完成、422 內容不合規（訊息直接是給學生看的中文）、429 額度。

## 5. 安全與隱私

- 學生永遠不直接碰資料庫；Edge Function 用 service role，先驗 token。
- 老師走 Supabase Auth；每張表 RLS `teaches_class(class_id)`。
- 邀請碼 bcrypt；學生 token 只存 SHA-256。
- 送 AI 前去識別化（學號、姓名），並做個資正則檢查；學生文字一律當不可信資料，畫面用 `textContent` 顯示。
- 姓名／學號只在 `docs/private/`（gitignore）；公開 repo 零個資。

## 6. 測試策略（改任何東西前後都要跑）

- 單元：`node --test tests/*.test.mjs`（純邏輯 + 用記憶體 adapter 跑**真的** Edge handler）。
- 部署版：`WEEK2_HANDLER=bundled …` 測打包後的檔案，避免「原始碼綠、線上壞」。
- 真瀏覽器：Playwright 對 `tests/serve-acceptance.mjs`（同一份 handler + 靜態站）跑學生與老師流程；手機寬度；每個測試用自己的 port。
- 上線：三方雜湊比對（本機／GitHub／部署編輯器）→ 老師按 Deploy → 部署後零寫入探針（405／400／401／422）→ 正式站用測試帳號唯讀載入。

## 7. 已知限制

- 內容寫死在程式裡（見第 2 節），換課要改程式——這是階段三要解決的。
- 沒有老師自助開班的畫面（用 SQL，見開新班手冊）。
- Week 4 以後只有學習藍圖頁。
- 單一 Supabase 專案、單一 OpenAI 金鑰；多位外部老師應各開專案。
