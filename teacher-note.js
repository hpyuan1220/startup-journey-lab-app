// Startup Journey Lab — 教師回饋：證據摘要、建議稿、同意送出
//
// 和 teacher-ai-feedback.js 一樣用 MutationObserver 掛在既有卡片上，不修改 app.js。
// 建議稿來自 teacher-suggestions.mjs 的規則，不呼叫模型。
// teacher_note 欄位與教師更新政策在 schema.sql 裡早就存在，這裡只是把介面補上。
import {suggest, duplicateCount, CATEGORY_LABELS} from './teacher-suggestions.mjs?v=20260930-note';

const cfg = window.STARTUP_JOURNEY_CONFIG || {};
const list = document.getElementById('submission-list');
if (!list) throw new Error('no list');

const token = () => { try { return sessionStorage.getItem('sjl-teacher-token') || ''; } catch { return ''; } };
const headers = () => ({apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json'});
const configured = () => cfg.supabaseUrl && String(cfg.supabaseUrl).indexOf('YOUR_') === -1;

// 索引一律用 class_id + ':' + student_id。
// 只用學號當 key 時，同一個學號出現在兩個班，後讀到的那一列會覆蓋前一列，
// 於是畫面顯示的是另一班學生的內容，PATCH 也會帶著錯的 class_id 寫進錯的班。
const keyOf = (classId, studentId) => String(classId) + ':' + String(studentId);
let submissions = {};   // class:student -> 作答
let feedback = {};      // class:student -> 最新 AI 回饋
let loaded = false;

async function load() {
  if (!configured() || !token()) return false;
  const get = (path) => fetch(cfg.supabaseUrl + '/rest/v1/' + path, {headers: headers()})
    .then((r) => (r.ok ? r.json() : []));
  const [subs, fbRows] = await Promise.all([
    get('week1_submissions?select=*'),
    get('week1_ai_feedback?select=class_id,student_id,feedback_json,created_at&teacher_hidden=eq.false&order=created_at.asc'),
  ]);
  submissions = {};
  (subs || []).forEach((r) => { submissions[keyOf(r.class_id, r.student_id)] = r; });
  feedback = {};
  (fbRows || []).forEach((r) => { feedback[keyOf(r.class_id, r.student_id)] = r.feedback_json; });
  loaded = true;
  publishAttention();
  return true;
}

function el(tag, text, parent, cls) {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
}

/** 目前畫面上所有建議稿，用來偵測同一句話會送給幾個人。 */
function allDrafts() {
  return [...list.querySelectorAll('.tnote textarea')].map((t) => t.value);
}

async function save(key, studentId, classId, note, statusEl, buttons) {
  buttons.forEach((b) => { b.disabled = true; });
  statusEl.textContent = '儲存中…';
  try {
    // 資料表的唯一鍵是 (class_id, student_id)，兩個都要帶。
    // class_id 取自畫面上那張卡（app.js 輸出的 data-class-id），
    // 不是從只用學號建的索引裡撈 —— 那個索引本身就會被同學號覆蓋。
    if (!classId || !studentId) throw new Error('missing-class');
    const res = await fetch(
      cfg.supabaseUrl + '/rest/v1/week1_submissions'
        + '?class_id=eq.' + encodeURIComponent(classId)
        + '&student_id=eq.' + encodeURIComponent(studentId),
      {method: 'PATCH', headers: Object.assign(headers(), {Prefer: 'return=minimal'}), body: JSON.stringify({teacher_note: note})},
    );
    if (!res.ok) throw new Error('failed');
    if (submissions[key]) submissions[key].teacher_note = note;
    publishAttention();
    statusEl.textContent = note ? '已送出，學生下次打開卡片會看到。' : '已清除。';
    statusEl.dataset.tone = 'ok';
  } catch {
    statusEl.textContent = '儲存失敗，請再試一次。';
    statusEl.dataset.tone = 'error';
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

function decorate(article) {
  if (article.dataset.tnoteDone) return;
  const small = article.querySelector('h3 small');
  const studentId = small ? small.textContent.trim() : '';
  const classId = article.dataset.classId || '';
  const key = keyOf(classId, studentId);
  const submission = submissions[key];
  if (!studentId || !classId || !submission) return;
  article.dataset.tnoteDone = '1';

  const box = el('div', '', article, 'tnote');
  const result = suggest(submission, feedback[key]);

  // 證據摘要：直接顯示已存的分數，不生成任何文字。
  const ev = el('p', '', box, 'tnote-evidence');
  if (result.evidence.total === null) {
    ev.textContent = '尚無 AI 證據評分。';
  } else {
    const weak = result.evidence.rows.filter((r) => typeof r.score === 'number' && r.score <= 1);
    ev.textContent = `證據準備度 ${result.evidence.total}/20 · ${CATEGORY_LABELS[result.category]}`
      + (weak.length ? `　弱項：${weak.map((r) => `${r.label} ${r.score}`).join('、')}` : '');
  }

  const label = el('label', '', box, 'tnote-label');
  el('span', result.needsOwnWords
    ? '這個學生沒有機械式的缺口，建議你自己寫一句'
    : '建議回饋（可直接送出，也可以改寫）', label);
  const area = el('textarea', '', label);
  area.maxLength = 600;
  area.rows = 3;
  area.value = submission.teacher_note || result.text;
  if (submission.teacher_note) {
    el('p', '已送出過，下面的文字是目前學生看到的版本。', box, 'tnote-sent');
  }

  const row = el('div', '', box, 'tnote-actions');
  const statusEl = el('p', '', box, 'tnote-status');
  statusEl.setAttribute('role', 'status');

  const sendBtn = el('button', '送出給學生', row);
  sendBtn.type = 'button';
  const clearBtn = el('button', '清除', row);
  clearBtn.type = 'button';
  clearBtn.className = 'quiet';

  sendBtn.onclick = () => {
    const body = area.value.trim();
    if (!body) { statusEl.textContent = '內容是空的，沒有送出。'; return; }
    // 同一句話送給很多人，學生一對照就會發現，老師的回饋會整批貶值。
    const same = duplicateCount(allDrafts(), body);
    if (same > 1 && !sendBtn.dataset.confirmed) {
      statusEl.textContent = `這句話和另外 ${same - 1} 位學生的建議完全相同。改幾個字會更有用；仍要照原文送出請再按一次。`;
      statusEl.dataset.tone = 'warn';
      sendBtn.dataset.confirmed = '1';
      return;
    }
    delete sendBtn.dataset.confirmed;
    save(key, studentId, classId, body, statusEl, [sendBtn, clearBtn]);
  };
  area.oninput = () => { delete sendBtn.dataset.confirmed; };
  clearBtn.onclick = () => { area.value = ''; save(key, studentId, classId, '', statusEl, [sendBtn, clearBtn]); };
}

/**
 * needs_follow_up 這個欄位從來沒有任何程式寫入過，統計永遠是 0、篩選永遠篩不到東西。
 * 改用已經有的資料算：有機械式缺口、而且還沒收過老師回饋的人。
 * 結果掛在 window 上，app.js 的統計與篩選讀得到就用，讀不到就維持原樣。
 */
function publishAttention() {
  // Set 裡放的是 class:student，不是學號 —— app.js 的 needsAttention 必須用同一把鑰匙。
  const need = new Set();
  Object.entries(submissions).forEach(([key, sub]) => {
    const r = suggest(sub, feedback[key]);
    const answered = typeof sub.teacher_note === 'string' && sub.teacher_note.trim();
    if (!answered && r.category !== 'no_gap') need.add(key);
  });
  window.__sjlNeedsAttention = need;
  document.dispatchEvent(new CustomEvent('sjl-attention-ready'));
}

function decorateAll() {
  if (!loaded) return;
  list.querySelectorAll('article').forEach(decorate);
}

const observer = new MutationObserver(() => decorateAll());
observer.observe(list, {childList: true});

load().then((ok) => { if (ok) decorateAll(); }).catch(() => {});
document.addEventListener('click', (e) => {
  // 教師登入後 app.js 才會畫出清單；登入按鈕點下去之後補抓一次。
  if (e.target && e.target.id === 'teacher-login') {
    setTimeout(() => { load().then((ok) => { if (ok) decorateAll(); }).catch(() => {}); }, 1500);
  }
});
