// Startup Journey Lab — 教師洞察的 AI 回饋區塊（獨立模組）
// 不修改 app.js：用 MutationObserver 掛在既有的學生卡片上。
// AI 結果只供教師參考，不寫入任何成績欄位。
(function () {
  'use strict';

  var DIMENSIONS = [
    ['problem_specificity', '問題具體度'],
    ['affected_user_clarity', '對象清楚'],
    ['fact_quality', '事實品質'],
    ['fact_assumption_separation', '事實假設分開'],
    ['next_validation_step', '下一步方向']
  ];

  var cfg = window.STARTUP_JOURNEY_CONFIG || {};
  var list = document.getElementById('submission-list');
  var dashboard = document.getElementById('teacher-dashboard');
  var metrics = document.getElementById('metrics');
  if (!list || !dashboard) return;

  var byStudent = {};
  var loaded = false;
  var inflight = null;

  function token() {
    try { return localStorage.getItem('sjl-teacher-token') || ''; } catch (e) { return ''; }
  }

  function configured() {
    return cfg.supabaseUrl && String(cfg.supabaseUrl).indexOf('YOUR_') === -1;
  }

  function headers() {
    return {
      apikey: cfg.supabaseAnonKey,
      Authorization: 'Bearer ' + token(),
      'Content-Type': 'application/json'
    };
  }

  // 共用同一個進行中的請求，避免兩個 observer 同時觸發時，
  // 後到的那個拿到空 Promise 就用空資料去渲染。
  function fetchFeedback() {
    if (!configured() || !token()) return Promise.resolve();
    if (inflight) return inflight;
    inflight = fetch(cfg.supabaseUrl + '/rest/v1/week1_ai_feedback_latest?select=*', { headers: headers() })
      .then(function (res) {
        if (!res.ok) throw new Error('http-' + res.status);
        return res.json();
      })
      .then(function (rows) {
        byStudent = {};
        (rows || []).forEach(function (row) { byStudent[row.student_id] = row; });
        loaded = true;
      })
      .catch(function () {
        // 讀不到就維持原樣，並允許下次重新整理時再試一次。
        loaded = false;
      })
      .then(function () { inflight = null; });
    return inflight;
  }

  function isEmpty() {
    for (var k in byStudent) { if (Object.prototype.hasOwnProperty.call(byStudent, k)) return false; }
    return true;
  }

  function hideFeedback(id, button) {
    button.disabled = true;
    button.textContent = '隱藏中…';
    fetch(cfg.supabaseUrl + '/rest/v1/week1_ai_feedback?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: Object.assign(headers(), { Prefer: 'return=minimal' }),
      body: JSON.stringify({ teacher_hidden: true })
    }).then(function (res) {
      if (!res.ok) throw new Error('failed');
      loaded = false;
      return fetchFeedback();
    }).then(function () {
      decorateAll(true);
    }).catch(function () {
      button.disabled = false;
      button.textContent = '隱藏失敗，請重試';
    });
  }

  function scoreRow(readiness) {
    var wrap = document.createElement('div');
    wrap.className = 'tai-scores';
    DIMENSIONS.forEach(function (pair) {
      var item = (readiness && readiness[pair[0]]) || {};
      var cell = document.createElement('span');
      cell.className = 'tai-score';
      var label = document.createElement('b');
      label.textContent = pair[1];
      var value = document.createElement('i');
      value.textContent = (item.score === 0 || item.score) ? String(item.score) : '—';
      value.title = item.reason || '';
      cell.appendChild(label);
      cell.appendChild(value);
      wrap.appendChild(cell);
    });
    return wrap;
  }

  function block(row) {
    var fb = row.feedback_json || {};
    var readiness = fb.readiness || {};
    var box = document.createElement('div');
    box.className = 'tai-block';

    var head = document.createElement('div');
    head.className = 'tai-head';
    var title = document.createElement('b');
    title.textContent = 'AI 證據準備度';
    var total = document.createElement('span');
    total.className = 'tai-total';
    total.textContent = String(readiness.total_readiness) + ' / 20';
    head.appendChild(title);
    head.appendChild(total);
    box.appendChild(head);

    box.appendChild(scoreRow(readiness));

    if (fb.overall_feedback) {
      var overall = document.createElement('p');
      overall.className = 'tai-overall';
      overall.textContent = fb.overall_feedback;
      box.appendChild(overall);
    }

    var detail = document.createElement('details');
    var summary = document.createElement('summary');
    summary.textContent = '看 AI 指出的缺口與追問';
    detail.appendChild(summary);
    [['missing_evidence', '還需要補充的證據'], ['follow_up_questions', '可以追問的問題']].forEach(function (pair) {
      var items = fb[pair[0]] || [];
      if (!items.length) return;
      var h = document.createElement('b');
      h.textContent = pair[1];
      detail.appendChild(h);
      var ul = document.createElement('ul');
      items.forEach(function (text) {
        var li = document.createElement('li');
        li.textContent = text;
        ul.appendChild(li);
      });
      detail.appendChild(ul);
    });
    if (fb.next_small_action) {
      var act = document.createElement('p');
      act.textContent = 'AI 建議的下一步：' + fb.next_small_action;
      detail.appendChild(act);
    }
    box.appendChild(detail);

    var foot = document.createElement('div');
    foot.className = 'tai-foot';
    var meta = document.createElement('small');
    meta.textContent = row.model_name + '｜' + new Date(row.created_at).toLocaleString('zh-TW') + '｜僅供參考，不計入成績';
    foot.appendChild(meta);
    var hide = document.createElement('button');
    hide.type = 'button';
    hide.className = 'tai-hide';
    hide.textContent = '隱藏這則';
    hide.onclick = function () { hideFeedback(row.id, hide); };
    foot.appendChild(hide);
    box.appendChild(foot);

    return box;
  }

  function studentIdOf(article) {
    var small = article.querySelector('h3 small');
    return small ? small.textContent.trim() : '';
  }

  function decorateAll(force) {
    var articles = list.querySelectorAll('article');
    var shown = 0;
    for (var i = 0; i < articles.length; i += 1) {
      var article = articles[i];
      if (force) {
        var old = article.querySelector('.tai-block, .tai-empty');
        if (old) old.remove();
        delete article.dataset.taiDone;
      }
      if (article.dataset.taiDone) {
        if (article.querySelector('.tai-block')) shown += 1;
        continue;
      }
      var row = byStudent[studentIdOf(article)];
      if (row) {
        article.appendChild(block(row));
        shown += 1;
      } else if (loaded) {
        var none = document.createElement('p');
        none.className = 'tai-empty';
        none.textContent = '尚未取得 AI 建議。';
        article.appendChild(none);
      }
      article.dataset.taiDone = '1';
    }
    updateMetric(shown);
  }

  function updateMetric(count) {
    if (!metrics || !loaded) return;
    var existing = metrics.querySelector('.tai-metric');
    if (!existing) {
      existing = document.createElement('div');
      existing.className = 'tai-metric';
      existing.innerHTML = '<strong></strong><span>已取得 AI 建議</span>';
      metrics.appendChild(existing);
    }
    existing.querySelector('strong').textContent = String(count);
  }

  var observer = new MutationObserver(function () {
    if (!loaded || isEmpty()) {
      fetchFeedback().then(function () { decorateAll(true); });
    } else {
      decorateAll(false);
    }
  });
  observer.observe(list, { childList: true });

  // 教師登入後，dashboard 的 hidden 屬性會被移除 —— 那時才去抓資料。
  new MutationObserver(function () {
    if (!dashboard.hidden) {
      loaded = false;
      fetchFeedback().then(function () { decorateAll(true); });
    } else {
      byStudent = {};
      loaded = false;
    }
  }).observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });

  if (!dashboard.hidden) {
    fetchFeedback().then(function () { decorateAll(true); });
  }
})();
