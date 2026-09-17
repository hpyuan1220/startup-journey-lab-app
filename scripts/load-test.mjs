// Startup Journey Lab — Week 1 AI 回饋 50 人並發壓力測試
//
// 在你自己的 Mac 終端機執行（沙箱環境連不到 supabase.co）：
//
//   cd "<專案資料夾>"
//   SJL_INVITE_CODE='你的班級邀請碼' node scripts/load-test.mjs
//
// 預設只驗證登入與欄位檢查，不呼叫模型、不花錢。
// 要做真正的並發測試，加上 --spend：
//
//   SJL_INVITE_CODE='...' node scripts/load-test.mjs --spend
//
// 注意：快取是以 (班級, 學號, 週次, 內容雜湊) 為鍵，所以 50 個不同學號
// 就是 50 次真實模型呼叫。以 gpt-4o-mini 估算約 2–3 美分。
//
// 測試結束後請用腳本最後印出的 SQL 清除測試資料。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readConfig() {
  const raw = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const url = raw.match(/supabaseUrl:\s*'([^']+)'/);
  const key = raw.match(/supabaseAnonKey:\s*'([^']+)'/);
  if (!url || !key) throw new Error('無法從 config.js 讀出 supabaseUrl / supabaseAnonKey');
  return { url: url[1], key: key[1] };
}

const cfg = readConfig();
const INVITE = process.env.SJL_INVITE_CODE;
const COUNT = Number(process.env.SJL_STUDENTS || '50');
const PREFIX = process.env.SJL_PREFIX || 'LOADTEST';
const SPEND = process.argv.includes('--spend');

if (!INVITE) {
  console.error('缺少 SJL_INVITE_CODE。範例：');
  console.error("  SJL_INVITE_CODE='你的邀請碼' node scripts/load-test.mjs");
  process.exit(1);
}

