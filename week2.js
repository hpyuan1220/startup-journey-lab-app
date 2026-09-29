import {revisionFields,draftRevision,applyRevision} from './week2-revision.mjs';
import {emptyCard,fields,challengeFields,sourceOptions,normalize,check,readiness,aiInput,privacyRisk} from './week2-core.mjs?v=20260929-sources';
const root=document.querySelector('#week-two');
if(root&&new URLSearchParams(location.search).get('week')==='2'){
root.hidden=!['#card','#week-two'].includes(location.hash);
let card=emptyCard(),version=null,row=null,step=0,dirty=false,session,week1Identity=[],editGeneration=0,saving=false;
try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
const el=(tag,text,parent=root)=>{const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;};
const msg=el('p','正在載入你的學習卡…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
const workspace=el('section');workspace.hidden=true;
const intro=el('section','',workspace);intro.className='video-learning-card';root.insertBefore(intro,workspace);
el('h3','先理解：這張卡要做什麼？',intro);
el('p','本週先比較兩個你親身觀察到的不同困擾，再暫選一個，下週找真人訪談。現在不用想產品，也不用證明創業會成功。',intro);
const explanation=el('ol','',intro);for(const text of ['痛點 1：延續 Week 1 的觀察，補充還不清楚的地方。','痛點 2：再找另一個不同困擾；可以是同一場景，但阻礙要不同。','比較選題：從兩個困擾選一個，說明理由。兩個不是都要做成產品。','準備訪談：為選中的一題，找三位可接觸的人、準備兩個問題。'])el('li',text,explanation);
el('p','「候選痛點」就是尚未決定要深入研究的困擾。例如痛點 1 是午餐排隊等太久；痛點 2 是分組時找不到大家都有空的時間。這只是說明用例子，請填自己的事件。第三個痛點完全選填。',intro);
el('p','填答位置在下方「開始填答」。引導模式一次一題，按「下一題」繼續；也可用步驟按鈕跳到要修改的地方。',intro);
let removedCandidate=null;
const prior=el('details','',workspace);el('summary','我的 Week 1 起點與修改紀錄',prior);const priorBody=el('div','',prior);
const actions=el('div','',workspace);actions.className='actions';
const submitResult=el('section','',workspace);submitResult.hidden=true;submitResult.tabIndex=-1;submitResult.setAttribute('role','status');submitResult.setAttribute('aria-live','polite');submitResult.className='submission-result';
const form=el('form','',workspace);form.noValidate=true;
const liveCheck=el('section','',workspace);liveCheck.setAttribute('aria-live','polite');liveCheck.className='video-learning-card';
const report=el('section','',workspace);report.setAttribute('aria-live','polite');
const aiStep=el('section','',workspace);aiStep.className='video-learning-card';
el('h3','填答後：是否需要 AI 建議？（選用）',aiStep);
el('p','先完成痛點與訪談規劃，再決定是否請 AI 協助。未使用 AI 不需填寫回應，也不影響正式提交。',aiStep);
let autoBusy=false,autoAuthorized=false,lastAutoContent='',lastAutoFeedback=null,rulesTimer;
const autoLabel=el('label','',aiStep),autoToggle=el('input','',autoLabel);autoToggle.type='checkbox';
autoLabel.append(document.createTextNode('儲存草稿後，自動將匿名學習內容送至 OpenAI API 取得建議（可隨時關閉）'));
const autoStatus=el('p','尚未啟用自動 AI；完整度會在填寫後自動檢查。',aiStep);autoStatus.setAttribute('role','status');
const autoKey=()=>`sjl-week2-auto-ai-${session?.class_id}-${session?.student_id}`;
function disableAuto(){autoAuthorized=false;autoToggle.checked=false;try{localStorage.removeItem(autoKey());}catch{}autoStatus.textContent='自動 AI 已關閉，仍可手動取得建議或直接提交。';}
autoToggle.onchange=async()=>{
 if(!autoToggle.checked){disableAuto();return;}
 autoToggle.disabled=true;
 try{
  const content=aiInput(normalize(card),'review',week1Identity);
  if(privacyRisk(content))throw Error('內容可能含個資，請先改成角色代稱再啟用。');
  if(!await confirmAnonymous(content,true)){disableAuto();return;}
  autoAuthorized=true;try{localStorage.setItem(autoKey(),'enabled');}catch{}
  autoStatus.textContent='已啟用：必要欄位填齊後，按儲存草稿會自動取得建議；相同內容沿用結果。';
 }catch(e){disableAuto();autoStatus.textContent=e.message;}finally{autoToggle.disabled=false;}
};
const aiChoices=el('div','',aiStep);aiChoices.className='actions';
const aiControls=el('section','',aiStep);aiControls.hidden=true;aiControls.id='week2-ai-options';
el('h4','下一步：確認匿名內容，再選擇 AI 協助方式',aiControls);
el('p','想檢查已填好的卡片，請按「檢查我的痛點，取得 AI 建議」；還不知道如何開始，請按「我卡住了，給我探索方向」。接著會顯示送出前的內容確認。',aiControls);
const privacyLabel=el('label','',aiControls),privacyCheckbox=el('input','',privacyLabel);privacyCheckbox.type='checkbox';privacyCheckbox.id='week2-privacy';
privacyLabel.append(document.createTextNode('我已確認將送出的文字不含姓名、學號、聯絡資料或其他可識別個資。AI 建議會由 OpenAI API 處理。'));
const feedback=el('section','',aiStep);feedback.hidden=true;
const responseBox=el('section','',aiStep);responseBox.hidden=true;
el('h3','看完建議後：我的判斷',responseBox);
el('p','請說明採用、修改或不採用哪一項建議，以及原因。AI 建議不是事實，仍要用觀察或訪談驗證。',responseBox);
const responseInput=input('我採用／修改／不採用什麼建議？為什麼？', '',v=>card.ai_response=v,responseBox,'例如：我採用先查明原因的建議，暫不決定產品，先訪談最近遇過這件事的人。');
let latestFeedback=null,revisionUndo=null;
const revisionArea=el('section','',responseBox);revisionArea.className='revision-area';
el('h3','把建議改成可編輯草稿',revisionArea);
el('p','選擇欄位後預覽，再確認套用。痛點陳述依目前填答整理；訪談題沿用已取得的 AI 追問，不增加 AI 呼叫，也不新增觀察事實。',revisionArea);
const revisionOptions=el('div','',revisionArea);
const revisionChecks=revisionFields.map(([key,label])=>{const l=el('label','',revisionOptions),c=el('input','',l);c.type='checkbox';c.value=key;l.append(document.createTextNode(label));return c;});
const revisionStatus=el('p','',revisionArea);revisionStatus.setAttribute('role','status');
const revisionPreview=el('section','',revisionArea);revisionPreview.hidden=true;
const revisionAction=fn=>{try{fn();}catch(e){revisionStatus.textContent=e.message;}};
const undoKey=()=>`sjl-week2-revision-${session?.class_id}-${session?.student_id}`;
const undoButton=button('復原上次套用',()=>revisionAction(()=>{
 if(!revisionUndo)throw Error('目前沒有可復原的套用紀錄。');
 card=applyRevision(card,revisionUndo,true);revisionUndo=null;try{localStorage.removeItem(undoKey());}catch{}
 localSave();render();revisionPreview.hidden=true;undoButton.hidden=true;revisionStatus.textContent='已復原上次套用的欄位，請儲存草稿同步雲端。';
}),revisionArea);undoButton.hidden=true;
button('幫我草擬修改',()=>revisionAction(()=>{
 const keys=revisionChecks.filter(c=>c.checked).map(c=>c.value);if(!keys.length)throw Error('請先勾選想修改的欄位。');
 const patches=draftRevision(card,latestFeedback,keys),selectedTopic=card.selected,sourceSnapshot=JSON.stringify(card.candidates[card.selected]);
 revisionPreview.replaceChildren();revisionPreview.hidden=false;revisionStatus.textContent='草稿已準備好；原答案尚未改動。請逐欄檢查並勾選要套用的內容。';
 el('h4','預覽差異：原答案／建議修改',revisionPreview);
 const editors=patches.map(p=>{
 const item=el('section','',revisionPreview);item.className='revision-item';
 const l=el('label','',item),choose=el('input','',l);choose.type='checkbox';choose.checked=true;l.append(document.createTextNode(`套用：${p.label}`));
 el('p',p.source,item);const columns=el('div','',item);columns.className='revision-columns';
 const original=el('section','',columns);el('h4','原答案',original);el('pre',p.before||'（尚未填寫）',original);
 const proposed=el('label',`建議修改：${p.label}`,columns),text=el('textarea','',proposed);text.value=p.after;text.maxLength=p.max;
 el('p',`最多 ${p.max} 字；可先修改草稿，再確認套用。`,proposed);
 return {p,choose,text};
 });
 button('確認套用已勾選欄位',()=>revisionAction(()=>{
 if(card.selected!==selectedTopic||JSON.stringify(card.candidates[card.selected])!==sourceSnapshot)throw Error('暫定選題或原始觀察已改變，請重新草擬，避免套用過時內容。');
 const chosen=editors.filter(e=>e.choose.checked).map(e=>({...e.p,after:e.text.value}));
 const next=applyRevision(card,chosen);card=next;revisionUndo=chosen;let stored=true;try{localStorage.setItem(undoKey(),JSON.stringify(chosen));}catch{stored=false;}
 localSave();render();undoButton.hidden=false;revisionPreview.hidden=true;
 revisionStatus.textContent=`已套用 ${chosen.length} 個欄位；尚未正式提交。請檢查並儲存草稿。${stored?'可用「復原上次套用」回復原答案。':'本機無法保存復原紀錄，僅此頁開啟期間可復原。'}`;
 }),revisionPreview);
 button('取消，保留原答案',()=>{revisionPreview.hidden=true;revisionStatus.textContent='已取消，原答案沒有改動。';},revisionPreview);
 revisionPreview.scrollIntoView({block:'start'});
}),revisionArea);
button('儲存修改後的草稿',()=>saveWithAuto(),revisionArea);
button('檢查修改後的完整度',()=>checks(true),revisionArea);
const previousResponse=el('details','',aiStep);previousResponse.hidden=true;el('summary','查看先前填寫的 AI 回應',previousResponse);const previousResponseText=el('p','',previousResponse);
const openAiButton=button('我要使用 AI：展開選項',()=>{aiControls.hidden=false;openAiButton.textContent='AI 選項已展開，請在下方選擇';openAiButton.setAttribute('aria-expanded','true');aiControls.scrollIntoView({block:'center'});privacyCheckbox.focus({preventScroll:true});},aiChoices);openAiButton.setAttribute('aria-expanded','false');openAiButton.setAttribute('aria-controls','week2-ai-options');
button('暫不使用 AI，繼續提交',()=>{disableAuto();aiControls.hidden=true;openAiButton.textContent='我要使用 AI：展開選項';openAiButton.setAttribute('aria-expanded','false');msg.textContent='可以直接提交，不需要 AI 建議或 AI 回應。既有內容仍保留。';submitButton.focus();submitButton.scrollIntoView({block:'center'});},aiChoices);
const historyBox=el('details','',workspace);el('summary','歷次保存與提交',historyBox);const historyList=el('div','',historyBox);
const cacheKey=()=>`sjl-week2-${session?.class_id}-${session?.student_id}`;
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`連線失敗 ${r.status}`);return b;}
function button(label,fn,parent=actions){const b=el('button',label,parent);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){msg.textContent=e.message;}finally{b.disabled=false;}};return b;}
function confirmAnonymous(content,automatic=false){return new Promise(resolve=>{
 const panel=el('section');panel.className='video-learning-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','確認交給 AI 的內容');
 el('h3','確認交給 AI 的匿名內容',panel);if(automatic)el('p','啟用後，本卡日後儲存完整草稿時會自動傳送更新後的匿名痛點、選題理由與訪談題至 OpenAI API，不會每次再預覽。請勿填入個資，可隨時取消勾選關閉。啟用本身不會呼叫 AI。',panel);el('p','以下文字將傳送至 OpenAI API 取得建議。若仍有可識別個資，請取消並修改。',panel);const preview=JSON.parse(content);
 const names=Object.fromEntries([...fields,...challengeFields]);Object.assign(names,{candidates:'候選痛點',selected:'暫定選題（從 1 起算）',reason:'選擇理由',reconsider:'重新選題的條件',statement:'痛點描述',questions:'訪談問題',challenge:'進階挑戰'});
 const translated=value=>Array.isArray(value)?value.map(translated):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[names[key]||key,key==='selected'?Number(v)+1:translated(v)])):value;
 el('pre',JSON.stringify(translated(preview),null,2),panel);
 const end=value=>{panel.remove();resolve(value);};button(automatic?'同意，啟用儲存後自動 AI':'確認內容，取得 AI 建議',()=>end(true),panel);button('取消，回去修改',()=>end(false),panel);
 root.insertBefore(panel,workspace);panel.querySelector('button').focus();panel.scrollIntoView({block:'center'});
});}
function localSave(){submitResult.hidden=true;clearTimeout(rulesTimer);rulesTimer=setTimeout(updateLiveCheck,450);editGeneration++;dirty=true;try{localStorage.setItem(cacheKey(),JSON.stringify({card,version,savedAt:new Date().toISOString()}));msg.textContent='已暫存在此裝置；請按儲存草稿同步雲端。';}catch{msg.textContent='此裝置無法暫存，請立即儲存草稿或下載備份。';}}
function input(label,value,set,parent,placeholder=''){
 const wrap=el('label',label,parent);wrap.className='week2-question';const t=el('textarea','',wrap);t.value=value||'';t.maxLength=label.startsWith('受訪者 ')?200:label.startsWith('訪談問題 ')?300:label==='內容來源與 AI 使用說明'?60:600;t.placeholder=placeholder;t.oninput=()=>{set(t.value);localSave();};return t;
}
function updateLiveCheck(){
 liveCheck.replaceChildren();
 try{const result=check(normalize(card));el('h3',result.ok?'自動檢查：必要內容已填齊':`自動檢查：還有 ${result.errors.length} 項需確認`,liveCheck);
 el('p','這是完整度檢查，不是 AI 評分；不耗 AI 額度。',liveCheck);
 if(result.errors.length){const list=el('ul','',liveCheck);result.errors.slice(0,3).forEach(t=>el('li',t,list));if(result.errors.length>3)el('p','其餘缺項可按「檢查目前進度」查看。',liveCheck);}
 if(result.warnings.length)el('p',`改善提醒：${result.warnings[0]}`,liveCheck);
 }catch(e){el('p',e.message,liveCheck);}
}
async function saveWithAuto(){
 const snapshot=normalize(card),generation=editGeneration;
 await save('draft',snapshot);
 if(!autoToggle.checked||!autoAuthorized)return;
 if(autoBusy){autoStatus.textContent='已有 AI 請求處理中，草稿已保存，沒有重複送出。';return;}
 if(generation!==editGeneration){autoStatus.textContent='草稿已保存；你又修改了內容，請完成後再儲存，這次不送 AI。';return;}
 if(!check(snapshot).ok){autoStatus.textContent='草稿已保存；必要內容尚未填齊，暫不呼叫 AI。';return;}
 const content=aiInput(snapshot,'review',week1Identity);
 if(privacyRisk(content)){autoStatus.textContent='草稿已保存；內容可能含個資，請改成角色代稱，這次沒有送 AI。';return;}
 if(content===lastAutoContent){if(lastAutoFeedback)showFeedback(lastAutoFeedback,true);autoStatus.textContent='草稿已保存；分析內容未變，沿用已有 AI 建議。';return;}
 autoBusy=true;autoStatus.textContent='草稿已保存，正在取得 AI 建議…';
 try{const r=await api({action:'ai',kind:'review',card:snapshot,privacy_confirmed:true});lastAutoContent=content;lastAutoFeedback=r.feedback;showFeedback(r.feedback,r.cached);autoStatus.textContent=r.cached?'草稿已保存，已取回相同內容的 AI 建議。':'草稿已保存，AI 建議已顯示在下方。';if(generation!==editGeneration)el('p','取得建議期間你又修改了答案；此建議針對先前儲存的內容。',feedback);}
 catch(e){autoStatus.textContent=`草稿已保存；AI 暫時無法提供建議：${e.message}。仍可修改與提交。`;}
 finally{autoBusy=false;}
}
function render(){
 updateLiveCheck();
 form.replaceChildren();report.replaceChildren();responseInput.value=card.ai_response||'';previousResponseText.textContent=card.ai_response||'';previousResponse.hidden=!card.ai_response||!responseBox.hidden;el('h3','開始填答',form);
 const label=el('label','今天需要哪一種協助？',form),mode=el('select','',label);
 for(const [v,t]of [['guided','一步一步引導'],['standard','檢查我的想法'],['challenge','進階挑戰']]){const o=el('option',t,mode);o.value=v;}
 mode.value=card.mode;mode.onchange=()=>{card.mode=mode.value;localSave();render();};
 el('p','三種路徑都完成兩個候選痛點、三位受訪者與兩題訪談問題。切換路徑不會清除內容。',form);
 card.candidates.forEach((c,i)=>{
  const box=el('details','',form);box.className='candidate';box.dataset.stage=String(i);box.open=true;el('summary',`痛點 ${i+1}${i===2?'（選填）':''}：${i===0?'延續 Week 1 的困擾':i===1?'另一個不同困擾':'額外比較的困擾'}`,box);
  el('p',i===0?'已帶入可用的 Week 1 內容；請在下面的文字框確認並補充。':'請在下面的文字框填寫另一個困擾，不是上一題的解決方法。',box);
  if(card.mode==='guided'){
   const q=el('label','先從生活場景選擇（可自行填寫）',box),s=el('select','',q);for(const text of ['請選擇','吃飯','通勤','上課','租屋','打工','分組','行政流程']){el('option',text,s);}s.onchange=()=>{if(s.selectedIndex){const hint=el('p',`你選了「${s.value}」。請在「何時何地發生」補充自己的時間、地點與事件；不會覆蓋原答案。`,box);hint.setAttribute('role','status');}};
  }
  const examples={people:'例如：午休只有 50 分鐘、下午要換教室的同學',context:'例如：週二中午 12 點，在學校餐廳；請填自己的事件',job:'例如：下一堂課開始前，買到並吃完午餐（不是開發 App）',problem:'例如：排隊時間不確定，無法判斷是否來得及吃完',frequency:'不確定可寫：待驗證，訪談最近一週發生幾次',cost:'不確定可寫：待驗證，上次多花多久、放棄了什麼',workaround:'例如：改買麵包、提早出門、群組詢問，或暫時忍耐',evidence:'請寫自己真的看過的事件、時間與來源；例子不能當成證據',assumption:'例如：我猜其他同學也困擾，但尚未問過他們'};
  fields.forEach(([k,t])=>input(t,c[k],v=>c[k]=v,box,examples[k]));
  if(i===2)button('不需要第三題，移除並保留復原',()=>{removedCandidate={candidate:card.candidates[2],selected:card.selected};card.candidates.pop();if(card.selected===2)card.selected=0;step=0;localSave();render();msg.textContent='已移除第三題，可按「復原第三題」找回剛才的內容。請確認暫定選題。';},box);
 });
 if(card.candidates.length<3)button('增加第三個候選題（選填）',()=>{card.candidates.push(Object.fromEntries(fields.map(([k])=>[k,''])));step=18;localSave();render();},form);
 if(removedCandidate&&card.candidates.length===2)button('復原第三題',()=>{card.candidates.push(removedCandidate.candidate);card.selected=removedCandidate.selected;removedCandidate=null;step=18;localSave();render();},form);
 const choice=el('section','',form);choice.dataset.stage='choice';el('h3','比較選題：先選一個要訪談的方向',choice);
 const pickLabel=el('label','我暫時選擇',choice),pick=el('select','',pickLabel);card.candidates.forEach((c,i)=>{const o=el('option',`痛點 ${i+1}：${c.problem||'尚未填寫阻礙'}`,pick);o.value=i;});pick.value=card.selected;pick.onchange=()=>{card.selected=Number(pick.value);localSave();};
 input('為什麼先選這一題？其他題目為什麼暫緩？',card.reason,v=>card.reason=v,choice);
 input('什麼證據會讓我改變選擇？',card.reconsider,v=>card.reconsider=v,choice);
 input('修訂後的痛點陳述',card.statement,v=>card.statement=v,choice,'在＿＿情境中，＿＿的人想要＿＿，但遇到＿＿，目前用＿＿處理；仍需驗證＿＿。');
 const interview=el('section','',form);interview.dataset.stage='interview';el('h3','準備訪談：只針對剛才選中的一題',interview);el('h3','三位可接觸的受訪者',interview);el('p','使用角色代稱，例如「通勤同學 A，課後詢問」。不要寫姓名、電話或 Email。',interview);
 card.interviewees.forEach((v,i)=>input(`受訪者 ${i+1}：角色與接觸方式`,v,x=>card.interviewees[i]=x,interview));
 card.questions.forEach((v,i)=>input(`訪談問題 ${i+1}`,v,x=>card.questions[i]=x,interview,'請問上一次發生時，你如何處理？'));
 if(card.mode==='challenge'){el('h3','進階挑戰',interview);challengeFields.forEach(([k,t])=>input(t,card.challenge[k],v=>card.challenge[k]=v,interview));}
 const sources=el('section','內容從哪裡來？（勾選即可）',interview);sources.className='week2-question';
 el('p','可複選，不用再寫一段說明。尚未觀察也可以如實選擇「目前是假設」。',sources);
 const sourceBoxes=[];
 for(const [key,title]of sourceOptions){const label=el('label','',sources),box=el('input','',label);box.type='checkbox';box.checked=(card.source_types||[]).includes(key);sourceBoxes.push([key,box]);label.append(document.createTextNode(title));box.onchange=()=>{
  if(box.checked){for(const [other,control]of sourceBoxes){if(other!==key&&(key==='hypothesis'||other==='hypothesis'))control.checked=false;}}
  card.source_types=sourceBoxes.filter(([,control])=>control.checked).map(([k])=>k);localSave();
 };}
 const optional=(label,key,placeholder)=>{const l=el('label',label,sources),t=el('textarea','',l);t.maxLength=200;t.placeholder=placeholder;t.value=card[key]||'';t.oninput=()=>{card[key]=t.value;localSave();};};
 optional('資料來源（選填）','source_reference','例如：文章名稱或網址；沒有就留白。');
 optional('其他 AI 工具（選填）','external_ai','只有使用系統以外的 AI 才需補充，例如：ChatGPT 協助整理訪談題；沒有就留白。');
 const aiRecord=el('p',latestFeedback?'系統內 AI：已取得建議（系統自動記錄，不需重填）。':'系統內 AI：目前尚無已載入的建議紀錄，不需自行填寫。',sources);aiRecord.dataset.systemAi='true';
 if(card.source){const previous=el('details','',sources);el('summary','先前填寫的來源說明（已保留）',previous);el('p',card.source,previous);}


 for(const [k,t]of [['contact_confirmed','我確認三位受訪者符合暫定對象，而且可以實際接觸。'],['questions_checked','我確認兩題問題詢問過去的真實經驗，不暗示答案或推銷產品。']]){const l=el('label','',interview),c=el('input','',l);c.type='checkbox';c.checked=card[k];c.onchange=()=>{card[k]=c.checked;localSave();};l.append(document.createTextNode(t));}

 const questions=[...form.querySelectorAll('.week2-question')];
 const jump=index=>{step=index;render();form.querySelector('.week2-question:not([hidden]) input, .week2-question:not([hidden]) textarea')?.focus();};
 if(card.mode==='guided'){
  step=Math.max(0,Math.min(step,questions.length-1));questions.forEach((q,i)=>q.hidden=i!==step);
  const activeStage=questions[step].closest('[data-stage]');
  form.querySelectorAll('[data-stage]').forEach(box=>box.hidden=box!==activeStage);
  const nav=el('nav','',form);nav.className='guided-nav';nav.setAttribute('aria-label','填答步驟');
  const stages=[...card.candidates.map((_,i)=>[String(i),`痛點 ${i+1}${i===2?'（選填）':''}`]),['choice','比較選題'],['interview','準備訪談']];
  for(const [key,title] of stages){const group=form.querySelector(`[data-stage="${key}"]`),index=questions.findIndex(q=>group.contains(q));const b=button(title,()=>jump(index),nav);if(group===activeStage)b.setAttribute('aria-current','step');}
  const inStage=questions.filter(q=>activeStage.contains(q));
  el('p',`目前：${stages.find(([key])=>key===activeStage.dataset.stage)[1]} · 第 ${inStage.indexOf(questions[step])+1}/${inStage.length} 題。${questions[step]===sources?'請在下方勾選來源；補充說明可留白。':'請在下方文字框填答。'}`,nav);
  const choose=el('label','跳到本步驟的問題',nav),select=el('select','',choose);
  inStage.forEach(q=>{const o=el('option',q.childNodes[0].textContent,select);o.value=questions.indexOf(q);});select.value=step;select.onchange=()=>jump(Number(select.value));
  button('上一題',()=>jump(step-1),nav).disabled=step===0;
  button(step===questions.length-1?'完成填答，選擇是否使用 AI':'下一題',()=>{if(step===questions.length-1){aiStep.scrollIntoView({block:'start'});aiChoices.querySelector('button').focus();}else jump(step+1);},nav);
  form.insertBefore(nav,form.querySelector('.candidate'));
 }
 form.onsubmit=e=>{e.preventDefault();};
}
function checks(full=false){
 report.replaceChildren();const c=check(normalize(card));
 const targets=[];
 card.candidates.forEach((candidate,i)=>fields.forEach(([k,label])=>{if(!candidate[k])targets.push({label:`痛點 ${i+1}：${label}`,index:i*fields.length+fields.findIndex(([key])=>key===k)});}));
 const base=card.candidates.length*fields.length;
 [['reason','選題理由'],['reconsider','會改變選擇的證據'],['statement','修訂後的痛點陳述']].forEach(([k,label],i)=>{if(!card[k])targets.push({label,index:base+i});});
 card.interviewees.forEach((v,i)=>{if(!v)targets.push({label:`受訪者 ${i+1} 的角色與接觸方式`,index:base+3+i});});
 card.questions.forEach((v,i)=>{if(!v)targets.push({label:`訪談問題 ${i+1}`,index:base+6+i});});
 const shown=full||card.mode!=='guided'?targets:targets.filter(t=>t.index===step);
 el('h3',c.ok?'必要內容已填齊':full?'提交前：還有哪些內容需要補充？':'目前填答進度',report);
 el('p',`尚有 ${targets.length} 個文字欄位待填。可先保存草稿，不必一次完成。${!full&&card.mode==='guided'?'這裡先顯示目前這一題；完整檢查可按下方按鈕。':''}`,report);
 shown.forEach(t=>button(`前往填寫：${t.label}`,()=>{step=t.index;render();const q=[...form.querySelectorAll('.week2-question')][t.index];const box=q.closest('details');if(box)box.open=true;q.querySelector('textarea').focus();q.scrollIntoView({block:'center'});},report));
 if(!full&&card.mode==='guided')button('查看整張卡還缺什麼',()=>checks(true),report);
 if(full){for(const t of c.errors.filter(t=>!t.includes('請填寫')))el('p',t+' 請至「準備訪談」或相關步驟確認。',report);if(c.warnings.length){const tips=el('details','',report);el('summary','改善提醒（不會阻擋提交）',tips);c.warnings.forEach(t=>el('p',t,tips));}}
 report.scrollIntoView({block:'nearest'});return c;
}
function showFeedback(fb,cached=false){latestFeedback=fb;const aiRecord=form.querySelector('[data-system-ai]');if(aiRecord)aiRecord.textContent='系統內 AI：已取得建議（系統自動記錄，不需重填）。';feedback.hidden=false;responseBox.hidden=false;previousResponse.hidden=true;responseInput.value=card.ai_response||'';feedback.replaceChildren();el('h3',cached?'已保存的 AI 建議':'AI 學習建議',feedback);el('p',({ready:'內容完整，可準備訪談',revise:'請修訂後再次檢查',help:'建議尋求教師協助'})[fb.status],feedback);el('p',fb.strength,feedback);for(const [key,title]of [['directions','探索方向（待驗證）'],['gaps','建議補充'],['assumptions','仍是推測'],['questions','可以追問']]){if(fb[key]?.length){el('h4',title,feedback);const ul=el('ul','',feedback);fb[key].forEach(t=>el('li',t,ul));}}el('p',`最小行動：${fb.next_action}`,feedback);el('p','AI 建議不是使用者證據，也不是成績。請自行確認、補充觀察，不可直接當成事實。',feedback);}
function submissionNotice(title,text,state='success'){
 submitResult.replaceChildren();submitResult.hidden=false;submitResult.dataset.state=state;
 el('h3',title,submitResult);el('p',text,submitResult);
 if(state==='incomplete')button('查看缺項，繼續補充',()=>checks(true),submitResult);
 submitResult.focus({preventScroll:true});submitResult.scrollIntoView({block:'center'});
}
async function submitCard(){
 const label=submitButton.textContent;submitButton.textContent='正在提交，請稍候…';
 try{
  const snapshot=normalize(card);
  if(!check(snapshot).ok){checks(true);submissionNotice('尚未提交：請先補齊內容','你的答案仍保留。按下方「查看缺項」完成必要內容；也可以先儲存草稿。','incomplete');return;}
  if(row?.status==='submitted'&&JSON.stringify(normalize(row.card))===JSON.stringify(snapshot)){
   submissionNotice('這份內容已提交，不需要重複送出',`版本 ${version} · ${readiness(row)}。若修改答案，請再提交新版。`);return;
  }
  submissionNotice('正在提交…','正在保存至雲端，請稍候。','pending');
  await save('submitted',snapshot);
  submissionNotice('Week 2 提交成功！',`已保存至雲端 · 版本 ${version} · ${readiness(row)}。${dirty?'提交期間新增的修改尚未提交，請檢查後再送新版。':'這次交件已完成。AI 額度或 AI 檢查失敗不影響本次提交。'}`);
 }catch(e){submissionNotice('提交未完成',`${e.message} 目前答案仍在頁面，請先下載備份；確認原因後再試。`,'error');}
 finally{submitButton.textContent=label;}
}
async function save(status,snapshot=normalize(card)){
 if(saving)throw Error('正在保存，請等完成再操作。');
 if(status==='draft')submitResult.hidden=true;
 if(status==='submitted'&&!checks(true).ok){msg.textContent='尚未通過必要欄位檢查，仍可儲存草稿。';return;}
 const generation=editGeneration;saving=true;msg.textContent='正在同步…';
 try{const r=await api({action:'save',card:snapshot,version,status});row=r.row;version=row.version;
 if(generation===editGeneration){dirty=false;localStorage.removeItem(cacheKey());msg.textContent=`${status==='submitted'?'已提交':'草稿已同步'} · 版本 ${version} · ${readiness(row)}`;}
 else{msg.textContent=`版本 ${version} 已同步；剛才新增的文字仍在本機，請再儲存。`;}
 }finally{saving=false;}
}
button('檢查目前進度',()=>checks(false));button('儲存草稿',()=>saveWithAuto());const submitButton=button('正式提交',submitCard);
button('下載目前內容',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeffWeek 2 問題探索與選題\n更新時間：'+new Date().toLocaleString('zh-TW')+'\n'+JSON.stringify(card,null,2)],{type:'text/plain;charset=utf-8'}));a.download='Week2-痛點卡.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
for(const [kind,title]of [['explore','我卡住了，給我探索方向'],['review','檢查我的痛點，取得 AI 建議']])button(title,async()=>{
 if(autoBusy)throw Error('已有 AI 請求處理中，請稍候。');
 const requestCard=normalize(card),anonymous=aiInput(requestCard,kind,week1Identity);if(privacyRisk(anonymous))throw Error('文字可能含個資，請改成角色代稱後再請 AI 協助。');
 if(!document.querySelector('#week2-privacy').checked)throw Error('請先在 AI 選用區確認文字不含個資。');
 if(kind==='review'&&!checks(true).ok)return;
 if(!await confirmAnonymous(anonymous)){msg.textContent='已取消傳送，內容保持不變。';return;}
 if(autoBusy)throw Error('已有 AI 請求處理中，請稍候。');
 autoBusy=true;try{await save('draft',requestCard);msg.textContent='正在取得 AI 建議…';
 const r=await api({action:'ai',kind,card:requestCard,privacy_confirmed:true});if(kind==='review'){lastAutoContent=anonymous;lastAutoFeedback=r.feedback;}showFeedback(r.feedback,r.cached);feedback.scrollIntoView({block:'start'});msg.textContent='AI 建議已顯示，請依真實觀察修訂；仍可直接保存或提交。';
 }finally{autoBusy=false;}
},aiControls);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{
 if(!session){msg.textContent='請先到學生起點卡輸入學號與班級邀請碼，再回來此頁。';const a=el('a','進入 Week 1 起點卡');a.href='index.html#student';return;}
 try{
 const data=await api({action:'load'});
 if(data.week1?.status!=='submitted'){msg.textContent='你尚未提交 Week 1。請先完成起點卡，提交後即可回來使用 Week 2。';const a=el('a','補交 Week 1');a.href='index.html#student';return;}
 week1Identity=[session.student_id,data.week1.student_name];
 try{autoAuthorized=localStorage.getItem(autoKey())==='enabled';autoToggle.checked=autoAuthorized;}catch{}
 if(autoToggle.checked)autoStatus.textContent='已啟用自動 AI：完整草稿儲存後取得建議，可隨時關閉。';
 row=data.row;version=row?.version??null;card=row?.card||emptyCard();
 if(!row){card.candidates[0].people=data.week1.affected_user||'';card.candidates[0].context=data.week1.observed_context||'';card.candidates[0].problem=data.week1.observed_problem||'';card.candidates[0].evidence=data.week1.known_fact||'';card.candidates[0].assumption=data.week1.unverified_assumption||'';}
 if(data.week1_feedback?.feedback_json)el('p','Week 1 AI 回饋：'+(data.week1_feedback.feedback_json.overall_feedback||'請返回 Week 1 查看'),priorBody);
 for(const [k,t]of [['observed_problem','問題'],['known_fact','事實'],['unverified_assumption','假設']])el('p',`${t}：${data.week1[k]||'尚未填寫'}`,priorBody);
 const a=el('a','修改 Week 1（保留原版本）',priorBody);a.href='index.html#student';
 for(const v of data.versions||[]){const d=el('details','',historyList);el('summary',`Week ${v.week} · 版本 ${v.version} · ${new Date(v.created_at).toLocaleString('zh-TW')}`,d);el('pre',JSON.stringify(v.snapshot,null,2),d);}
 try{const savedUndo=JSON.parse(localStorage.getItem(undoKey())||'null');if(Array.isArray(savedUndo)&&savedUndo.length){revisionUndo=savedUndo;undoButton.hidden=false;}}catch{}
 workspace.hidden=false;render();msg.textContent=row?`已恢復版本 ${version} · ${readiness(row)}${row.teacher_note?' · 老師：'+row.teacher_note:''}`:'已帶入 Week 1 觀察，請補充第二個候選題。';
 let local;try{local=JSON.parse(localStorage.getItem(cacheKey())||'null');}catch{}
 if(local)button('恢復此裝置尚未同步的草稿',()=>{card=normalize(local.card);dirty=true;render();msg.textContent='已恢復本機草稿，請確認後儲存到雲端。';});
 const fb=data.feedback?.find(x=>x.state==='complete');if(fb){showFeedback(fb.feedback,true);if(fb.submission_version!==version)el('p','此建議來自較早版本，請依目前內容重新判讀。',feedback);}
 }catch(e){msg.textContent=`${e.message} 你仍可閱讀本週藍圖與下載教材。`;}
})();
}
