const cfg = window.STARTUP_JOURNEY_CONFIG || {};
const required = ['student_name','team_preference','observed_problem','affected_user','known_fact','unverified_assumption','expected_learning','concern'];
const $ = (id) => document.getElementById(id);
let studentSession = JSON.parse(localStorage.getItem('sjl-student-session') || 'null');
let teacherToken = localStorage.getItem('sjl-teacher-token') || '';
let teacherRows = [];

function configured(){ return cfg.supabaseUrl && !cfg.supabaseUrl.includes('YOUR_') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('YOUR_'); }
function message(id, text, bad=false){ const el=$(id); el.textContent=text; el.classList.toggle('error',bad); }
function formData(){ const data=Object.fromEntries(new FormData($('week1-form')).entries()); data.consent_to_share_in_class=$('week1-form').consent_to_share_in_class.checked; data.student_id=studentSession?.student_id || ''; return data; }
function fill(data={}){ Object.entries(data).forEach(([k,v])=>{const el=$('week1-form').elements[k]; if(el) el.type==='checkbox' ? el.checked=Boolean(v) : el.value=v || '';}); renderCard(); }
function renderCard(){ const data=formData(); const map=[['observed_problem','card-problem','你的觀察會出現在這裡'],['affected_user','card-user','尚未填寫'],['known_fact','card-fact','尚未填寫'],['unverified_assumption','card-assumption','尚未填寫']]; map.forEach(([key,id,fallback])=>$(id).textContent=data[key]?.trim()||fallback); const done=required.filter(k=>data[k]?.trim()).length; const pct=Math.round(done/required.length*100); $('progress-label').textContent=`完成度 ${pct}%（${done}/${required.length}）`; $('progress-bar').style.width=`${pct}%`; }
async function api(path, options={}){ const { headers: extraHeaders = {}, ...requestOptions } = options; const res=await fetch(`${cfg.supabaseUrl}${path}`, {...requestOptions, headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json',...extraHeaders}}); const body=await res.json().catch(()=>({})); if(!res.ok) throw new Error(body.error_description||body.msg||body.message||body.error||`請求失敗（HTTP ${res.status}）`); return body; }
async function studentApi(body){ return api('/functions/v1/Student-api',{method:'POST',body:JSON.stringify(body)}); }
function showStudent(){ $('student-gate').hidden=Boolean(studentSession); $('student-workspace').hidden=!studentSession; if(studentSession) $('student-label').textContent=`學號：${studentSession.student_id}`; }

document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); $(btn.dataset.view).classList.add('active');}));
$('student-enter').onclick=async()=>{ if(!configured()) return message('access-message','尚未設定 Supabase 連線資訊。請先完成設定。',true); try{message('access-message','正在確認班級…'); studentSession=await studentApi({action:'login',student_id:$('access-student-id').value,invite_code:$('access-code').value}); localStorage.setItem('sjl-student-session',JSON.stringify(studentSession)); showStudent(); const loaded=await studentApi({action:'load',token:studentSession.token}); fill(loaded.submission||{}); message('form-message','已進入起點卡，可先儲存草稿。');}catch(e){message('access-message',e.message,true);}};
$('student-exit').onclick=()=>{localStorage.removeItem('sjl-student-session');studentSession=null;showStudent();};
$('week1-form').addEventListener('input',renderCard);
async function save(status){ const data=formData(); const missing=required.filter(k=>!data[k]?.trim()); if(status==='submitted'&&missing.length){message('form-message',`尚未完成：${missing.map(k=>({student_name:'姓名',team_preference:'分組角色',observed_problem:'生活不便',affected_user:'受到影響的人',known_fact:'事實',unverified_assumption:'假設',expected_learning:'期待',concern:'擔心'})[k]).join('、')}`,true);return;} try{const result=await studentApi({action:'save',token:studentSession.token,submission:{...data,status}}); $('updated-at').textContent=`最後更新：${new Date(result.submission.updated_at).toLocaleString('zh-TW')}`;message('form-message',status==='submitted'?'已正式提交，老師現在可以查看。':'草稿已儲存。');}catch(e){message('form-message',e.message,true);}}
$('save-draft').onclick=()=>save('draft'); $('week1-form').onsubmit=(e)=>{e.preventDefault();save('submitted');};
$('clear-form').onclick=()=>{if(confirm('確定清除所有尚未送出的內容？')){$('week1-form').reset();renderCard();message('form-message','內容已清除；尚未刪除雲端草稿。');}};
$('export-text').onclick=()=>{const d=formData(), text=['Startup Journey Lab｜Week 1 個人起點卡',`姓名：${d.student_name}`,`學號：${d.student_id}`,`角色：${d.team_preference}`,'',`生活不便：${d.observed_problem}`,`受到影響的人：${d.affected_user}`,`事實：${d.known_fact}`,`假設：${d.unverified_assumption}`,`期待：${d.expected_learning}`,`擔心：${d.concern}`,`可匿名分享：${d.consent_to_share_in_class?'同意':'不同意'}`].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));a.download=`Week1-${d.student_id||'起點卡'}.txt`;a.click();URL.revokeObjectURL(a.href);};
async function loadTeacher(){if(!teacherToken)return; try{const rows=await api('/rest/v1/week1_submissions?select=*&order=updated_at.desc',{headers:{Authorization:`Bearer ${teacherToken}`}});teacherRows=rows;renderTeacher();message('teacher-message','');$('teacher-gate').hidden=true;$('teacher-dashboard').hidden=false;}catch(e){$('teacher-gate').hidden=false;$('teacher-dashboard').hidden=true;message('teacher-message',`載入教師資料失敗：${e.message}`,true);}}
$('teacher-login').onclick=async()=>{if(!configured())return message('teacher-message','尚未設定 Supabase 連線資訊。',true);try{const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('teacher-email').value,password:$('teacher-password').value})});teacherToken=r.access_token;localStorage.setItem('sjl-teacher-token',teacherToken);await loadTeacher();}catch(e){message('teacher-message',e.message,true);}};
$('teacher-logout').onclick=()=>{teacherToken='';localStorage.removeItem('sjl-teacher-token');$('teacher-gate').hidden=false;$('teacher-dashboard').hidden=true;};
function renderTeacher(){const q=$('student-search').value.toLowerCase(),f=$('status-filter').value;const rows=teacherRows.filter(r=>`${r.student_name} ${r.student_id}`.toLowerCase().includes(q)&&(f==='all'||(f==='follow'?r.needs_follow_up:r.status===f)));$('metrics').innerHTML=[['總人數',teacherRows.length],['已提交',teacherRows.filter(r=>r.status==='submitted').length],['草稿',teacherRows.filter(r=>r.status==='draft').length],['需追問',teacherRows.filter(r=>r.needs_follow_up).length]].map(([a,b])=>`<div><strong>${b}</strong><span>${a}</span></div>`).join('');$('submission-list').innerHTML=rows.map(r=>`<article><h3>${r.student_name||'未填姓名'} <small>${r.student_id}</small></h3><p><b>${r.status==='submitted'?'已提交':'草稿'}</b>　${r.observed_problem||'尚未填寫問題'}</p><p>事實：${r.known_fact||'—'}<br>假設：${r.unverified_assumption||'—'}</p></article>`).join('')||'<p>沒有符合條件的學生。</p>';}
$('student-search').oninput=renderTeacher;$('status-filter').onchange=renderTeacher;
$('export-csv').onclick=()=>{const keys=['student_name','student_id','status','observed_problem','affected_user','known_fact','unverified_assumption','expected_learning','concern','updated_at'];const csv=[keys,...teacherRows.map(r=>keys.map(k=>`"${String(r[k]||'').replaceAll('"','""')}"`))].map(x=>x.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='week1-submissions.csv';a.click();};
showStudent();renderCard();loadTeacher();

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
