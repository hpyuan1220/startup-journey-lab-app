// Startup Journey Lab — Week 1 AI 學習建議（獨立模組）
// 這個檔案不修改 app.js，也不依賴其中的變數；只讀取表單欄位與 localStorage 的學生工作階段。
(function () {
  'use strict';

  var FIELDS = [
    'observed_problem',
    'affected_user',
    'known_fact',
    'unverified_assumption',
    'expected_learning',
    'concern',
  ];

  var DIMENSIONS = [
    ['problem_specificity', '問題具體度'],
    ['affected_user_clarity', '受影響對象是否清楚'],
    ['fact_quality', '事實品質'],
    ['fact_assumption_separation', '事實與假設是否分開'],
    ['next_validation_step', '下一步驗證方向'],
  ];

  var SECTIONS = [
    ['strengths', '做得好的地方'],
    ['missing_evidence', '還需要補充的證據'],
    ['follow_up_questions', '可以再追問自己的問題'],
  ];

  var root = document.getElementById('ai-feedback');
  if (!root) return;

  var cfg = window.STARTUP_JOURNEY_CONFIG || {};
  var form = document.getElementById('week1-form');
  var runButton = document.getElementById('ai-feedback-run');
  var statusEl = document.getElementById('ai-feedback-status');
  var bodyEl = document.getElementById('ai-feedback-body');
  var shownHash = null;
  var busy = false;

  function session() {
    try {
      return JSON.parse(localStorage.getItem('sjl-student-session') || 'null');
    } catch (error) {
      return null;
    }
  }

  function values() {
    var data = {};
    FIELDS.forEach(function (key) {
      var field = form && form.elements[key];
      data[key] = field && field.value ? String(field.value).trim() : '';
    });
    return data;
  }

  function missingFields(data) {
    return FIELDS.filter(function (key) {
      return !data[key];
    });
  }

  function simpleHash(text) {
    var hash = 5381;
    for (var i = 0; i < text.length; i += 1) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
    return 'h' + hash.toString(16);
  }

  function contentHash(data) {
    var text = JSON.stringify(FIELDS.map(function (key) { return data[key]; }));
    if (window.crypto && window.crypto.subtle && window.isSecureContext) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
          return ('0' + byte.toString(16)).slice(-2);
        }).join('');
      }).catch(function () { return simpleHash(text); });
    }
    return Promise.resolve(simpleHash(text));
  }

  // 狀態同時以圖示與文字呈現，不只依靠顏色。
  function setStatus(tone, icon, text) {
    statusEl.className = 'ai-feedback-status tone-' + tone;
    statusEl.textContent = '';
    var mark = document.createElement('span');
    mark.className = 'ai-status-icon';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = icon;
    statusEl.appendChild(mark);
    statusEl.appendChild(document.createTextNode(text));
  }

  function stateKey() {
    var s = session();
    return s && s.student_id ? 'sjl-ai-feedback-' + s.student_id : '';
  }

  function remember(feedback, hash) {
    var key = stateKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify({ feedback: feedback, hash: hash, at: Date.now() }));
    } catch (error) { /* 無法寫入時略過，不影響功能 */ }
  }

  function recall() {
    var key = stateKey();
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (error) {
      return null;
    }
  }

  function list(title, items) {
    var wrap = document.createElement('section');
    var heading = document.createElement('h3');
    heading.textContent = title;
    wrap.appendChild(heading);
    var ul = document.createElement('ul');
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function readinessTable(readiness) {
    var table = document.createElement('table');
    table.className = 'ai-readiness';
    var caption = document.createElement('caption');
    caption.textContent = '證據準備度（每項 0–4 分，總分 20 分）';
    table.appendChild(caption);
    var head = document.createElement('tr');
    ['項目', '分數', '理由'].forEach(function (label) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      head.appendChild(th);
    });
    table.appendChild(head);
    DIMENSIONS.forEach(function (pair) {
      var item = readiness[pair[0]] || {};
      var row = document.createElement('tr');
      var name = document.createElement('th');
      name.scope = 'row';
      name.textContent = pair[1];
      var score = document.createElement('td');
      score.textContent = String(item.score);
      var reason = document.createElement('td');
      reason.textContent = item.reason || '';
      row.appendChild(name);
      row.appendChild(score);
      row.appendChild(reason);
      table.appendChild(row);
    });
    var totalRow = document.createElement('tr');
    totalRow.className = 'ai-total';
    var totalName = document.createElement('th');
    totalName.scope = 'row';
    totalName.textContent = '總分';
    var totalValue = document.createElement('td');
    totalValue.textContent = String(readiness.total_readiness) + ' / 20';
    var totalNote = document.createElement('td');
    totalNote.textContent = '此分數僅供自我檢查，不是課程成績。';
    totalRow.appendChild(totalName);
    totalRow.appendChild(totalValue);
    totalRow.appendChild(totalNote);
    table.appendChild(totalRow);
    return table;
  }

  function render(feedback) {
    bodyEl.textContent = '';
    if (!feedback || !feedback.readiness) {
      bodyEl.hidden = true;
      return;
    }

    var overall = document.createElement('p');
    overall.className = 'ai-overall';
    overall.textContent = feedback.overall_feedback;
    bodyEl.appendChild(overall);

    SECTIONS.forEach(function (pair) {
      var items = feedback[pair[0]] || [];
      if (items.length) bodyEl.appendChild(list(pair[1], items));
    });

    var action = document.createElement('p');
    action.className = 'ai-next-action';
    var actionLabel = document.createElement('strong');
    actionLabel.textContent = '這一週可以做的下一步：';
    action.appendChild(actionLabel);
    action.appendChild(document.createTextNode(feedback.next_small_action));
    bodyEl.appendChild(action);

    bodyEl.appendChild(readinessTable(feedback.readiness));

    var limits = document.createElement('p');
    limits.className = 'ai-limitations';
    limits.textContent = 'AI 回饋限制：' + feedback.limitations;
    bodyEl.appendChild(limits);

    bodyEl.hidden = false;
  }

  function post(payload) {
    return fetch(cfg.supabaseUrl + '/functions/v1/ai-feedback', {
      method: 'POST',
      headers: { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || '目前無法取得建議，你的內容仍已安全保存。');
        return body;
      });
    });
  }

  function requestFeedback() {
    if (busy) return;
    var current = session();
    if (!current || !current.token) {
      setStatus('warn', '⚠', '請先用學號與班級邀請碼進入起點卡。');
      return;
    }
    if (!cfg.supabaseUrl || String(cfg.supabaseUrl).indexOf('YOUR_') > -1) {
      setStatus('warn', '⚠', '尚未設定 Supabase 連線資訊，無法取得建議。');
      return;
    }

    var data = values();
    var missing = missingFields(data);
    if (missing.length) {
      // 必填欄位未完成時，不送出任何 AI 請求。
      setStatus('warn', '⚠', '請先完成上面六個必填欄位（還缺 ' + missing.length + ' 項），才能取得 AI 建議。');
      return;
    }

    busy = true;
    runButton.disabled = true;
    runButton.setAttribute('aria-busy', 'true');
    setStatus('busy', '⏳', '正在分析你的觀察與證據……');

    // 只送出六個欄位，不包含姓名、學號、班級邀請碼或登入權杖以外的身份資料。
    var submission = {};
    FIELDS.forEach(function (key) { submission[key] = data[key]; });

    contentHash(data).then(function (hash) {
      return post({ action: 'feedback', token: current.token, submission: submission }).then(function (result) {
        render(result.feedback);
        shownHash = hash;
        remember(result.feedback, hash);
        setStatus('done', '✓', result.cached ? 'AI 建議已更新（內容未變動，沿用先前結果）' : 'AI 建議已更新');
      });
    }).catch(function (error) {
      setStatus('error', '⚠', error.message || '目前無法取得建議，你的內容仍已安全保存');
    }).then(function () {
      busy = false;
      runButton.disabled = false;
      runButton.removeAttribute('aria-busy');
    });
  }

  function markStale() {
    if (busy || bodyEl.hidden) return;
    contentHash(values()).then(function (hash) {
      if (shownHash && hash !== shownHash) {
        setStatus('stale', '✎', '你已修改內容，可以重新取得建議');
      }
    });
  }

  function restore() {
    var current = session();
    if (!current || !current.token) return;

    var local = recall();
    if (local && local.feedback) {
      render(local.feedback);
      shownHash = local.hash || null;
      setStatus('done', '✓', '已載入上次的 AI 建議');
    }

    if (!cfg.supabaseUrl || String(cfg.supabaseUrl).indexOf('YOUR_') > -1) return;
    post({ action: 'latest', token: current.token }).then(function (result) {
      if (!result.feedback) return;
      render(result.feedback);
      if (!local || !local.hash) shownHash = null;
      setStatus('done', '✓', '已載入上次的 AI 建議');
    }).catch(function () { /* 讀不到最新回饋時沿用本機版本 */ });
  }

  runButton.addEventListener('click', requestFeedback);
  if (form) form.addEventListener('input', markStale);
  restore();
})();
