# 上線流程（每次改程式之後）

分工：AI 助理準備、貼入、驗證；**老師按 push、Run、Deploy**。順序不要跳。

## 1. 改完先測（AI 做）
- `node --test tests/*.test.mjs` 全綠。
- 動到 `week2-api` 就 `node scripts/build-week2-function.mjs` 重新打包，再跑 `WEEK2_HANDLER=bundled node --test tests/week2-api.test.mjs tests/week2-journey.test.mjs tests/week2-revision.test.mjs`。
- 真瀏覽器測試：每個測試起自己的驗收伺服器（`PORT=42xx node tests/serve-acceptance.mjs`），因為有的測試會在伺服器上建名單、影響後面的登入。
- 記下要部署的檔案雜湊：`sha256sum <file> | cut -c1-16` 與位元組數。

## 2. 寫回專案、記錄、commit（AI 做）
- 改動寫回老師電腦的專案資料夾；在老師電腦再跑一次單元測試。
- `docs/PROJECT_STATE.md` 追加一段：做了什麼、測試數字、要部署的雜湊。
- commit 訊息寫在 `docs/private/commit-msg.txt`，`git commit -F`。
- 確認 `git ls-files | grep -c docs/private` 是 0。

## 3. push（老師按）
```
cd "<專案資料夾>" && rm -f .git/HEAD.lock .git/index.lock && git push
```
AI 用 `git fetch` 比對本機 HEAD 與 origin/main 一致才算完成。GitHub Pages 幾十秒後更新；靜態檔要換 `?v=` 版本號才不會被快取。

## 4. Migration（有新資料表或欄位時；老師按 Run）
- AI 從 `raw.githubusercontent.com/<repo>/<commit>/supabase/migrations/<file>.sql` 抓檔貼進 SQL Editor；貼完補一次鍵盤輸入事件，否則 Supabase 可能回「Too small: expected string to have >=1 characters」（代表它收到空字串，資料庫沒動，重貼再 Run 即可）。
- 含學生資料的 SQL 只放 `docs/private/`，由本機 base64 傳進頁面，不走 GitHub。
- Run 後 AI 讀結果格；預期值在 SQL 最後一句 `select` 裡寫死（例：`應為 0`）。
- 出錯時先確認交易是否回滾（`begin … commit` 包著的話是），再修 SQL 重跑；不要憑記憶判斷「應該沒寫進去」。

## 5. 部署 Edge Function（老師按 Deploy）
- 開 `Dashboard → Edge Functions → <函式> → Code`。
- AI 從 raw GitHub 抓部署檔（`week2-api` 用 `index.bundled.ts`；`Student-api` 用 `index.ts`），三方比對雜湊：GitHub／老師電腦／編輯器貼入後，三者一致才請老師按。
- 貼入前先列出「線上有、新版沒有」的行，確認沒有別的改動會被蓋掉。
- 老師按「Deploy updates」。AI 再讀一次：雜湊不變、`M` 標記 0、時間戳「a few seconds ago」。

## 6. 零寫入探針（AI 做，從正式站頁面用 fetch 打）
GET → 405；壞 JSON → 400；學生無 token → 401；假 token → 401；教師無 JWT → 401；新規則各加一條（例：不在名單 → 422）。不用真學號登入、不按任何會寫入的按鈕。

## 7. 正式站驗證（AI 做）
- GitHub Pages 的 HTML 已帶新版本號。
- 用老師測試學號載入畫面，確認新功能出現；需要證明沒寫入時打 `*_load` 看 `row=null`。
- 老師端功能由老師自己登入後操作（AI 不碰密碼）。

## 8. 記錄（AI 做，老師再 push 一次）
`docs/PROJECT_STATE.md` 追加「上線（實證）」：雜湊、探針結果、正式站看到的數字、踩到的坑。

## 常見的坑
- 老師電腦刪不了檔：git 留 `.lock`，要老師 `rm -f`；AI 可以 `mv` 成別名繞過。
- Edge Function 名稱大小寫固定（`Student-api`）。
- 教師登入會過期；過期就請老師重新登入，AI 不輸入密碼。
- 瀏覽器面板被收起來時老師看不到，請他 Cmd+Shift+B 叫回來。
