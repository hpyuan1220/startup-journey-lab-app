import {emptyCard,fields,challengeFields,normalize,check,readiness,aiInput,privacyRisk} from './week2-core.mjs';
const root=document.querySelector('#week-two');
if(root&&new URLSearchParams(location.search).get('week')==='2'){
root.hidden=false;
let card=emptyCard(),version=null,row=null,step=0,dirty=false,session,week1Identity=[],editGeneration=0,saving=false;
try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
const el=(tag,text,parent=root)=>{const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;};
const msg=el('p','正在載入你的學習卡…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
const workspace=el('section');workspace.hidden=true;
const prior=el('details','',workspace);el('summary','我的 Week 1 起點與修改紀錄',prior);const priorBody=el('div','',prior);
const actions=el('div','',workspace);actions.className='actions';
const form=el('form','',workspace);form.noValidate=true;
const report=el('section','',workspace);report.setAttribute('aria-live','polite');
const feedback=el('section','',workspace);feedback.className='video-learning-card';
const historyBox=el('details','',workspace);el('summary','歷次保存與提交',historyBox);const historyList=el('div','',historyBox);
const cacheKey=()=>`sjl-week2-${session?.class_id}-${session?.student_id}`;
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`連線失敗 ${r.status}`);return b;}
function button(label,fn,parent=actions){const b=el('button',label,parent);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){msg.textContent=e.message;}finally{b.disabled=false;}};return b;}
function confirmAnonymous(content){return new Promise(resolve=>{
 const panel=el('section');panel.className='video-learning-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','確認交給 AI 的內容');
 el('h3','確認交給 AI 的匿名內容',panel);el('p','以下文字將傳送至 OpenAI API 取得建議。若仍有可識別個資，請取消並修改。',panel);const preview=JSON.parse(content);
 const names=Object.fromEntries([...fields,...challengeFields]);Object.assign(names,{candidates:'候選痛點',selected:'暫定選題（從 1 起算）',reason:'選擇理由',reconsider:'重新選題的條件',statement:'痛點描述',questions:'訪談問題',challenge:'進階挑戰'});
 const translated=value=>Array.isArray(value)?value.map(translated):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[names[key]||key,key==='selected'?Number(v)+1:translated(v)])):value;
 el('pre',JSON.stringify(translated(preview),null,2),panel);
 const end=value=>{panel.remove();resolve(value);};button('確認內容，取得 AI 建議',()=>end(true),panel);button('取消，回去修改',()=>end(false),panel);
 root.insertBefore(panel,workspace);panel.querySelector('button').focus();panel.scrollIntoView({block:'center'});
});}
function localSave(){editGeneration++;dirty=true;try{localStorage.setItem(cacheKey(),JSON.stringify({card,version,savedAt:new Date().toISOString()}));msg.textContent='已暫存在此裝置；請按儲存草稿同步雲端。';}catch{msg.textContent='此裝置無法暫存，請立即儲存草稿或下載備份。';}}
function input(label,value,set,parent,placeholder=''){
 const wrap=el('label',label,parent);wrap.className='week2-question';const t=el('textarea','',wrap);t.value=value||'';t.maxLength=label.startsWith('受訪者 ')?200:label.startsWith('訪談問題 ')?300:label==='內容來源與 AI 使用說明'?60:600;t.placeholder=placeholder;t.oninput=()=>{set(t.value);localSave();};return t;
}
function render(){
 form.replaceChildren();
 const label=el('label','今天需要哪一種協助？',form),mode=el('select','',label);
 for(const [v,t]of [['guided','一步一步引導'],['standard','檢查我的想法'],['challenge','進階挑戰']]){const o=el('option',t,mode);o.value=v;}
 mode.value=card.mode;mode.onchange=()=>{card.mode=mode.value;localSave();render();};
 el('p','三種路徑都完成兩個候選痛點、三位受訪者與兩題訪談問題。切換路徑不會清除內容。',form);
 card.candidates.forEach((c,i)=>{
  const box=el('details','',form);box.className='candidate';box.open=card.mode==='guided'||i===card.selected;el('summary',`候選痛點 ${i+1}${i===card.selected?'（暫定選題）':''}`,box);
  if(card.mode==='guided'){
   const q=el('label','先從生活場景選擇（可自行填寫）',box),s=el('select','',q);for(const text of ['請選擇','吃飯','通勤','上課','租屋','打工','分組','行政流程']){el('option',text,s);}s.onchange=()=>{if(s.selectedIndex){c.context=s.value;localSave();render();}};
  }
  fields.forEach(([k,t])=>input(t,c[k],v=>c[k]=v,box,k==='evidence'?'請寫真實事件、時間與觀察來源；不寫真實姓名':k==='frequency'||k==='cost'?'不確定可寫「待驗證」及如何確認':''));
  button('選這一題作為訪談方向',()=>{card.selected=i;localSave();render();},box);
 });
 if(card.candidates.length<3)button('增加第三個候選題（選填）',()=>{card.candidates.push(Object.fromEntries(fields.map(([k])=>[k,''])));localSave();render();},form);
 input('為什麼先選這一題？其他題目為什麼暫緩？',card.reason,v=>card.reason=v,form);
 input('什麼證據會讓我改變選擇？',card.reconsider,v=>card.reconsider=v,form);
 input('修訂後的痛點陳述',card.statement,v=>card.statement=v,form,'在＿＿情境中，＿＿的人想要＿＿，但遇到＿＿，目前用＿＿處理；仍需驗證＿＿。');
 el('h3','三位可接觸的受訪者',form);el('p','使用角色代稱，例如「通勤同學 A，課後詢問」。不要寫姓名、電話或 Email。',form);
 card.interviewees.forEach((v,i)=>input(`受訪者 ${i+1}：角色與接觸方式`,v,x=>card.interviewees[i]=x,form));
 card.questions.forEach((v,i)=>input(`訪談問題 ${i+1}`,v,x=>card.questions[i]=x,form,'請問上一次發生時，你如何處理？'));
 if(card.mode==='challenge'){el('h3','進階挑戰',form);challengeFields.forEach(([k,t])=>input(t,card.challenge[k],v=>card.challenge[k]=v,form));}
 input('內容來源與 AI 使用說明',card.source,v=>card.source=v,form,'我的觀察／他人原話／資料來源／AI 探索方向（待驗證）');
 input('我如何回應 AI 建議？（未使用 AI 可留白）',card.ai_response,v=>card.ai_response=v,form);
 for(const [k,t]of [['contact_confirmed','我確認三位受訪者符合暫定對象，而且可以實際接觸。'],['questions_checked','我確認兩題問題詢問過去的真實經驗，不暗示答案或推銷產品。']]){const l=el('label','',form),c=el('input','',l);c.type='checkbox';c.checked=card[k];c.onchange=()=>{card[k]=c.checked;localSave();};l.append(document.createTextNode(t));}
 const note=el('label','',form),cb=el('input','',note);cb.type='checkbox';cb.id='week2-privacy';note.append(document.createTextNode('我已確認將送出的文字不含姓名、學號、聯絡資料或其他可識別個資。AI 建議會由外部模型處理。'));
 if(card.mode==='guided'){
  const questions=[...form.querySelectorAll('.week2-question')];step=Math.max(0,Math.min(step,questions.length-1));questions.forEach((q,i)=>q.hidden=i!==step);
  form.querySelectorAll('.candidate').forEach(box=>box.hidden=![...box.querySelectorAll('.week2-question')].some(q=>!q.hidden));
  const nav=el('div','',form);nav.className='guided-nav';el('p',`一步一步 ${step+1}/${questions.length}：每次先回答一題，隨時可切換「檢查我的想法」看完整卡片。`,nav);
  button('上一題',()=>{step--;render();form.querySelector('.week2-question:not([hidden]) textarea')?.focus();},nav).disabled=step===0;
  button('下一題',()=>{step++;render();form.querySelector('.week2-question:not([hidden]) textarea')?.focus();},nav).disabled=step===questions.length-1;form.insertBefore(nav,form.children[2]);
 }
 form.onsubmit=e=>{e.preventDefault();};
}
function checks(){report.replaceChildren();const c=check(normalize(card));el('h3',c.ok?'必要內容已填齊':'請補充以下內容',report);for(const t of [...c.errors,...c.warnings])el('p',t,report);return c;}
function showFeedback(fb,cached=false){feedback.replaceChildren();el('h3',cached?'已保存的 AI 建議':'AI 學習建議',feedback);el('p',({ready:'內容完整，可準備訪談',revise:'請修訂後再次檢查',help:'建議尋求教師協助'})[fb.status],feedback);el('p',fb.strength,feedback);for(const [key,title]of [['directions','探索方向（待驗證）'],['gaps','建議補充'],['assumptions','仍是推測'],['questions','可以追問']]){if(fb[key]?.length){el('h4',title,feedback);const ul=el('ul','',feedback);fb[key].forEach(t=>el('li',t,ul));}}el('p',`最小行動：${fb.next_action}`,feedback);el('p','AI 建議不是使用者證據，也不是成績。請自行確認、補充觀察，不可直接當成事實。',feedback);}
async function save(status,snapshot=normalize(card)){
 if(saving)throw Error('正在保存，請等完成再操作。');
 if(status==='submitted'&&!checks().ok){msg.textContent='尚未通過必要欄位檢查，仍可儲存草稿。';return;}
 const generation=editGeneration;saving=true;msg.textContent='正在同步…';
 try{const r=await api({action:'save',card:snapshot,version,status});row=r.row;version=row.version;
 if(generation===editGeneration){dirty=false;localStorage.removeItem(cacheKey());msg.textContent=`${status==='submitted'?'已提交':'草稿已同步'} · 版本 ${version} · ${readiness(row)}`;}
 else{msg.textContent=`版本 ${version} 已同步；剛才新增的文字仍在本機，請再儲存。`;}
 }finally{saving=false;}
}
button('檢查完整度',checks);button('儲存草稿',()=>save('draft'));button('正式提交',()=>save('submitted'));
button('下載目前內容',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeffWeek 2 問題探索與選題\n更新時間：'+new Date().toLocaleString('zh-TW')+'\n'+JSON.stringify(card,null,2)],{type:'text/plain;charset=utf-8'}));a.download='Week2-痛點卡.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
for(const [kind,title]of [['explore','我卡住了，給我探索方向'],['review','檢查我的痛點']])button(title,async()=>{
 const requestCard=normalize(card),anonymous=aiInput(requestCard,kind,week1Identity);if(privacyRisk(anonymous))throw Error('文字可能含個資，請改成角色代稱後再請 AI 協助。');
 if(!document.querySelector('#week2-privacy').checked)throw Error('請先在表單下方確認文字不含個資。');
 if(kind==='review'&&!checks().ok)return;
 if(!await confirmAnonymous(anonymous)){msg.textContent='已取消傳送，內容保持不變。';return;}
 await save('draft',requestCard);msg.textContent='正在取得 AI 建議…';
 const r=await api({action:'ai',kind,card:requestCard,privacy_confirmed:true});showFeedback(r.feedback,r.cached);msg.textContent='AI 建議已顯示，請依真實觀察修訂；仍可直接保存或提交。';

});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{
 if(!session){msg.textContent='請先到學生起點卡輸入學號與班級邀請碼，再回來此頁。';const a=el('a','進入 Week 1 起點卡');a.href='index.html#student';return;}
 try{
 const data=await api({action:'load'});
 if(data.week1?.status!=='submitted'){msg.textContent='你尚未提交 Week 1。請先完成起點卡，提交後即可回來使用 Week 2。';const a=el('a','補交 Week 1');a.href='index.html#student';return;}
 week1Identity=[session.student_id,data.week1.student_name];
 row=data.row;version=row?.version??null;card=row?.card||emptyCard();
 if(!row){card.candidates[0].people=data.week1.affected_user||'';card.candidates[0].context=data.week1.observed_context||'';card.candidates[0].problem=data.week1.observed_problem||'';card.candidates[0].evidence=data.week1.known_fact||'';card.candidates[0].assumption=data.week1.unverified_assumption||'';}
 if(data.week1_feedback?.feedback_json)el('p','Week 1 AI 回饋：'+(data.week1_feedback.feedback_json.overall_feedback||'請返回 Week 1 查看'),priorBody);
 for(const [k,t]of [['observed_problem','問題'],['known_fact','事實'],['unverified_assumption','假設']])el('p',`${t}：${data.week1[k]||'尚未填寫'}`,priorBody);
 const a=el('a','修改 Week 1（保留原版本）',priorBody);a.href='index.html#student';
 for(const v of data.versions||[]){const d=el('details','',historyList);el('summary',`Week ${v.week} · 版本 ${v.version} · ${new Date(v.created_at).toLocaleString('zh-TW')}`,d);el('pre',JSON.stringify(v.snapshot,null,2),d);}
 workspace.hidden=false;render();msg.textContent=row?`已恢復版本 ${version} · ${readiness(row)}${row.teacher_note?' · 老師：'+row.teacher_note:''}`:'已帶入 Week 1 觀察，請補充第二個候選題。';
 let local;try{local=JSON.parse(localStorage.getItem(cacheKey())||'null');}catch{}
 if(local)button('恢復此裝置尚未同步的草稿',()=>{card=normalize(local.card);dirty=true;render();msg.textContent='已恢復本機草稿，請確認後儲存到雲端。';});
 const fb=data.feedback?.find(x=>x.state==='complete');if(fb){showFeedback(fb.feedback,true);if(fb.submission_version!==version)el('p','此建議來自較早版本，請依目前內容重新判讀。',feedback);}
 }catch(e){msg.textContent=`${e.message} 你仍可閱讀本週藍圖與下載教材。`;}
})();
}
