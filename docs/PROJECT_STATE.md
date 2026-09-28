# PROJECT_STATE

最後更新：2026-09-28

## 目前狀態

| 項目 | 狀態 |
| --- | --- |
| Week 1 學生起點卡 | 已上線 |
| Week 1 教師洞察 | 已上線 |
| Week 1 AI 學習建議 | 已部署，12 項驗收全數通過（2026-09-17） |
| Week 2 | 互動卡、教材、正式後端已驗收，發布狀態見文末 |
| Week 3–10 | 僅有學習藍圖頁面 |

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

- [x] 8. 教師洞察查看回饋且不影響成績（teacher-ai-feedback.js，顯示證據準備度與缺口，可隱藏單則，不寫入成績）
- [x] 12. 50 位學生同時使用（2026-09-17 實測，scripts/load-test.mjs --spend）
      登入：50/50 回 200，p50 555ms，max 1.56s
      缺欄位：10/10 回 422，p50 409ms，未觸及 OpenAI
      並發回饋：50/50 回 200，**50 筆皆為真實模型呼叫**，0 筆走快取
      p50 4.74s、p90 5.54s、p99 6.52s、max 6.52s，整批 6.52 秒完成
      無 429（未觸發每日上限）、無 502（OpenAI 未限流）

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


## 2026-09-27 Week 2 開發狀態

- 開發 worktree：`startup-journey-week2`，分支 `feature/week2-adaptive`，起點 `4bb805d`。原本 `startup-journey-lab-app` 未提交修改未覆蓋。
- 程式初稿、三路徑、版本衝突、後端權限、AI 限额／快取、教師抽查及教材已建立。
- 26 項本機測試通過，其中整合測試使用真實 handler + 記憶體資料 adapter／假模型，並非 PostgreSQL 或真實模型。
- 瀏覽器通過逐題、切換模式、缺項攔截、保存／重新整理、正式提交、挑戰欄位、390/768/1440 寬度及一次 Tab 焦點檢查；原生 AI 確認框造成瀏覽器阻塞，已改成頁內確認，尚待瀏覽器解除後重測。
- PPT 20 頁／PDF 20 頁逐頁文字相符，5 頁學習單已產生；中文字型轉檔問題已修復並渲染檢查。
- **正式 SQL、教師班級對應、端點部署、RLS、50 人真實 Supabase 負載、真實 AI 模型比較、公開 Pages 新版驗證未完成。** Chrome 擴充功能視窗阻擋操作，已請使用者關閉。
- 不合併 main、不發布依賴尚未部署後端的功能。下一步依 WEEK2_DEPLOYMENT.md 完成管理員檢查及部署，沒有另建第二套網站。

## 2026-09-27 Week 2 簡報版型對齊

- 依使用者要求，直接沿用 Week 1 PPT 的原始版型：黑色封面、米白內頁、紅色與深藍色重點、PingFang TC、16:9、案例插圖與討論卡。Week 1 檔案未修改。
- Week 2 PPT / PDF 各 20 頁，兩份檔案分開保存；學習單維持獨立檔案。逐頁文字一致，全部教材文字已核對；PPT 20 頁渲染檢查、PDF 轉檔檢查及套件／版面檢查通過。
- `docs/WEEK2_SLIDES_SOURCE.json` 為每頁文字依版型文字框順序排列；第 1–19 頁使用 Week 1 同頁版型，第 20 頁使用 Week 1 第 9 頁版型。不含固定品牌／頁碼／週次標頭。
- 更新僅在 Week 2 開發分支；正式網站與後端部署狀態不變，仍需依部署清單完成驗證。

## 2026-09-27 正式資料庫部署進度

- Codex 內建瀏覽器已成功登入指定 Supabase 專案。正式資料為 35 份 Week 1 卡、61 筆 AI 回饋。
- 在非公開 schema `sjl_backup_20260927` 保存 Week 1 卡、回饋、班級、教師資料與原 policies 快照；撤銷 public / anon / authenticated 存取且所有快照表開啟 RLS。此為同資料庫部署前快照，不是異地備份；未匯出學生內容至 Git。
- 已成功執行 `20260927_week2.sql`；使用者確認現用教師 Email 後，核對 auth.users 並建立唯一指定班級對應，執行 `20260927b_teacher_scope.sql`。舊教師帳號未授權。
- 正式 PostgreSQL transaction 驗證通過：Week 1 全部欄位（新增 version 除外）與部署前快照完全一致；35 份初始版本；61 筆回饋；現用教師可讀取；未授權教師讀不到 Week 1、AI latest view、版本；anon 不能讀 Week 1、Week 2，不能存取快照 schema。
- `week2-api` 已在 Dashboard 編輯器準備好完整 bundled 程式，尚未部署。自動核准審查拒絕部署，要求明確確認匿名學習文字傳送至 api.openai.com 的授權。不得繞過拒絕部署。
- Student-api 尚未更新；正式端點測試、50 人端點測試、AI 評估與 Pages 發布仍未完成。main 未變更。

