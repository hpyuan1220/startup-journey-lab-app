# Week 1 平台設定

1. 在 Supabase 建立一個新 Project。
2. 將 `schema.sql` 全部貼進 SQL Editor 執行。
3. 在 Authentication 建立教師 Email／密碼帳號；將該帳號 UUID 填入 `teacher_profiles` 的範例 SQL。
4. 用一組長的班級邀請碼建立班級。邀請碼只發給本班學生。
5. 部署 `student-api` Edge Function。
6. 複製 `webapp/config.js.example` 為 `webapp/config.js`，填入 Project URL 與匿名公開金鑰。

## 測試順序

1. 以測試學號與班級邀請碼進入學生頁，存草稿後重新整理。
2. 補齊八個必填欄位，確認可正式提交與下載文字檔。
3. 以教師帳號登入，確認可看到統計、學生資料與 CSV 匯出。

## 注意

學號加班級邀請碼是課堂用的基本存取方式，不適合保存敏感個資。日後可用學校 Email 或 Google 登入取代學生進入方式，而不必改動既有 `student_id` 與作業資料。
