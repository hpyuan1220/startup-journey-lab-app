import {emptyRecord,normalizeRecord,checkRecord,week3Completion,interviewFields,fitsOptions,judgmentOptions,doneCount,INTERVIEW_COUNT} from './week3-core.mjs?v=20261012';
import {selectedIndex} from './week2-core.mjs?v=20260930-lean';
// Week 3 訪談準備單與紀錄卡
// 上半：準備單（從 Week 2 的卡帶過來：暫定痛點、受訪者、兩題問題），可以列印或存成 PDF 帶去訪談。
// 下半：三次訪談的紀錄＋訪談後的判斷。沒有 AI、沒有一次一題；三次可以分三天填，每次都能存。
const root=document.querySelector('#week-three');
if(root&&new URLSearchParams(location.search).get('week')==='3'){
root.hidden=!['#card','#week-three'].includes(location.hash);
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
let record=emptyRecord(),row=null,week2=null,dirty=false,saving=false,formBuilt=false;
const el=(tag,text,parent=root)=>{const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;};
const msg=el('p','正在載入你的訪談卡…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok){const e=Error(b.error||`連線失敗 ${r.status}`);e.status=r.status;e.body=b;throw e;}return b;}

// ---- 準備單 ----
const sheet=el('section');sheet.id='week3-sheet';sheet.className='video-learning-card';
const meter=el('section');meter.className='video-learning-card quality-box';meter.id='week3-quality';meter.hidden=true;
const form=el('form');form.hidden=true;form.className='week3-form';
const actions=el('div','',form);actions.className='workspace-actions';

function renderSheet(){
 sheet.replaceChildren();
 el('h2','訪談準備單',sheet);
 if(!week2){el('p','還沒有 Week 2 痛點卡，準備單帶不出來。先回去填 Week 2（草稿也可以），再回來這裡。',sheet);const a=el('a','去填 Week 2 痛點卡 →',sheet);a.href='week.html?week=2#card';a.className='primary-link';return;}
 const c=week2.card,i=selectedIndex(c),cand=c.candidates?.[i]||c.candidates?.[0]||{};
 el('p','帶著這一張去問。只問上一次發生什麼、後來怎麼辦；不介紹產品、不替對方決定答案。',sheet).className='week3-sheet-lead';
 const dl=el('dl','',sheet);dl.className='week3-sheet-grid';
 const item=(k,v)=>{el('dt',k,dl);el('dd',v||'（Week 2 還沒填）',dl);};
 item('我在了解的事',[cand.people,cand.context].filter(Boolean).join(' · ')+(cand.problem?`：${cand.problem}`:''));
 item('痛點陳述（暫定）',c.statement);
 (c.interviewees||[]).forEach((p,n)=>item(`受訪者 ${n+1}`,p));
 (c.questions||[]).forEach((q,n)=>item(`問題 ${n+1}`,q));
 item('每次都要追問','上次是什麼時候？後來呢？多花了多少？現在怎麼處理、為什麼？');
 item('要帶回來的三樣東西','上一次發生的事（時間、地點、經過）· 代價 · 目前的替代做法');
 if(week2.teacher_note){const t=el('p',`老師的指路：${week2.teacher_note}`,sheet);t.className='week3-teacher';}
 // 列印時才出現的手寫欄
 const printArea=el('div','',sheet);printArea.className='week3-print-only';
 for(let n=1;n<=INTERVIEW_COUNT;n++){el('h3',`訪談 ${n}　受訪者代稱／身分：＿＿＿＿＿＿＿　時間地點：＿＿＿＿＿＿＿`,printArea);for(const [k,label] of interviewFields.slice(2)){el('p',`${label}：`,printArea);el('div','',printArea).className='week3-lines';}}
 const bar=el('div','',sheet);bar.className='workspace-actions week3-sheet-actions';
 const print=el('button','下載／列印準備單（PDF）',bar);print.type='button';print.className='primary-action';
 print.onclick=()=>{document.body.classList.add('print-sheet');const done=()=>{document.body.classList.remove('print-sheet');window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);window.print();setTimeout(done,3000);};
 el('p','手機：按下去選「列印」→ 用兩指放大預覽 → 分享 → 儲存 PDF。電腦：目的地選「儲存為 PDF」。',bar).className='week3-hint';
}

// ---- 三階燈 ----
function refreshMeter(){
 meter.hidden=!week2;if(!week2)return;meter.replaceChildren();
 const c=week3Completion(record,row);
 const track=el('ol','',meter);track.className='quality-track';
 c.labels.forEach((t,i)=>{const li=el('li',t,track);li.dataset.state=i<=c.level&&(i>0||c.level>0)?'done':i===c.level+1?'next':'';if(i===0&&c.level===0)li.dataset.state='next';});
 el('p',`已記錄 ${c.done} / ${INTERVIEW_COUNT} 次訪談${row?` · 版本 ${row.version}${row.status==='submitted'?' · 已提交':' · 草稿'}`:''}`,meter).className='quality-why';
 if(c.next)el('p',c.next,meter).className='quality-next';
 if(row?.teacher_note){el('p',`老師：${row.teacher_note}`,meter).className='quality-teacher';}
 const unsent=dirty?el('p','有還沒存的修改。',meter):null;if(unsent)unsent.className='quality-why';
}

// ---- 紀錄卡 ----
const inputs={};
function field(parent,key,label,placeholder,multiline=true){
 const wrap=el('label','',parent);wrap.className='week3-question';el('span',label,wrap);
 const input=multiline?el('textarea','',wrap):el('input','',wrap);input.placeholder=placeholder||'';input.name=key;
 input.addEventListener('input',()=>{dirty=true;collect();refreshMeter();});
 inputs[key]=input;return input;
}
function radios(parent,key,label,options){
 const fs=el('fieldset','',parent);fs.className='week3-question week3-radios';el('legend',label,fs);
 inputs[key]=[];
 for(const [v,t] of options){const l=el('label','',fs);const r=el('input','',l);r.type='radio';r.name=key;r.value=v;l.append(document.createTextNode(' '+t));r.addEventListener('change',()=>{dirty=true;collect();refreshMeter();});inputs[key].push(r);}
}
function buildForm(){
 el('h2','訪談紀錄卡',form);
 el('p','受訪者只用代稱（例：便利商店夜班工讀生 A）。原話欄只寫對方說的話，照抄用詞；你的想法寫在「意外發現」或下面的判斷。三次可以分三天填，每次都能存草稿。',form);
 for(let n=0;n<INTERVIEW_COUNT;n++){
  const box=el('section','',form);box.className='week3-interview';box.dataset.index=n;
  el('h3',`訪談 ${n+1}`,box);
  for(const [k,label,ph] of interviewFields)field(box,`i${n}_${k}`,label,ph,k!=='who'&&k!=='when_where');
  radios(box,`i${n}_fits`,'這次訪談後，我的痛點成立嗎？',fitsOptions);
 }
 const after=el('section','',form);after.className='week3-interview week3-after';
 el('h3','三次都記完之後',after);
 radios(after,'judgment','我的判斷',judgmentOptions);
 field(after,'learned','這三次訪談讓我對痛點的理解改變了什麼？（選填）','例：原本以為是排隊太久，其實是怕想吃的賣完');
 field(after,'statement','修正後的痛點陳述：用受訪者的用詞重寫一次','在＿＿情境中，＿＿的人想要＿＿，但因為＿＿而＿＿，目前用＿＿處理。');
 form.append(actions);
 const save=el('button','儲存草稿',actions);save.type='button';save.onclick=()=>persist('draft',save);
 const submit=el('button','正式提交',actions);submit.type='button';submit.className='primary-action';submit.onclick=()=>persist('submitted',submit);
 form.addEventListener('submit',e=>e.preventDefault());
}
function collect(){
 const r=emptyRecord();
 r.interviews.forEach((it,n)=>{for(const [k] of interviewFields)it[k]=inputs[`i${n}_${k}`].value;it.fits=inputs[`i${n}_fits`].find(x=>x.checked)?.value||'';});
 r.judgment=inputs.judgment.find(x=>x.checked)?.value||'';r.learned=inputs.learned.value;r.statement=inputs.statement.value;
 record=normalizeRecord(r);return record;
}
function fill(){
 record.interviews.forEach((it,n)=>{for(const [k] of interviewFields)inputs[`i${n}_${k}`].value=it[k];inputs[`i${n}_fits`].forEach(x=>x.checked=x.value===it.fits);});
 inputs.judgment.forEach(x=>x.checked=x.value===record.judgment);inputs.learned.value=record.learned;inputs.statement.value=record.statement;
}
async function persist(status,button){
 if(saving)return;saving=true;button.disabled=true;
 try{
  collect();
  if(status==='submitted'){const c=checkRecord(record);if(!c.ok){msg.textContent='還不能提交：'+c.errors[0]+(c.errors.length>1?`（還有 ${c.errors.length-1} 項）`:'');msg.scrollIntoView({block:'nearest'});return;}}
  msg.textContent=status==='submitted'?'正在提交…':'正在儲存…';
  const r=await api({action:'week3_save',status,version:row?.version??null,record});
  row=r.row;record=normalizeRecord(row.record);dirty=false;
  const warn=(r.checks?.warnings||[]).slice(0,2).join('；');
  msg.textContent=(status==='submitted'?'已正式提交，老師看得到了。之後還可以回來補原話。':`草稿已儲存（已記錄 ${doneCount(record)} / ${INTERVIEW_COUNT} 次）。`)+(warn?' 提醒：'+warn:'');
  refreshMeter();
 }catch(e){
  if(e.status===409&&/重新載入|另一個視窗/.test(e.message)){msg.textContent=e.message+' 你剛打的內容還在畫面上，重新整理前請先複製。';}
  else msg.textContent=e.message;
 }finally{saving=false;button.disabled=false;}
}

async function load(){
 if(!session?.token){msg.textContent='';sheet.replaceChildren();el('h2','先進入你的班級',sheet);el('p','用學號和班級邀請碼進入後，Week 3 的準備單會自動從你的 Week 2 痛點卡帶出來。',sheet);const a=el('a','前往學生入口 →',sheet);a.href='index.html#student';a.className='primary-link';return;}
 try{
  const r=await api({action:'week3_load'});week2=r.week2;row=r.row;
  record=normalizeRecord(row?.record||emptyRecord());
  if(!row&&week2?.card?.statement&&!record.statement)record.statement=week2.card.statement;
  renderSheet();
  if(week2){if(!formBuilt){buildForm();formBuilt=true;}fill();form.hidden=false;}
  refreshMeter();
  msg.textContent=week2?(row?`已載入你的訪談卡（版本 ${row.version}）。`:'準備單已帶出來。訪談完一位就回來記一筆。'):'';
 }catch(e){msg.textContent=e.status===401?'登入已過期，請回學生入口重新進入。':e.message;}
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',()=>{root.hidden=!['#card','#week-three'].includes(location.hash);});
load();
}
