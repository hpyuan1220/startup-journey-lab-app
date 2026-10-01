const cfg = window.STARTUP_JOURNEY_CONFIG || {};
const required = ['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const $ = (id) => document.getElementById(id);
let studentSession = JSON.parse(localStorage.getItem('sjl-student-session') || 'null');
// 教師登入狀態存在 sessionStorage 而不是 localStorage：關掉分頁或瀏覽器就失效。
// 原本存 localStorage 而且帶 refresh_token 會自動續期，等於永久有效 ——
// 老師在教室電腦登入後沒登出，下一個開網頁的人就看得到全班名單與學號。
const teacherStore = {
  get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* 無痕模式等情況略過 */ } },
  remove(key) {
    try { sessionStorage.removeItem(key); } catch {}
    // 清掉舊版留在 localStorage 的殘留，否則升級前登入過的瀏覽器仍然帶著權杖。
    try { localStorage.removeItem(key); } catch {}
  },
};
// 升級後第一次載入：把舊版殘留的 localStorage 權杖清掉，不沿用。
try { localStorage.removeItem('sjl-teacher-session'); localStorage.removeItem('sjl-teacher-token'); } catch {}
let teacherSession = JSON.parse(teacherStore.get('sjl-teacher-session') || 'null');
let teacherToken = teacherSession?.access_token || teacherStore.get('sjl-teacher-token') || '';
let teacherRows = [];
let savedStatus = '';
// 記住雲端那一份的內容與版本。Week 1 原本沒有任何重複提交的處理：
// 學生回來按「正式提交」就直接再送一次，訊息還和第一次一模一樣，
// 他不知道這是第幾版、也不知道內容到底有沒有變。
let savedSnapshot = null, savedVersion = 0, savedSubmittedAt = '';
const SUBMIT_FIELDS = ['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern','consent_to_share_in_class'];
function snapshotOf(data){ return JSON.stringify(SUBMIT_FIELDS.map(k=>k==='consent_to_share_in_class'?Boolean(data[k]):String(data[k]||'').trim())); }

function configured(){ return cfg.supabaseUrl && !cfg.supabaseUrl.includes('YOUR_') && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.includes('YOUR_'); }
function message(id, text, bad=false){ const el=$(id); el.textContent=text; el.classList.toggle('error',bad); }
// 按鈕的原始文字只能記錄一次，而且要在任何改字之前。
function rememberLabel(button){
  if(button && !button.dataset.defaultLabel) button.dataset.defaultLabel=button.textContent;
}
function startAction(button, label){
  if(!button) return;
  rememberLabel(button);
  button.classList.remove('action-success','action-failed');
  button.textContent=label;
  button.disabled=true;
}
function finishAction(button, label, failed=false){
  if(!button) return;
  // 有三條路徑（缺欄位、內容未變更、已提交無法清除）不經過 startAction 就走到這裡。
  // 先記下原始文字，否則還原時只能 fallback 到當下的錯誤標籤。
  rememberLabel(button);
  button.disabled=false;
  button.textContent=label;
  button.classList.toggle('action-success',!failed);
  button.classList.toggle('action-failed',failed);
  clearTimeout(button._labelTimer);
  button._labelTimer=setTimeout(()=>{
    if(button.dataset.defaultLabel) button.textContent=button.dataset.defaultLabel;
    button.classList.remove('action-success','action-failed');
  },2200);
}
function formData(){ const data=Object.fromEntries(new FormData($('week1-form')).entries()); data.consent_to_share_in_class=$('week1-form').consent_to_share_in_class.checked; data.student_id=studentSession?.student_id || ''; return data; }
function fill(data={}){ savedStatus=data.status || '';
 savedSnapshot=data.status?snapshotOf(data):null;
 savedVersion=Number(data.version)||0;
 savedSubmittedAt=data.submitted_at||''; Object.entries(data).forEach(([k,v])=>{const el=$('week1-form').elements[k]; if(el) el.type==='checkbox' ? el.checked=Boolean(v) : el.value=v || '';}); renderCard(); renderSubmittedState(); }
