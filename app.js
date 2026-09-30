const cfg = window.STARTUP_JOURNEY_CONFIG || {};
const required = ['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const $ = (id) => document.getElementById(id);
let studentSession = JSON.parse(localStorage.getItem('sjl-student-session') || 'null');
let teacherSession = JSON.parse(localStorage.getItem('sjl-teacher-session') || 'null');
let teacherToken = teacherSession?.access_token || localStorage.getItem('sjl-teacher-token') || '';
let teacherRows = [];
let savedStatus = '';

function configured(){ return cfg.supabaseUrl && !cfg.supabaseUrl.includes('YOUR_') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('YOUR_'); }
function message(id, text, bad=false){ const el=$(id); el.textContent=text; el.classList.toggle('error',bad); }
function startAction(button, label){
  if(!button) return;
  button.dataset.defaultLabel ||= button.textContent;
  button.classList.remove('action-success','action-failed');
  button.textContent=label;
  button.disabled=true;
}
function finishAction(button, label, failed=false){
  if(!button) return;
  button.disabled=false;
  button.textContent=label;
  button.classList.toggle('action-success',!failed);
  button.classList.toggle('action-failed',failed);
  clearTimeout(button._labelTimer);
  button._labelTimer=setTimeout(()=>{
    button.textContent=button.dataset.defaultLabel || button.textContent;
    button.classList.remove('action-success','action-failed');
  },2200);
}
function formData(){ const data=Object.fromEntries(new FormData($('week1-form')).entries()); data.consent_to_share_in_class=$('week1-form').consent_to_share_in_class.checked; data.student_id=studentSession?.student_id || ''; return data; }
function fill(data={}){ savedStatus=data.status || ''; Object.entries(data).forEach(([k,v])=>{const el=$('week1-form').elements[k]; if(el) el.type==='checkbox' ? el.checked=Boolean(v) : el.value=v || '';}); renderCard(); }
function renderCard(){ const data=formData(); const map=[['verbatim_complaint','card-quote','尚未填寫'],['observed_problem','card-problem','你的觀察會出現在這裡'],['affected_user','card-user','尚未填寫'],['known_fact','card-fact','尚未填寫'],['unverified_assumption','card-assumption','尚未填寫']]; map.forEach(([key,id,fallback])=>$(id).textContent=data[key]?.trim()||fallback); const done=required.filter(k=>data[k]?.trim()).length; const pct=Math.round(done/required.length*100); $('progress-label').textContent=`完成度 ${pct}%（${done}/${required.length}）`; $('progress-bar').style.width=`${pct}%`; }
async function api(path, options={}){ const { headers: extraHeaders = {}, ...requestOptions } = options; const res=await fetch(`${cfg.supabaseUrl}${path}`, {...requestOptions, headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json',...extraHeaders}}); const body=await res.json().catch(()=>({})); if(!res.ok){const error=new Error(body.error_description||body.msg||body.message||body.error||`請求失敗（HTTP ${res.status}）`);error.status=res.status;throw error;} return body; }
async function studentApi(body){ return api('/functions/v1/Student-api',{method:'POST',body:JSON.stringify(body)}); }
// 老師的回饋放在卡片最上方的固定區塊，不放狀態訊息 ——
// 那個元素在這個檔案裡被十幾個地方覆寫，老師寫的話會被「草稿已同步」蓋掉。
function showTeacherNote(submission){
 const box=$('teacher-note'),body=$('teacher-note-body');
 if(!box||!body)return;
 const note=submission&&typeof submission.teacher_note==='string'?submission.teacher_note.trim():'';
 if(!note){box.hidden=true;return;}
 body.textContent=note;
 box.hidden=false;
 // 讀過的標記只存在本機：學生換裝置會再看到一次，總比看不到好。
 const key=`sjl-note-seen-${studentSession?studentSession.student_id:''}`;
 let seen='';try{seen=localStorage.getItem(key)||'';}catch{}
 box.dataset.state=seen===note?'seen':'new';
 const ack=$('teacher-note-ack');
 if(ack)ack.onclick=()=>{try{localStorage.setItem(key,note);}catch{}box.dataset.state='seen';};
}

function showStudent(){ $('student-gate').hidden=Boolean(studentSession); $('student-workspace').hidden=!studentSession; if(studentSession) $('student-label').textContent=`學號：${studentSession.student_id}`; }
async function restoreStudent(){
  showStudent();
  if(!studentSession){ renderCard(); return; }
  try{
    const loaded=await studentApi({action:'load',token:studentSession.token});
    fill(loaded.submission||{});
    message('form-message',loaded.submission?'已恢復上次儲存的內容。':'尚未儲存草稿。');
    showTeacherNote(loaded.submission);
  }catch(e){
    localStorage.removeItem('sjl-student-session');
    studentSession=null;
    showStudent();
    message('access-message','登入已過期，請重新輸入學號與班級邀請碼。',true);
  }
}

function showMainView(name){
 if(!['home','student','teacher'].includes(name))return;
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{location.hash=btn.dataset.view;showMainView(btn.dataset.view);}));
window.addEventListener('hashchange',()=>showMainView(location.hash.slice(1)));
$('student-enter').onclick=async()=>{ if(!configured()) return message('access-message','尚未設定 Supabase 連線資訊。請先完成設定。',true); try{message('access-message','正在確認班級…'); studentSession=await studentApi({action:'login',student_id:$('access-student-id').value,invite_code:$('access-code').value}); localStorage.setItem('sjl-student-session',JSON.stringify(studentSession)); showStudent(); const loaded=await studentApi({action:'load',token:studentSession.token}); fill(loaded.submission||{}); message('form-message','已進入起點卡，可先儲存草稿。');}catch(e){message('access-message',e.message,true);}};
$('student-exit').onclick=()=>{localStorage.removeItem('sjl-student-session');studentSession=null;showStudent();};
$('week1-form').addEventListener('input',renderCard);
async function save(status, button, labels={}){
  const data=formData();
  const missing=required.filter(k=>!data[k]?.trim());
  if(status==='submitted'&&missing.length){
    message('form-message',`尚未完成：${missing.map(k=>({student_name:'姓名',team_preference:'分組角色',verbatim_complaint:'原句或抱怨',observed_context:'當時的現場',observed_problem:'生活不便',affected_user:'受到影響的人',known_fact:'事實',unverified_assumption:'假設',interview_next_question:'下週訪談問題',expected_learning:'期待',concern:'擔心'})[k]).join('、')}`,true);
    finishAction(button,'請補齊欄位',true);
    return false;
  }
  startAction(button,labels.busy || (status==='submitted'?'提交中…':'儲存中…'));
  try{
    const result=await studentApi({action:'save',token:studentSession.token,submission:{...data,status}});
    savedStatus=result.submission.status || status;
    $('updated-at').textContent=`最後更新：${new Date(result.submission.updated_at).toLocaleString('zh-TW')}`;
    message('form-message',labels.message || (status==='submitted'?'已正式提交，老師現在可以查看。':'草稿已儲存。'));
    finishAction(button,labels.done || (status==='submitted'?'已提交 ✓':'已儲存 ✓'));
    return true;
  }catch(e){
    message('form-message',e.message,true);
    finishAction(button,'請重試',true);
    return false;
  }
}
$('save-draft').onclick=()=>save('draft',$('save-draft'));
$('week1-form').onsubmit=(e)=>{e.preventDefault();save('submitted',e.submitter||$('week1-form').querySelector('[type="submit"]'));};
$('clear-form').onclick=async()=>{
  const button=$('clear-form');
  if(savedStatus==='submitted'){
    message('form-message','這份起點卡已正式提交，為保留提交紀錄，無法從學生端清除。若需修改，可直接編輯後重新提交，原版本會保留。',true);
    finishAction(button,'無法清除',true);
    return;
  }
  if(confirm('確定清除目前草稿？清除後重新整理也不會恢復。')){
    $('week1-form').reset();
    renderCard();
    await save('draft',button,{busy:'清除中…',done:'已清除 ✓',message:'草稿內容已清除。'});
  }
};
$('export-text').onclick=()=>{
  const button=$('export-text');
  startAction(button,'準備下載…');
  const d=formData(), text=['Startup Journey Lab｜Week 1 個人起點卡',`姓名：${d.student_name}`,`學號：${d.student_id}`,`角色：${d.team_preference}`,'',`原句或抱怨：${d.verbatim_complaint}`,`當時的現場：${d.observed_context}`,`生活不便：${d.observed_problem}`,`受到影響的人：${d.affected_user}`,`事實：${d.known_fact}`,`假設：${d.unverified_assumption}`,`下週訪談問題：${d.interview_next_question}`,`期待：${d.expected_learning}`,`擔心：${d.concern}`,`可匿名分享：${d.consent_to_share_in_class?'同意':'不同意'}`].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  a.download=`Week1-${d.student_id||'起點卡'}.txt`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
  message('form-message','文字檔已下載；仍請依老師指定方式提交。');
  finishAction(button,'已下載 ✓');
};
function storeTeacherSession(session){
  teacherSession=session;
  teacherToken=session?.access_token||'';
  if(session){
    localStorage.setItem('sjl-teacher-session',JSON.stringify(session));
    localStorage.setItem('sjl-teacher-token',teacherToken);
  }else{
    localStorage.removeItem('sjl-teacher-session');
    localStorage.removeItem('sjl-teacher-token');
  }
}
let teacherRefreshPromise=null;
async function refreshTeacherSession(){
 if(teacherRefreshPromise)return teacherRefreshPromise;
 if(!teacherSession?.refresh_token)return false;
 teacherRefreshPromise=(async()=>{
  try{const fresh=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:teacherSession.refresh_token})});storeTeacherSession(fresh);return true;}
  catch(e){if(e.status===400||e.status===401){storeTeacherSession(null);return false;}throw e;}
  finally{teacherRefreshPromise=null;}
 })();return teacherRefreshPromise;
}
window.addEventListener('storage',e=>{if(e.key==='sjl-teacher-session'){try{teacherSession=JSON.parse(e.newValue||'null');teacherToken=teacherSession?.access_token||'';}catch{} }});
async function loadTeacher(canRefresh=true){
  if(!teacherToken)return;
  try{
    const rows=await api('/rest/v1/week1_submissions?select=*&order=updated_at.desc',{headers:{Authorization:`Bearer ${teacherToken}`}});
    teacherRows=rows;renderTeacher();message('teacher-message','');$('teacher-gate').hidden=true;$('teacher-dashboard').hidden=false;
  }catch(e){
    if(canRefresh&&(e.status===401||/jwt|token|expired/i.test(e.message))){try{if(await refreshTeacherSession())return loadTeacher(false);}catch{message('teacher-message','目前網路無法更新登入，請稍後按教師頁重新載入；登入資料已保留。',true);return;}}
    if(e.status===401||/jwt|token|expired/i.test(e.message))storeTeacherSession(null);
    $('teacher-gate').hidden=false;$('teacher-dashboard').hidden=true;
    message('teacher-message',e.status===401||/jwt|token|expired/i.test(e.message)?'教師登入已過期，請重新登入一次。之後系統會自動續期。':`載入教師資料失敗：${e.message}`,true);
  }
}
$('teacher-login').onclick=async()=>{if(!configured())return message('teacher-message','尚未設定 Supabase 連線資訊。',true);try{const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('teacher-email').value,password:$('teacher-password').value})});storeTeacherSession(r);await loadTeacher();}catch(e){message('teacher-message',e.message,true);}};
$('teacher-logout').onclick=()=>{storeTeacherSession(null);$('teacher-gate').hidden=false;$('teacher-dashboard').hidden=true;};
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderTeacher(){const q=$('student-search').value.toLowerCase(),f=$('status-filter').value;// needs_follow_up 永遠是 false（沒有任何程式寫入過）。teacher-note.js 會用
// 分數與是否已收過回饋算出真正需要老師看的名單，掛在 window.__sjlNeedsAttention。
const attention=window.__sjlNeedsAttention instanceof Set?window.__sjlNeedsAttention:null;
const needsAttention=r=>attention?attention.has(r.student_id):r.needs_follow_up;
const rows=teacherRows.filter(r=>`${escapeHTML(r.student_name)} ${escapeHTML(r.student_id)}`.toLowerCase().includes(q)&&(f==='all'||(f==='follow'?needsAttention(r):r.status===f)));$('metrics').innerHTML=[['總人數',teacherRows.length],['已提交',teacherRows.filter(r=>r.status==='submitted').length],['草稿',teacherRows.filter(r=>r.status==='draft').length],['需要你看',teacherRows.filter(needsAttention).length]].map(([a,b])=>`<div><strong>${b}</strong><span>${a}</span></div>`).join('');$('submission-list').innerHTML=rows.map(r=>`<article data-class-id="${escapeHTML(r.class_id)}"><h3>${escapeHTML(r.student_name||'未填姓名')} <small>${escapeHTML(r.student_id)}</small></h3><p><b>${r.status==='submitted'?'已提交':'草稿'}</b>　${escapeHTML(r.observed_problem||'尚未填寫問題')}</p><p>原句：${escapeHTML(r.verbatim_complaint||'—')}<br>現場：${escapeHTML(r.observed_context||'—')}<br>下週問題：${escapeHTML(r.interview_next_question||'—')}</p><p>事實：${escapeHTML(r.known_fact||'—')}<br>假設：${escapeHTML(r.unverified_assumption||'—')}</p></article>`).join('')||'<p>沒有符合條件的學生。</p>';}
$('student-search').oninput=renderTeacher;$('status-filter').onchange=renderTeacher;
$('export-csv').onclick=()=>{const keys=['student_name','student_id','status','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern','updated_at'];const csv=[keys,...teacherRows.map(r=>keys.map(k=>`"${String(r[k]||'').replaceAll('"','""')}"`))].map(x=>x.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='week1-submissions.csv';a.click();};
restoreStudent();loadTeacher();

const resetLink = document.createElement('button');
resetLink.type = 'button'; resetLink.className = 'quiet'; resetLink.textContent = '忘記密碼？寄送重設連結';
$('teacher-gate').append(resetLink);
resetLink.onclick = async () => {
  const email = $('teacher-email').value.trim();
  if (!email) return message('teacher-message', '請先輸入教師 Email。', true);
  try {
    await api('/auth/v1/recover', { method: 'POST', body: JSON.stringify({ email, redirect_to: 'https://hpyuan1220.github.io/startup-journey-lab-app/' }) });
    message('teacher-message', '若此 Email 已註冊，重設連結已寄出。請到信箱開啟。');
  } catch (e) { message('teacher-message', e.message, true); }
};

const recovery = new URLSearchParams(location.hash.slice(1));
const recoveryToken = recovery.get('access_token');
if (recoveryToken && recovery.get('type') === 'recovery') {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); $('teacher').classList.add('active');
  $('teacher-gate').hidden = true;
  const panel = document.createElement('section'); panel.className = 'gate';
  panel.innerHTML = '<h2>設定新的教師密碼</h2><label>新密碼<input id="new-teacher-password" type="password" minlength="8" autocomplete="new-password"></label><button id="save-new-password" class="primary">儲存新密碼</button><p id="recovery-message" role="status"></p>';
  $('teacher').append(panel);
  $('save-new-password').onclick = async () => {
    const password = $('new-teacher-password').value;
    if (password.length < 8) return message('recovery-message', '密碼至少需要 8 個字元。', true);
    try {
      await api('/auth/v1/user', { method: 'PUT', headers: { Authorization: `Bearer ${recoveryToken}` }, body: JSON.stringify({ password }) });
      history.replaceState(null, '', location.pathname); message('recovery-message', '新密碼已儲存，現在可用它登入教師洞察。');
    } catch (e) { message('recovery-message', e.message, true); }
  };
}

showMainView(location.hash.slice(1));

// teacher-note.js 算完「需要你看」的名單後重畫統計與清單。
document.addEventListener('sjl-attention-ready',()=>{if(teacherRows.length)renderTeacher();});