## 2026-09-27 授權後部署與驗收

使用者已明確同意部署及匿名文字傳送至 OpenAI API，解除上節所述阻礙。week2-api 與 Student-api 均已部署；50 人正式 Supabase 同時保存全部成功，模型比較完成，Week 2 選用 gpt-5.4-mini。27 項本機測試及真實端點／匿名預覽驗證詳見 [WEEK2_LIVE_ACCEPTANCE.md](WEEK2_LIVE_ACCEPTANCE.md)。原正式班資料仍保留。教師真實登入與續期尚待驗證，不能視同已通過。

## 正式發布確認

- 功能 commit：`3fc6268`；已推送 main 及 feature/week2-adaptive。
- GitHub Pages run `36295242748`：success。
- 公開 index.html、week.html、week2.js、week2-core.mjs、teacher-week2.js 與三份 Week 2 教材全部 HTTP 200，逐位元組比對與本機發布檔完全一致。
- 公開 Week 2 頁面已在瀏覽器確認藍圖、影片摘要、三個教材按鈕與登入前提示；實際後端互動由本機新版＋正式 Supabase 合成測試完成。
- 最後部署的 AI review 再以一筆合成資料確認 HTTP 200，directions 空陣列。
- 教師登入頁已開啟，待使用者自行輸入密碼完成剩餘端到端驗收。請勿在對話提供密碼。
- 下一個最小里程碑：教師實際抽查一份測試卡、確認登入續期，再規劃 Week 3 訪談紀錄與證據回扣；不要直接擴建通用課程編輯器。

## 2026-09-28 Week 2 填答引導修正

原本逐題隱藏欄位，卻一次顯示全卡缺項，且候選痛點缺少說明。現加入「痛點 1、痛點 2、比較選題、準備訪談」導覽與欄位跳選，每題提供說明範例；缺項可點選定位並聚焦。第三題可移除／復原，場景提示不覆蓋既有情境。保留兩題最低標準與現有資料格式，無須部署 SQL 或 Edge Function。PPT/PDF 內容與學習成果不變。

27 項測試通過；合成學生瀏覽器驗證步驟切換、缺項定位、第三題移除／復原、草稿第 5 版重載、兩題正式提交第 6 版；JavaScript error 0。未修改正式學生卡。

## 2026-09-28 YC 影片摘要補充

Week 2 PPT 與 PDF 更新為 25 頁，新增第 9–13 頁。每頁包含 YC 影片觀念、中文解釋、本課學生例子與痛點卡應用；依官方影片自動字幕核對，來源與相關段落寫入備忘稿。保留其餘 20 頁內容與既有 Week 1 版型，僅更新頁碼。25 頁逐頁 PPT/PDF 文字比對通過，新增頁面的 PPT 和 PDF 渲染皆已檢查。網站下載連結加版本參數避免舊檔快取；學習單保持獨立。詳見 WEEK2_YC_GUIDE.md。

## 2026-09-28 學習卡入口一致化

- 首頁「學生學習卡」可選 Week 1 起點卡或 Week 2 痛點探索卡。
- Week 2 分為「學習藍圖與教材」及「填寫 Week 2 學習卡」；題目不再接在教材下方。
- `week.html?week=2#card` 可直接開卡；既有 `#week-two` 連結仍有效。切換教材以顯示／隱藏處理，不重建表單，不清除未儲存答案。離開網站仍需先儲存草稿。
- 首頁支援 `#home`、`#student`、`#teacher` 與瀏覽器上一頁／下一頁；密碼重設流程維持原處理。
- 驗證：27 項既有自動測試通過；本機合成學生確認卡片→教材→卡片保留輸入、首頁每週入口、未登入提示、教師入口、390px 手機無水平溢位、卡片主控台無錯誤。未修改正式学生紀錄，未呼叫 AI。

### 2026-09-28：AI 建議改為填答後選用

完成痛點與訪談規劃後，可選「取得 AI 建議」或「暫不使用 AI，繼續提交」。只有收到本次或已保存的 AI 建議，才顯示「我採用／修改／不採用什麼建議？為什麼？」；未使用 AI 不需回應，仍可正式提交。既有回應保留，若沒有可載入的建議，提供先前回應唯讀展開區。取得建議前仍需匿名內容確認，不會自動呼叫模型。

驗證：27 項既有測試通過；本機合成學生完成無 AI 提交、AI 選用與匿名確認、模擬回覆後顯示回應欄、回應儲存後重整恢復。正式學生資料未修改。
