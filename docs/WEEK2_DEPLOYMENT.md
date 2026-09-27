# Week 2 部署與回復

## 目前狀態

功能分支 `feature/week2-adaptive`；正式基線 `4bb805d`。本機規則與記憶體 adapter 測試通過，不等於正式 Supabase RLS、SQL trigger 或負載驗證。部署尚未執行。不得在後端未就緒時直接把分支合併到 main。

唯一指定正式專案：`lyrggicbsuynsjtsfwed`。不得使用其他 Supabase 專案。

## 依序執行

1. 管理員先在 Supabase 確认專案、現有 tables／policies、Edge Functions、Secrets 名称（不顯示或複製秘密值），以及教師與班級對應。保存資料庫備份到私有位置，學生資料不可進入 Git。
2. 執行 `supabase/migrations/20260927_week2.sql`。SQL 在 transaction 中執行；失敗時整段回滾。先為現有 Week 1 建立版本快照，再新增版本 trigger，沒有刪除語句。
3. 在 `teacher_classes` 明確新增經管理員確認的教師 UUID 與 class UUID；不能把所有教師 cross join 到所有班級。若有多個舊帳號，確認現用教師帳號，而非猜測。
4. 執行 `20260927b_teacher_scope.sql`，限制舊 Week 1／AI 表格及新表格的教師查閱範圍。先確保每個仍在使用的班級都已授權，以免教師暫時看不到資料。
5. 部署 `week2-api`；既有 `Student-api` 維持大寫 S，更新為 student-api/index.ts 內容。CLI 依 config.toml 指定 entrypoint；Dashboard 貼上 `week2-api/index.bundled.ts`，不要與範例程式混貼。
6. 兩個端點都關閉平台層 legacy JWT verification，由程式驗證學生 opaque token／教師 Supabase JWT；不是取消應用層驗證。
7. 後端 Secret 使用現有 `SUPABASE_SERVICE_ROLE_KEY` 與 `OPENAI_API_KEY`，前端只使用 public key。`WEEK2_OPENAI_MODEL` 優先，未設則沿用 `OPENAI_MODEL`，最後 fallback gpt-4o-mini。不要未經固定測試集就切換模型。
8. 以獨立測試班／測試學號實測：Week 1 補交、兩次 upsert 保留版本、原提交時間不變、W2 草稿／提交／改版、同時修改衝突、跨學生不可存取、兩個教師跨班隔離、anon 不可讀表、AI 快取與上限、模型故障後提交。
9. 正式資料庫壓测用 50 個合成測試學生。先測保存／讀取，不呼叫模型；再小量固定案例評估模型，記錄延遲、token、JSON 合格率及教學品質。不要對真實學生大量生成回饋當測試。
10. 完成上述後合併 main、push，等待 GitHub Pages 工作完成，再驗證公開 Week 1 與 Week 2、三個教材連結及教師頁。沒有完成這些不能宣稱上線。

## 回復策略

- SQL 初次執行失敗：transaction 回滾，不重跑 schema.sql，不刪除舊資料表。
- 前端發生回歸：revert 本次 merge commit，重新發布先前版本；不要 reset 遠端歷史。
- 新端點失敗：停止 Week 2 互動入口，保留教材與 Week 1。回復端點到前一部署；保留所有新表及版本資料供修復。
- 不回復成跨班可讀的舊 RLS；若授權漏設，補正特定 teacher_classes 對應。
- 若要撤除新 trigger，必須先私有備份版本，並另做維護計畫；本次不自動 drop 已有學習歷程。

## 限制

學號＋共用班級邀請碼是既有課堂身分方式，不能防止知道別人學號及班級碼的人冒用。端點拒絕請求中的偽造 class/student 欄位，但這不等於強身分驗證。若產品跨班擴大使用，應先換成個別登入或每人一次性邀請。

AI 匿名化採白名單、已知姓名學號移除、常見電話 Email 連結移除、敏感欄位偵測及傳送前預覽。自由文字中的所有第三人姓名／可識別敘述無法保證全數自動辨識；學生需改成角色代稱，有疑慮取消 AI、交由教師處理。

教師歷史按需讀取最近 30 版，完整歷程仍保存在資料庫。班級摘要使用現有紀錄統計，不呼叫 AI，因此沒有班級摘要模型費用。每週限額指本課 Week 2 全部呼叫，不在每個日曆週重新給額度；失敗的已預約模型請求也計入上限以防重試燒額度。