// 回來時就講清楚自己在什麼狀態，不用靠按按鈕試探。
function submittedSummary(){
 if(savedStatus!=='submitted')return '';
 const when=savedSubmittedAt?new Date(savedSubmittedAt).toLocaleDateString('zh-TW',{month:'long',day:'numeric'}):'';
 return `${when?`已於 ${when} 提交`:'已提交'}${savedVersion>1?`（第 ${savedVersion} 版）`:''}。`;
}
function renderSubmittedState(){
 const box=$('submitted-state');
 const submitted=savedStatus==='submitted';
 // 提交之後，「儲存草稿」與「清除內容」只會造成傷害：
 // 儲存草稿會把狀態退回草稿，清除內容接著就能把答案清空。
 // 提交後只留一條路：改完再按「正式提交」，這也是提交狀態那一行寫的話。
 const draftBtn=$('save-draft'),clearBtn=$('clear-form');
 if(draftBtn)draftBtn.hidden=submitted;
 if(clearBtn)clearBtn.hidden=submitted;
 if(!box)return;
 if(!submitted){box.hidden=true;return;}
 box.hidden=false;
 $('submitted-state-text').textContent=`${submittedSummary()}可以直接修改後重新提交，先前版本會保留。`;
}

function renderCard(){ const data=formData(); const map=[['verbatim_complaint','card-quote','尚未填寫'],['observed_problem','card-problem','你的觀察會出現在這裡'],['affected_user','card-user','尚未填寫'],['known_fact','card-fact','尚未填寫'],['unverified_assumption','card-assumption','尚未填寫']]; map.forEach(([key,id,fallback])=>$(id).textContent=data[key]?.trim()||fallback); const done=required.filter(k=>data[k]?.trim()).length; const pct=Math.round(done/required.length*100); $('progress-label').textContent=`完成度 ${pct}%（${done}/${required.length}）`; $('progress-bar').style.width=`${pct}%`; }
async function api(path, options={}){ const { headers: extraHeaders = {}, ...requestOptions } = options; const res=await fetch(`${cfg.supabaseUrl}${path}`, {...requestOptions, headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json',...extraHeaders}}); const body=await res.json().catch(()=>({})); if(!res.ok){const error=new Error(body.error_description||body.msg||body.message||body.error||`請求失敗（HTTP ${res.status}）`);error.status=res.status;error.body=body;throw error;} return body; }
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

function teacherViewActive(){const v=$('teacher');return !!v&&v.classList.contains('active');}
// 切走教師頁時，.view 只是 display:none —— 全班姓名與學號仍在 DOM 裡，
// 學生按一下「教師洞察」就看得到。離開就清空，回來再重畫。
function clearTeacherData(){
 const dash=$('teacher-dashboard');if(dash)dash.hidden=true;
 const list=$('submission-list');if(list)list.innerHTML='';
 const metrics=$('metrics');if(metrics)metrics.innerHTML='';
}
function showMainView(name){
 if(!['home','student','teacher'].includes(name))return;
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===name));
 if(name!=='teacher'){clearTeacherData();if(teacherToken)touchTeacherActivity(TEACHER_AWAY_MINUTES);return;}
 if(teacherToken){$('teacher-gate').hidden=true;$('teacher-dashboard').hidden=false;renderTeacher();touchTeacherActivity();}
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{location.hash=btn.dataset.view;showMainView(btn.dataset.view);}));
window.addEventListener('hashchange',()=>showMainView(location.hash.slice(1)));
$('student-enter').onclick=()=>enterStudent(false);
$('student-exit').onclick=()=>{localStorage.removeItem('sjl-student-session');studentSession=null;showStudent();};
// Week 1 沒有自動存檔。學生等 AI 等太久而重新整理，新打的內容會被上次存的草稿蓋掉。
// 至少讓瀏覽器先問一句。（Week 2 本來就有這個保護。）
window.addEventListener('beforeunload',(e)=>{
  if(!studentSession)return;
  const gate=$('student-gate');
  if(gate&&!gate.hidden)return;
  if(savedSnapshot===snapshotOf(formData()))return;
  e.preventDefault();e.returnValue='';
});
// 本班沒有這個學號時，不要默默開一張新卡 —— 先讓學生確認一次。
// 打錯字的人在這裡被接住；真的第一次進入的人按「是」就進去，不會被擋。
function askFirstTime(typedId){
  const box=$('access-message');
  box.textContent='';
  box.classList.add('message');
  const p=document.createElement('p');
  p.textContent=`本班沒有「${typedId}」的作答紀錄。如果你之前填過，很可能是學號打錯了。`;
  box.appendChild(p);
  const row=document.createElement('div');row.className='actions';box.appendChild(row);
  const back=document.createElement('button');back.type='button';back.textContent='我要改學號';
  back.onclick=()=>{box.textContent='';const el=$('access-student-id');el.focus();el.select();};
  const go=document.createElement('button');go.type='button';go.className='primary';go.textContent='是，我第一次進入';
  go.onclick=()=>enterStudent(true);
  row.appendChild(back);row.appendChild(go);
  back.focus();
}
async function enterStudent(confirmNew){
  if(!configured()) return message('access-message','尚未設定 Supabase 連線資訊。請先完成設定。',true);
  try{
    message('access-message','正在確認班級…');
    studentSession=await studentApi({action:'login',student_id:$('access-student-id').value,invite_code:$('access-code').value,...(confirmNew?{confirm_new:true}:{})});
    localStorage.setItem('sjl-student-session',JSON.stringify(studentSession));
    showStudent();
    const loaded=await studentApi({action:'load',token:studentSession.token});
    fill(loaded.submission||{});
    message('form-message','已進入起點卡，可先儲存草稿。');
  }catch(e){
    if(e.status===409&&e.body&&e.body.unknown_student){askFirstTime(e.body.student_id||$('access-student-id').value);return;}
    message('access-message',e.message,true);
  }
}
$('week1-form').addEventListener('input',renderCard);
async function save(status, button, labels={}){
  const data=formData();
  const missing=required.filter(k=>!data[k]?.trim());
  if(status==='submitted'&&missing.length){
    message('form-message',`尚未完成：${missing.map(k=>({student_name:'姓名',team_preference:'分組角色',verbatim_complaint:'原句或抱怨',observed_context:'當時的現場',observed_problem:'生活不便',affected_user:'受到影響的人',known_fact:'事實',unverified_assumption:'假設',interview_next_question:'下週訪談問題',expected_learning:'期待',concern:'擔心'})[k]).join('、')}`,true);
    finishAction(button,'請補齊欄位',true);
    return false;
  }
  // 內容和已提交的版本一模一樣就不要再送一次 —— 學生不確定有沒有成功會多按幾次，
  // 每一次都會在 learning_versions 留下一個內容相同的版本。
  if(status==='submitted'&&savedStatus==='submitted'&&savedSnapshot&&snapshotOf(data)===savedSnapshot){
    message('form-message',`內容和上次提交的完全相同，不需要重送。${submittedSummary()}`);
    finishAction(button,'內容未變更');
    return true;
  }
  startAction(button,labels.busy || (status==='submitted'?'提交中…':'儲存中…'));
  try{
    const result=await studentApi({action:'save',token:studentSession.token,submission:{...data,status}});
    savedStatus=result.submission.status || status;
    savedSnapshot=snapshotOf(result.submission);
    savedVersion=Number(result.submission.version)||savedVersion+1;
    savedSubmittedAt=result.submission.submitted_at||savedSubmittedAt;
    renderSubmittedState();
    $('updated-at').textContent=`最後更新：${new Date(result.submission.updated_at).toLocaleString('zh-TW')}`;
    const submittedMessage = savedVersion>1
      ? `已更新提交，這是第 ${savedVersion} 版。老師會看到最新版本，先前版本也保留著。`
      : '已正式提交，老師現在可以查看。';
    message('form-message',labels.message || (status==='submitted'?submittedMessage:'草稿已儲存。'));
    finishAction(button,labels.done || (status==='submitted'?'已提交 ✓':'已儲存 ✓'));
    // 成功訊息在表單最上方，距離提交鈕約 3000px（手機 3.6 個螢幕），
    // 而按鈕只閃 2.2 秒就恢復原狀 —— 學生看不到任何提交成功的痕跡，會再按一次。
    if(status==='submitted')showConfirmation();
    return true;
  }catch(e){
    message('form-message',e.message,true);
    finishAction(button,'請重試',true);
    // 失敗更要看得到：原本錯誤訊息同樣寫在 3000px 之外，
    // 按鈕閃 2.2 秒就恢復，學生會以為交出去了。
    showConfirmation();
    return false;
  }
}
// 把提交結果捲到學生眼前。提交成功時優先顯示「已於 X 提交」那一塊。
function showConfirmation(){
  const box=$('submitted-state'),msg=$('form-message');
  const target=(box&&!box.hidden)?box:msg;
  if(!target)return;
  try{target.scrollIntoView({block:'center'});target.tabIndex=-1;target.focus({preventScroll:true});}catch{}
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
// 閒置逾時：老師離開電腦但沒登出時的第二道防線。
// 只要有點擊、按鍵或捲動就重新計時，所以改作業中途不會被踢出去。
const TEACHER_IDLE_MINUTES = 30;
// 離開教師頁之後，沒有任何操作會重設計時器（學生在學生頁的動作不算）。
// 那段期間的暴露時間不需要是 30 分鐘 —— 老師多半是切走就不回來了。
const TEACHER_AWAY_MINUTES = 5;
let teacherIdleTimer = null;
let teacherIdleMinutes = TEACHER_IDLE_MINUTES;
function touchTeacherActivity(minutes=TEACHER_IDLE_MINUTES){
 if(teacherIdleTimer)clearTimeout(teacherIdleTimer);
 if(!teacherToken)return;
 teacherIdleMinutes=minutes;
 teacherIdleTimer=setTimeout(()=>{
  if(!teacherToken)return;
  storeTeacherSession(null);
  teacherRows=[];
  const gate=$('teacher-gate');
  if(gate)gate.hidden=false;
  clearTeacherData();
  message('teacher-message',`閒置超過 ${teacherIdleMinutes} 分鐘，已自動登出。這是為了避免在共用電腦上留下班級資料。`);
 },minutes*60*1000);
}
// 活動監聽原本是全域的：學生在同一個分頁填卡，每次打字都會重設老師的閒置計時器，
// 30 分鐘的保護等於永遠不會觸發。只有教師頁上的操作才算老師還在。
for(const evt of ['click','keydown','scroll','pointerdown']){
 window.addEventListener(evt,()=>{if(teacherToken&&teacherViewActive())touchTeacherActivity();},{passive:true});
}

function storeTeacherSession(session){
  teacherSession=session;
  teacherToken=session?.access_token||'';
  if(session){
    teacherStore.set('sjl-teacher-session',JSON.stringify(session));
    teacherStore.set('sjl-teacher-token',teacherToken);
    touchTeacherActivity();
  }else{
    teacherStore.remove('sjl-teacher-session');
    teacherStore.remove('sjl-teacher-token');
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
// 教師登入已改存 sessionStorage，分頁之間本來就不共用，storage 事件不再適用；
// 保留對學生端沒有影響，移除以免誤以為還會跨分頁同步。
async function loadTeacher(canRefresh=true){
  if(!teacherToken)return;
  try{
    const rows=await api('/rest/v1/week1_submissions?select=*&order=updated_at.desc',{headers:{Authorization:`Bearer ${teacherToken}`}});
    teacherRows=rows;markTeacherSignedIn();message('teacher-message','');$('teacher-gate').hidden=true;
    // 載入完成時人可能已經切到學生頁 —— 那就先不要把名單畫進 DOM。
    if(teacherViewActive()){$('teacher-dashboard').hidden=false;renderTeacher();touchTeacherActivity();}
    else clearTeacherData();
  }catch(e){
    if(canRefresh&&(e.status===401||/jwt|token|expired/i.test(e.message))){try{if(await refreshTeacherSession())return loadTeacher(false);}catch{message('teacher-message','目前網路無法更新登入，請稍後按教師頁重新載入；登入資料已保留。',true);return;}}
    if(e.status===401||/jwt|token|expired/i.test(e.message))storeTeacherSession(null);
    $('teacher-gate').hidden=false;$('teacher-dashboard').hidden=true;
    message('teacher-message',e.status===401||/jwt|token|expired/i.test(e.message)?'教師登入已過期，請重新登入一次。之後系統會自動續期。':`載入教師資料失敗：${e.message}`,true);
  }
}
$('teacher-login').onclick=async()=>{if(!configured())return message('teacher-message','尚未設定 Supabase 連線資訊。',true);try{const r=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('teacher-email').value,password:$('teacher-password').value})});storeTeacherSession(r);await loadTeacher();}catch(e){message('teacher-message',e.message,true);}};
$('teacher-logout').onclick=()=>{storeTeacherSession(null);teacherRows=[];$('teacher-gate').hidden=false;clearTeacherData();message('teacher-message','已登出。');};
// 提醒自己「現在是登入狀態」—— 不是安全機制，但成本極低，而且共用電腦上
// 下一個人至少看得到這裡有人登入著。
function markTeacherSignedIn(){
 const label=$('teacher-name');
 if(label)label.textContent=`目前以教師身分登入中 · 閒置 ${TEACHER_IDLE_MINUTES} 分鐘會自動登出`;
}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderTeacher(){
 // teacher-note.js 的 sjl-attention-ready 事件也會呼叫這裡。
 // 人不在教師頁時重畫，等於又把全班資料塞回 DOM。
 if(!teacherViewActive()){clearTeacherData();return;}
 const q=$('student-search').value.toLowerCase(),f=$('status-filter').value;// needs_follow_up 永遠是 false（沒有任何程式寫入過）。teacher-note.js 會用
// 分數與是否已收過回饋算出真正需要老師看的名單，掛在 window.__sjlNeedsAttention。
const attention=window.__sjlNeedsAttention instanceof Set?window.__sjlNeedsAttention:null;
// 鑰匙必須和 teacher-note.js 的 publishAttention() 一致（class_id + ':' + student_id）。
// 只比學號的話，兩班同學號會互相影響統計與篩選。
const needsAttention=r=>attention?attention.has(String(r.class_id)+':'+String(r.student_id)):r.needs_follow_up;
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
