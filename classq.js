import {CLASSQ_WEEKS,emptyClassQ,normalizeClassQ,labelText,classDate,CLASS_SCHEDULE,WRITE_OPEN_LABEL,CLASS_Q_AI_LIMIT} from './week4-core.mjs?v=20261105-cq';
import {buildPrompt5} from './week5-core.mjs?v=20261104-rb';
import {showRelogin} from './relogin.mjs?v=20261105-cq';
// 只有課堂兩題的週（Week 6 起）：一頁只有兩題＋AI 評語。跟 Week 4／5 的課堂兩題同一套規則：
// 上課日 13:00–17:00 內兩題都存檔＝這一週出席；之後還能答，但標「課後」。資料存在 week_class_answers（一人一週一列）。
const root=document.querySelector('[data-classq]');
const week=Number(root?.dataset.classq);
if(root&&CLASSQ_WEEKS.includes(week)&&new URLSearchParams(location.search).get('week')===String(week)){
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
let data=emptyClassQ(),row=null,questions=null,dirty=false,saving=false,timer=null,expired=false,locked=false;
const el=(tag,text,parent=root,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const msg=el('p','正在載入課堂兩題…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');msg.className='w4-msg';
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,week,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok){const e=Error(b.error||`連線失敗 ${r.status}`);e.status=r.status;e.body=b;if(r.status===401)onExpired();throw e;}return b;}
function onExpired(){if(expired)return;expired=true;showRelogin(root,'week'+week,msg);msg.textContent=dirty?'你剛打的內容還沒存進雲端：重新進入前請先複製起來。':'';}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true;}catch{const ta=document.createElement('textarea');ta.value=t;document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;}}
// 狀態訊息也顯示在按鈕旁邊：頁面頂端那行在手機上看不到。
function near(btn,text){let p=btn.parentElement.querySelector(':scope > .w4-near');if(!p){p=document.createElement('p');p.className='w4-hint w4-near';p.setAttribute('role','status');btn.parentElement.append(p);}p.textContent=text;}

const page=el('div','',root,'w4 cq');
const head=el('div','',page,'w4-head');
el('p',`WEEK ${week} · 課堂兩題`,head,'eyebrow');
el('h1','今天的課堂兩題',head);
const rule=el('p','',head,'w4-rule');
const quiz=el('section','',page,'w4-quiz');
const quizHead=el('div','',quiz,'w4-quiz-head');el('h2','課堂兩題',quizHead);const quizWhen=el('span','',quizHead,'w4-quiz-when');
el('p',`上課時段內兩題都存檔＝Week ${week} 出席；之後還是可以答，但標「課後」、不算出席。答完可以按「讓 AI 評我的答案」，評語直接出現在答案下面（選填、不計分、每題 ${CLASS_Q_AI_LIMIT} 次）。`,quiz,'w4-hint');
const qBlocks={};
for(const k of ['q1','q2']){
 const b=el('div','',quiz,'w4-q');const title=el('p','',b,'w4-q-title');
 const ta=el('textarea','',b);ta.rows=3;ta.maxLength=600;ta.placeholder='寫一到兩句';ta.setAttribute('aria-label',k==='q1'?'第一題答案':'第二題答案');
 const row2=el('div','',b,'w4-row');const btn=el('button','讓 AI 評我的答案',row2,'button-link w4-small');btn.type='button';
 const own=el('button','自己用 Gemini 問',row2,'button-link w4-small w4-own');own.type='button';
 const ai=el('textarea','',b,'w4-ai');ai.rows=2;ai.maxLength=400;ai.placeholder='按「讓 AI 評我的答案」，評語會出現在這裡（不計分）';ai.setAttribute('aria-label',k==='q1'?'第一題 AI 評語':'第二題 AI 評語');
 const stamp=el('div','',b,'w4-stamp');
 own.addEventListener('click',async()=>{
  if(!ta.value.trim()){near(own,'先在上面的框寫下你的答案，再按「自己用 Gemini 問」。');ta.focus();return;}
  const prompt=buildPrompt5(k,snapshot(),questions);const cp=copyText(prompt);
  window.open('https://gemini.google.com/app','_blank','noopener');
  const ok=await cp;near(own,ok?'已開 Gemini。Gemini 打開會是空的，這是正常的：問題已經複製好了，到輸入框按 ⌘V（Windows：Ctrl+V）再送出。':'已開 Gemini；複製失敗，請自己把題目和答案貼過去。');
 });
 btn.addEventListener('click',async()=>{
  if(!ta.value.trim()){near(btn,'先寫下你的答案，再讓 AI 評。');ta.focus();return;}
  if(locked||btn.disabled)return;
  btn.disabled=true;const label=btn.textContent;btn.textContent='AI 看你的答案中…';near(btn,'先幫你存答案，再請 AI 看（約 5–15 秒）。');
  try{
   for(let i=0;i<20&&saving;i++)await new Promise(r=>setTimeout(r,150));
   if(dirty||!row){clearTimeout(timer);await save(true);}
   if(dirty||!row)throw Error('答案還沒存好，請再按一次。');
   let r;try{r=await api({action:'class_q_ai',q:k});}catch(e){if(e.status===409&&e.body?.retry)r=await api({action:'class_q_ai',q:k});else throw e;}
   row=r.row;data=normalizeClassQ(row.data);ai.value=r.feedback;renderStamps();
   near(btn,`AI 評語放在下面那格了（不計分；這題還能再問 ${Math.max(0,r.limit-r.used)} 次）。`);
  }catch(e){if(e.status!==401)near(btn,e.message||'AI 暫時沒有回應，請再按一次。');}
  finally{btn.disabled=false;btn.textContent=label;}
 });
 qBlocks[k]={title,ta,ai,stamp};
}
const foot=el('div','',page,'w4-foot');
const saveBtn=el('button','存',foot,'primary w4-save');saveBtn.type='button';
el('p','打字會自動存（停下來約 2 秒）；離開前也會自動存。',foot,'w4-hint');
const prog=el('p','',foot,'w4-prog');

