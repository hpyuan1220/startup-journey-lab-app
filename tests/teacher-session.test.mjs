import {test} from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';

const app = await fsp.readFile(new URL('../app.js', import.meta.url), 'utf8');

// D2：教室共用電腦的情境。
// 老師登入後切到學生頁（或忘了登出），學生在同一個分頁填卡：
// 1) 活動監聽是全域的 → 學生每次打字都重設老師的閒置計時器 → 30 分鐘保護永不觸發
// 2) .view 只是 display:none → 全班姓名與學號仍在 DOM 裡 → 學生按一下「教師洞察」就看到
// 這正是 app.js 開頭註解所要防的情境，卻被這兩件事繞過。
test('D2：只有教師頁上的操作才算老師還在', () => {
  assert.match(app, /function teacherViewActive\(\)/, '要能判斷目前在不在教師頁');
  assert.match(app, /if\(teacherToken&&teacherViewActive\(\)\)touchTeacherActivity\(\)/,
    '活動監聽必須先確認人在教師頁，否則學生打字會一直續期');
  assert.ok(!/window\.addEventListener\(evt,\(\)=>\{if\(teacherToken\)touchTeacherActivity\(\)\}/.test(app),
    '不可再用「只要登入就續期」的舊寫法');
});

test('D2：離開教師頁要把班級名單從 DOM 清掉，不只是隱藏', () => {
  assert.match(app, /function clearTeacherData\(\)/);
  assert.match(app, /const list=\$\('submission-list'\);if\(list\)list\.innerHTML=''/, '名單要真的清空');
  assert.match(app, /const metrics=\$\('metrics'\);if\(metrics\)metrics\.innerHTML=''/, '統計數字也會洩漏班級規模');
  assert.match(app, /if\(name!=='teacher'\)\{clearTeacherData\(\);/, '切走就清');
});

test('D2：登出（手動與閒置）都要清空，不是只隱藏', () => {
  const idle = app.indexOf('閒置超過');
  assert.ok(idle > 0);
  const around = app.slice(idle - 260, idle);
  assert.match(around, /clearTeacherData\(\)/, '閒置登出要清空 DOM');
  assert.match(around, /teacherRows=\[\]/, '記憶體裡的名單也要清掉');
  assert.match(app, /teacher-logout'\)\.onclick=\(\)=>\{storeTeacherSession\(null\);teacherRows=\[\];.*clearTeacherData\(\)/,
    '手動登出同樣要清空');
});

test('D2：背景重畫不可以把名單塞回 DOM', () => {
  // teacher-note.js 的 sjl-attention-ready 與搜尋框都會呼叫 renderTeacher()
  assert.match(app, /if\(!teacherViewActive\(\)\)\{clearTeacherData\(\);return;\}/,
    'renderTeacher 自己要守門');
  // 資料載入完成時人可能已經切走
  assert.match(app, /if\(teacherViewActive\(\)\)\{\$\('teacher-dashboard'\)\.hidden=false;renderTeacher\(\)/,
    '載入完成要先確認人在教師頁才畫');
});

// 清空 DOM 只擋住「檢視原始碼」，擋不住學生按一下「教師洞察」——
// 老師還登入著，名單就會重畫。真正的防線是閒置登出真的會觸發。
// 既然離開教師頁之後沒有任何操作會重設計時器，那段暴露時間就不需要是 30 分鐘。
test('D2：離開教師頁後改用較短的倒數', () => {
  assert.match(app, /const TEACHER_AWAY_MINUTES = 5;/);
  assert.match(app, /if\(teacherToken\)touchTeacherActivity\(TEACHER_AWAY_MINUTES\)/,
    '切走時要用短計時重新起算');
  assert.match(app, /function touchTeacherActivity\(minutes=TEACHER_IDLE_MINUTES\)/,
    '計時長度要能傳入，不可寫死');
  assert.match(app, /\},minutes\*60\*1000\)/, 'setTimeout 要用傳入的分鐘數');
  assert.match(app, /閒置超過 \$\{teacherIdleMinutes\} 分鐘/,
    '訊息要說出實際的分鐘數，不然學生看到 30 但其實是 5');
});

// app.js 清空 #submission-list 會觸發 teacher-ai-feedback.js 的 MutationObserver，
// 它接著又把統計磚塞回 #metrics —— 清了又被寫回來。
// 這跟 D1 是同一個結構性問題：app.js 與 teacher-* 模組寫同一塊 DOM。
test('D2：儀表板隱藏時，其他模組不可以把東西寫回教師區', async () => {
  const tai = await fsp.readFile(new URL('../teacher-ai-feedback.js', import.meta.url), 'utf8');
  assert.match(tai, /var dash = document\.getElementById\('teacher-dashboard'\);/);
  assert.match(tai, /if \(dash && dash\.hidden\)/, '儀表板沒顯示就不要寫進去');
  assert.match(tai, /if \(stale\) stale\.remove\(\)/, '已經在的也要移掉');
});