const headers = { apikey: cfg.key, 'Content-Type': 'application/json' };
const post = (fn, body) =>
  fetch(`${cfg.url}/functions/v1/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });

function submissionFor(i) {
  return {
    observed_problem: `星期三中午校園餐廳外排隊超過二十分鐘，我趕不回教室上課。（壓測樣本 ${i}）`,
    affected_user: '中午只有五十分鐘、下午第一堂在另一棟大樓的大二學生。',
    known_fact: '我連續三週中午十二點十分到場，每次都要排十八到二十五分鐘。',
    unverified_assumption: '我猜大部分同學也因此放棄吃午餐。',
    expected_learning: '學會用訪談確認別人是不是也遇到同樣情況。',
    concern: '擔心我只是自己特別趕，別人其實沒感覺。'
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarise(title, results) {
  const times = results.filter((r) => r.ms != null).map((r) => r.ms).sort((a, b) => a - b);
  const codes = {};
  results.forEach((r) => { codes[r.status] = (codes[r.status] || 0) + 1; });
  console.log(`\n--- ${title} ---`);
  console.log('狀態碼分布：', codes);
  if (times.length) {
    console.log(
      `延遲（毫秒） p50=${percentile(times, 50)}  p90=${percentile(times, 90)}` +
      `  p99=${percentile(times, 99)}  max=${times[times.length - 1]}`
    );
  }
  const cached = results.filter((r) => r.cached).length;
  if (cached) console.log(`快取命中：${cached} / ${results.length}`);
  const errors = results.filter((r) => r.error);
  if (errors.length) {
    const seen = {};
    errors.forEach((e) => { seen[e.error] = (seen[e.error] || 0) + 1; });
    console.log('錯誤訊息：', seen);
  }
  return { codes, times, cached, errorCount: errors.length };
}

async function timed(fn) {
  const started = Date.now();
  try {
    const res = await fn();
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ms: Date.now() - started, body, error: res.ok ? null : (body.error || `http-${res.status}`), cached: !!body.cached };
  } catch (e) {
    return { status: 'network', ms: Date.now() - started, error: String(e.message || e) };
  }
}

console.log(`目標：${cfg.url}`);
console.log(`模擬學生數：${COUNT}（學號前綴 ${PREFIX}）`);
console.log(`模式：${SPEND ? '完整並發（會呼叫模型並產生費用）' : '僅驗證（不呼叫模型、不花錢）'}`);

// 階段一：登入，取得 session token
console.log('\n[1/3] 登入測試學生…');
const loginResults = [];
const tokens = [];
for (let i = 0; i < COUNT; i += 10) {
  const batch = [];
  for (let j = i; j < Math.min(i + 10, COUNT); j += 1) {
    const id = `${PREFIX}-${String(j + 1).padStart(3, '0')}`;
    batch.push(timed(() => post('Student-api', { action: 'login', student_id: id, invite_code: INVITE })));
  }
  const done = await Promise.all(batch);
  done.forEach((r) => {
    loginResults.push(r);
    if (r.body && r.body.token) tokens.push(r.body.token);
  });
}
summarise('階段一：登入', loginResults);

if (!tokens.length) {
  console.error('\n沒有任何登入成功 —— 邀請碼可能不正確。後續階段中止。');
  process.exit(1);
}

// 階段二：欄位驗證 —— 故意少一個必填欄位，應該全部被擋在模型之前
console.log('\n[2/3] 驗證必填欄位檢查（不呼叫模型）…');
const invalid = await Promise.all(
  tokens.slice(0, Math.min(10, tokens.length)).map((token) => {
    const bad = submissionFor(0);
    delete bad.known_fact;
    return timed(() => post('ai-feedback', { action: 'feedback', token, submission: bad }));
  })
);
const invalidSummary = summarise('階段二：缺欄位應回 422', invalid);
const allBlocked = Object.keys(invalidSummary.codes).every((c) => c === '422');
console.log(allBlocked ? '✅ 全部被伺服器端擋下' : '❌ 有請求沒有被擋下，需要檢查');

// 階段三：並發
if (!SPEND) {
  console.log('\n[3/3] 略過並發測試（未加 --spend）。');
  console.log('要做真正的 50 人並發，重跑並加上 --spend：');
  console.log("  SJL_INVITE_CODE='...' node scripts/load-test.mjs --spend");
} else {
  console.log(`\n[3/3] ${tokens.length} 個請求同時送出…`);
  const started = Date.now();
  const concurrent = await Promise.all(
    tokens.map((token, i) => timed(() => post('ai-feedback', { action: 'feedback', token, submission: submissionFor(i) })))
  );
  const wall = Date.now() - started;
  const s = summarise('階段三：並發請求', concurrent);
  console.log(`整批完成時間：${wall} 毫秒`);

  const ok = concurrent.filter((r) => r.status === 200).length;
  const rate = concurrent.filter((r) => r.status === 429).length;
  const fail = concurrent.filter((r) => r.status === 502 || r.status === 503).length;

  console.log('\n===== 判讀 =====');
  console.log(`成功 ${ok} / ${concurrent.length}`);
  if (rate) console.log(`被每日次數上限擋下 ${rate} 筆 —— 這是預期行為，代表限流有效`);
  if (fail) console.log(`模型端失敗 ${fail} 筆 —— 檢查 OpenAI 額度與速率限制`);
  if (s.times.length && percentile(s.times, 90) > 20000) {
    console.log('p90 超過 20 秒 —— 學生會覺得卡住，建議在課堂上分批使用');
  }
  console.log(ok === concurrent.length ? '✅ 驗收項目 12 通過' : '⚠️ 未全數成功，見上方狀態碼');
}

console.log('\n===== 清除測試資料 =====');
console.log('在 Supabase SQL Editor 執行：\n');
console.log(`delete from public.week1_ai_feedback where student_id like '${PREFIX}-%';`);
console.log(`delete from public.week1_submissions  where student_id like '${PREFIX}-%';`);
console.log(`delete from public.student_sessions   where student_id like '${PREFIX}-%';`);