function snapshot(){return normalizeClassQ({q1:qBlocks.q1.ta.value,q2:qBlocks.q2.ta.value,q1_ai:qBlocks.q1.ai.value,q2_ai:qBlocks.q2.ai.value});}
function touch(){dirty=true;saveBtn.textContent='存';clearTimeout(timer);timer=setTimeout(()=>save(true),1800);}
Object.values(qBlocks).forEach(b=>[b.ta,b.ai].forEach(x=>x.addEventListener('input',touch)));
saveBtn.addEventListener('click',()=>save(false));
const fmt=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}（${labelText(iso)}）`;};
function renderStamps(){const st=row?.stamps||{};for(const k of ['q1','q2'])qBlocks[k].stamp.textContent=st[k]?'已存 '+fmt(st[k]):'未存';prog.textContent=`兩題 ${['q1','q2'].filter(k=>st[k]).length}/2 已存`;}
function applyLock(r){locked=r.write_open===false;if(!locked)return;
 const note=document.createElement('p');note.className='w4-msg w4-lock';note.setAttribute('role','status');note.textContent=`${WRITE_OPEN_LABEL} 開放作答：現在可以先看題目，還不能填、不能存。`;page.before(note);
 page.querySelectorAll('textarea,button').forEach(x=>{x.disabled=true;});queueMicrotask(()=>{msg.textContent='';});}
async function save(auto){
 if(saving||expired||locked||!session?.token)return;
 const snap=snapshot();saving=true;if(!auto)saveBtn.textContent='存檔中…';
 try{
  const r=await api({action:'classq_save',version:row?.version??null,data:snap});
  row=r.row;data=normalizeClassQ(row.data);dirty=false;saveBtn.textContent='已存';renderStamps();
  if(!auto)msg.textContent=`已存（版本 ${row.version}）。`;
 }catch(e){if(e.status!==401)msg.textContent=e.message;saveBtn.textContent='存';}
 finally{saving=false;}
}
async function load(){
 const date=classDate(week);rule.textContent=`上課日 ${date?date.slice(5).replace('-','/'):''} ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內兩題都存檔＝Week ${week} 出席。`;
 quizWhen.textContent=`上課日 ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內答完＝出席`;
 if(!session?.token){msg.textContent='';page.hidden=true;el('h2','先進入你的班級',root);el('p','用學號和班級邀請碼進入後，就可以答課堂兩題。',root);const a=el('a','前往學生入口 →',root,'primary-link');a.href=`index.html?return=week${week}#student`;return;}
 try{
  const r=await api({action:'classq_load'});
  row=r.row;questions=r.questions;data=normalizeClassQ(row?.data||emptyClassQ());
  qBlocks.q1.title.textContent='Q1 '+(questions?.q1||'');qBlocks.q2.title.textContent='Q2 '+(questions?.q2||'');
  for(const k of ['q1','q2']){qBlocks[k].ta.value=data[k];qBlocks[k].ai.value=data[k+'_ai'];}
  renderStamps();applyLock(r);msg.textContent='';
 }catch(e){if(e.status!==401)msg.textContent=e.message;}
}
window.addEventListener('beforeunload',()=>{if(dirty&&!saving)save(true);});
load();
}
