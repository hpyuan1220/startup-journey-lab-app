# 開新班手冊（Startup Journey Lab）

這份手冊讓「下學期開新班」「另一位老師開同一門課」在 30 分鐘內完成，不改任何程式碼。
不同課程（內容不是創業起點的）請看最後一節「開一門新課」。

## 0. 系統裡「一個班」是什麼

- 資料庫每張表都綁 `class_id`；老師帳號透過 `teacher_classes` 決定看得到哪些班；所有教師端查詢只回自己的班。
- 學生用「學號＋班級邀請碼」進入；邀請碼只存雜湊（`classes.invite_code_hash`），資料庫裡看不到原碼，要自己記好。
- 每班各自有：名單（`class_roster`，有名單就擋不在名單上的學號）、AI 上限（`week2_settings`）、普查題目（`week3_survey_topics`）。
- 同一位老師可以同時有好幾個班，教師洞察會一班一區塊顯示。

## 1. 開班前要準備的四樣東西

| 項目 | 例子 | 規則 |
|---|---|---|
| 班級名稱 | `Startup Journey Lab 2027 春 企管二乙` | 學生看得到，寫清楚學期與班級 |
| 邀請碼 | `SJL-2027S-SHU-2B` | 大寫英數與連字號、12 字以上；一班一碼；不要重用舊碼 |
| 名單 CSV | 兩欄：學號、姓名 | 學號大寫、無空白；從 TronClass 匯出後整理 |
| 老師帳號 | Supabase Authentication 的 Email | 新老師才需要；已有帳號跳過 |

名單檔放在 `docs/private/`（已 gitignore），檔名建議 `roster-<學期>-<班級>.csv`。

## 2. 開班 SQL（在 Supabase SQL Editor 跑，照順序）

把 `<...>` 換掉。整段用交易包著，任何一步失敗就全部不算。

```sql
begin;

-- (a) 建班：邀請碼只存雜湊
insert into public.classes (name, invite_code_hash)
values ('<班級名稱>', extensions.crypt('<邀請碼>', extensions.gen_salt('bf')))
returning id;   -- 記下這個 class_id，下面全部要用

-- (b) 新老師才需要：先在 Authentication > Users 建帳號，拿到 UUID
-- insert into public.teacher_profiles (id, display_name) values ('<AUTH_USER_UUID>', '<老師姓名>') on conflict do nothing;

-- (c) 把老師綁到這個班（舊老師用自己的 UUID）
insert into public.teacher_classes (teacher_id, class_id) values ('<TEACHER_UUID>', '<CLASS_ID>') on conflict do nothing;

-- (d) 名單：一行一位（由 CSV 產生；老師測試帳號也加一列，才進得了學生端）
insert into public.class_roster (class_id, student_id, student_name) values
  ('<CLASS_ID>','A11xxxxxxx','王小明'),
  ('<CLASS_ID>','<老師測試學號>','<老師姓名>（老師測試用）')
on conflict (class_id, student_id) do update set student_name = excluded.student_name;

commit;

-- 核對
select c.name, (select count(*) from public.class_roster r where r.class_id=c.id) as roster,
       (select count(*) from public.teacher_classes t where t.class_id=c.id) as teachers
from public.classes c where c.id='<CLASS_ID>';
```

CSV 轉成 (d) 那段 VALUES 的一行指令（在專案資料夾）：

```bash
python3 -c "import csv,sys;cid=sys.argv[2];print(',\n'.join(f\"  ('{cid}','{r[0].strip().upper()}','{r[1].strip()}')\" for r in csv.reader(open(sys.argv[1],encoding='utf-8')) if r and r[0].strip() and not r[0].startswith('學號')))" docs/private/roster-<學期>-<班級>.csv <CLASS_ID>
```

## 3. 開班後在畫面上做的事（老師自己）

1. 教師洞察 → 載入 Week 2 → 看到新班區塊 → **班級設定**：AI 上限（留白＝引導 3／標準 2／挑戰 2）。
2. **班級名單**面板：確認人數；加選的人從這裡加。
3. **全班痛點普查**：Week 3 前再按「載入預設 22 題」改字→儲存。Week 1、2 不用管它。
4. 用老師測試學號走一次：學生入口 → 學號＋邀請碼 → 填 Week 1 → Week 2 → Week 3，確認都進得去；資料用完用 `docs/private/` 的清理 SQL 刪掉（只刪測試學號）。

## 4. 給學生的東西

- 入口：`https://hpyuan1220.github.io/startup-journey-lab-app/index.html#student`
- Week 2：`…/week.html?week=2#card`；Week 3：`…/week.html?week=3#card`
- 邀請碼用群組或投影給，不要寫進任何公開頁面。
- 學號打錯會被擋在門口（訊息會叫他核對學生證）；真的不在名單的人請老師從名單面板加。

## 5. 一學期的節奏（每週要做的事，程式都已經有）

| 週 | 課前 | 課中 | 課後 |
|---|---|---|---|
| 1 | 名單匯入、測試帳號走一次 | 學生填起點卡 | 教師洞察看 Week 1 |
| 2 | — | 痛點卡（引導模式）、AI 建議 | 用「已交、還沒審」篩選審卡：確認／指路 |
| 3 | 審完 Week 2、改普查題目並開放 | 普查→準備單→兩輪模擬訪談 | 看 Week 3 紀錄卡 |
| 4+ | 尚未建置（只有學習藍圖頁） | | |

## 6. 收尾（學期末）

- 匯出：教師洞察「匯出 Week 2 CSV」「匯出普查 CSV」；Week 1 在 Week 1 洞察匯出。
- 保留或刪除：資料都綁 `class_id`，要整班刪除時只動那個 `class_id`（先匯出再刪；刪除 SQL 另寫，不要憑記憶）。
- 邀請碼作廢：`update public.classes set invite_code_hash = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')) where id='<CLASS_ID>';`

## 7. 開一門新課（內容不是創業起點）

這套系統的「互動方式」（登入、卡片、版本、AI 建議、三階燈、老師指路、普查）可以重用，但「內容」是寫死給這門課的。開新課要改的地方，依難度：

1. 只改文字（半天）：`week.js` 的十週標題／摘要／步驟；`week.html` 各週學習頁；`materials/` 簡報（用 `scripts/build-week3-slides.py` 的方式套版面換文字）。
2. 改卡片欄位（一到兩週）：Week 1 欄位在 `index.html`＋`app.js`＋`student-api`；Week 2 欄位與檢查在 `week2-core.mjs`；品質八標準在 `week2-quality.mjs`；AI 提示詞在 `supabase/functions/week2-api/index.ts`（`aiInput`／prompt）。每改一處都要改對應的測試（`tests/`）。
3. 真正的「課程包」（抽成資料、老師在後台設定）：還沒做；有第二門真實課程再做，否則會做錯方向。

建議：新課先用「複製整個 repo → 改文字層 → 需要時再改欄位層」，而不是在同一個 repo 裡加開關。
