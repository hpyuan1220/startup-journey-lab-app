import {steps,stepState,progressKey,sameAnswers,cardDifferences,stateLabels} from './week2-journey.mjs?v=20260929-states';
import {revisionFields,draftRevision,applyRevision} from './week2-revision.mjs';
import {emptyCard,fields,triageFields,depthFields,selectedIndex,challengeFields,sourceOptions,normalize,check,readiness,aiInput,privacyRisk} from './week2-core.mjs?v=20260930-lean';
const root=document.querySelector('#week-two');
if(root&&new URLSearchParams(location.search).get('week')==='2'){
root.hidden=!['#card','#week-two'].includes(location.hash);
let card=emptyCard(),version=null,row=null,step=0,dirty=false,session,week1Identity=[],editGeneration=0,saving=false;
try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
// 前四步的缺項總數：全空 25（篩選 5+5、選題與深入 8、準備訪談 7）、填完 0。
// 21 代表學生自己寫的不超過四欄 —— 這時「繼續下一步」只是換頁，
// helpNext() 會直接指出缺哪一項並帶他過去，比較有用。
const STUCK_THRESHOLD=21;
let jumpedToFirstQuestion=false;
// 第一次進卡片就把游標放在第一題。學生要的是「現在答這題」，
// 不是先讀懂七個步驟、兩個勾選框和三個按鈕（實測要捲 3.1 個螢幕才看得到第一格）。
function firstQuestionJump(tries=0){
 if(jumpedToFirstQuestion||card.mode!=='guided')return;
 // 學生已經自己捲動或已經在打字，就不要把畫面搶走。
 if(window.scrollY>0||document.activeElement?.tagName==='TEXTAREA'){jumpedToFirstQuestion=true;return;}
 const first=form.querySelector('.week2-question:not([hidden])');
 if(!first||first.offsetParent===null){
  // render() 早於工作區顯示出來，中間不一定會再 render 一次，所以等版面而不是等下一次 render。
  if(tries<40)setTimeout(()=>firstQuestionJump(tries+1),150);
  return;
 }
 jumpedToFirstQuestion=true;
 try{first.scrollIntoView({block:'center'});}catch{first.scrollIntoView();}
 first.querySelector('textarea,input')?.focus();
}
const el=(tag,text,parent=root)=>{const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;};
const msg=el('p','正在載入你的學習卡…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
const workspace=el('section');workspace.hidden=true;
const intro=el('section','',workspace);intro.className='video-learning-card';root.insertBefore(intro,workspace);
el('h3','先理解：這張卡要做什麼？',intro);
el('p','本週先比較兩個你親身觀察到的不同困擾，再暫選一個，下週找真人訪談。現在不用想產品，也不用證明創業會成功。',intro);
const explanation=el('ol','',intro);for(const text of ['痛點 1：延續 Week 1 的觀察，補充還不清楚的地方。','痛點 2：再找另一個不同困擾；可以是同一場景，但阻礙要不同。','比較選題：從兩個困擾選一個，說明理由。兩個不是都要做成產品。','準備訪談：為選中的一題，找三位可接觸的人、準備兩個問題。'])el('li',text,explanation);
el('p','「候選痛點」就是尚未決定要深入研究的困擾。例如痛點 1 是午餐排隊等太久；痛點 2 是分組時找不到大家都有空的時間。這只是說明用例子，請填自己的事件。第三個痛點完全選填。',intro);
el('p','填答位置在下方「開始填答」。引導模式一次一題，按題目下方的「下一題」繼續；也可用步驟按鈕跳到要修改的地方。來源確認與 AI 建議是選用的，收在步驟列下方。',intro);
let removedCandidate=null,activeStage='0',aiSkipped=false,remembered=null,pendingLocal=null;
const welcome=el('section','',workspace);welcome.hidden=true;welcome.className='video-learning-card';
// 步驟列原本是七顆常駐按鈕。實測每一步畫面上有 16 顆按鈕，卻只有 1 題要答。
// 收進可展開區之後，平常只剩「第 N/5 步：…」那一行標題；要跳步驟再展開。
// 不移除步驟這個概念 —— 學生會分好幾天回來，「我在第幾步」對他有用。
const journeyBox=el('details','',workspace);journeyBox.className='journey-box';
el('summary','跳到其他步驟',journeyBox);
const journey=el('nav','',journeyBox);journey.className='journey';journey.setAttribute('aria-label','Week 2 的步驟');
const journeyInfo=el('section','',workspace);journeyInfo.className='journey-info';
const journeyTitle=el('h3','',journeyInfo),journeyHint=el('p','',journeyInfo),journeyStorage=el('p','',journeyInfo);
const journeyHelp=el('section','',workspace);journeyHelp.setAttribute('aria-live','polite');
const prior=el('details','',workspace);el('summary','我的 Week 1 起點與修改紀錄',prior);const priorBody=el('div','',prior);
const actions=el('div','',workspace);actions.className='actions workspace-actions';
const submitResult=el('section','',workspace);submitResult.hidden=true;submitResult.tabIndex=-1;submitResult.setAttribute('role','status');submitResult.setAttribute('aria-live','polite');submitResult.className='submission-result';
const finalStage=el('section','',workspace);finalStage.hidden=true;el('h3','最後檢查與提交',finalStage);el('p','填齊欄位不代表題目已驗證或教師已核准。提交成功後會顯示雲端版本。',finalStage);
// 誠信揭露：external_ai 原本只在「來源確認」那個選用步驟裡，幾乎不會有人看到。
// 這裡不改成必填 —— 用了外部 AI 不是作弊，重點是被問到、可以誠實回答。
const aiDisclosure=el('section','',finalStage);aiDisclosure.className='ai-disclosure';
el('h4','這張卡有用到系統以外的 AI 嗎？',aiDisclosure);
el('p','例如 ChatGPT、Gemini。用了不影響提交，也不扣分；寫出來就好。系統內建的 AI 建議不用填。',aiDisclosure);
const disclosureChoices=el('div','',aiDisclosure);disclosureChoices.className='ai-disclosure-choices';
const disclosureBox=el('div','',aiDisclosure);disclosureBox.className='ai-disclosure-detail';
const disclosureLabel=el('label','用了哪一個？用來做什麼？',disclosureBox);
const disclosureText=el('textarea','',disclosureLabel);
disclosureText.maxLength=200;disclosureText.rows=2;
disclosureText.placeholder='例如：ChatGPT 協助整理訪談題';
disclosureText.oninput=()=>{card.external_ai=disclosureText.value;localSave();};
const disclosureStatus=el('p','',aiDisclosure);disclosureStatus.className='ai-disclosure-status';disclosureStatus.setAttribute('role','status');
const yesBtn=button('有',()=>setDisclosure(true),disclosureChoices);
const noBtn=button('沒有',()=>setDisclosure(false),disclosureChoices);
function setDisclosure(used){
 disclosureBox.hidden=!used;
 yesBtn.setAttribute('aria-pressed',String(used));
 noBtn.setAttribute('aria-pressed',String(!used));
 try{localStorage.setItem(disclosureKey(),used?'yes':'no');}catch{}
 if(used){disclosureText.focus();disclosureStatus.textContent='';}
 else{if(card.external_ai){card.external_ai='';disclosureText.value='';localSave();}
  disclosureStatus.textContent='已記錄：沒有使用系統以外的 AI。';}
}
// 回答「沒有」只存本機：卡片結構存在伺服器端，為了一個提示欄位改 schema 與
// 重新部署 Edge Function 不划算。被問到才是重點，答案本身不必進資料庫。
const disclosureKey=()=>session?`sjl-w2-ai-disclosed-${session.class_id}-${session.student_id}`:'';
function renderDisclosure(){
 const used=Boolean((card.external_ai||'').trim());
 let answeredNo=false;
 try{answeredNo=!used&&localStorage.getItem(disclosureKey())==='no';}catch{}
 disclosureText.value=card.external_ai||'';
 disclosureBox.hidden=!used;
 yesBtn.setAttribute('aria-pressed',String(used));
 noBtn.setAttribute('aria-pressed',String(answeredNo));
 disclosureStatus.textContent=answeredNo?'已記錄：沒有使用系統以外的 AI。':'';
}
const form=el('form','',workspace);form.noValidate=true;
form.addEventListener('focusin',e=>{const q=e.target.closest('.week2-question');if(q){step=[...form.querySelectorAll('.week2-question')].indexOf(q);remember();}});
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
  if(!await confirmAnonymous(content,true,autoStatus)){disableAuto();return;}
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
const revisionPreview=el('section','',revisionArea);revisionPreview.hidden=true;revisionPreview.className='revision-preview';
const revisionAction=fn=>{try{fn();}catch(e){revisionStatus.textContent=e.message;}};
const undoKey=()=>`sjl-week2-revision-${session?.class_id}-${session?.student_id}`;
const undoButton=button('復原上次套用',()=>revisionAction(()=>{
 if(!revisionUndo)throw Error('目前沒有可復原的套用紀錄。');
 card=applyRevision(card,revisionUndo,true);revisionUndo=null;try{localStorage.removeItem(undoKey());}catch{}
 localSave();render();revisionPreview.hidden=true;undoButton.hidden=true;draftButton.hidden=false;saveAfterApply.hidden=false;revisionStatus.textContent='已復原上次套用的欄位，但還沒存到雲端。按下面的「儲存草稿到雲端」把復原後的內容存好。';
}),revisionArea);undoButton.hidden=true;
// 套用之後最該做的事是把內容存到雲端。原本這一區的訊息寫著「請檢查並儲存草稿」，
// 但那兩顆按鈕已經因為重複而移除，學生得自己捲回卡片上方找 —— 訊息叫他做的事，
// 按鈕就要在旁邊。這一顆只在套用後出現，不會又變回五顆並排。
const saveAfterApply=button('儲存草稿到雲端',()=>saveWithAuto(),revisionArea);
saveAfterApply.hidden=true;saveAfterApply.className='primary-action';
const draftButton=button('幫我草擬修改',()=>revisionAction(()=>{
 const keys=revisionChecks.filter(c=>c.checked).map(c=>c.value);if(!keys.length)throw Error('請先勾選想修改的欄位。');
 const all=draftRevision(card,latestFeedback,keys),selectedTopic=card.selected,sourceSnapshot=JSON.stringify(card.candidates[card.selected]);
 // 和現在寫的一模一樣的欄位不要列出來 —— 要學生比較兩段相同的文字再決定要不要套用，
 // 是這一區最讓人困惑的地方，而且他做什麼選擇結果都一樣。
 const patches=all.filter(p=>p.changed),unchanged=all.filter(p=>!p.changed);
 if(!patches.length){
  revisionPreview.hidden=true;
  throw Error(`勾選的欄位（${unchanged.map(p=>p.label).join('、')}）建議內容和你現在寫的完全一樣，沒有東西需要套用。`);
 }
 revisionPreview.replaceChildren();revisionPreview.hidden=false;
 revisionStatus.textContent=`有 ${patches.length} 個欄位的建議和你現在寫的不同；原答案尚未改動。請逐欄檢查並勾選要套用的內容。`;
 el('h4','預覽差異：原答案／建議修改',revisionPreview);
 if(unchanged.length)el('p',`${unchanged.map(p=>p.label).join('、')}的建議和你現在寫的一樣，沒有列出來。`,revisionPreview).className='revision-skipped';
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
 localSave();render();undoButton.hidden=false;revisionPreview.hidden=true;draftButton.hidden=false;
 saveAfterApply.hidden=false;
 revisionStatus.textContent=`已套用 ${chosen.length} 個欄位，但還沒存到雲端。下一步：按下面的「儲存草稿到雲端」，存好之後再前往提交檢查。${stored?'改壞了可以按「復原上次套用」回到原答案。':'本機無法保存復原紀錄，僅此頁開啟期間可復原。'}`;
 }),revisionPreview).className='primary-action';
 button('取消，保留原答案',()=>{revisionPreview.hidden=true;draftButton.hidden=false;revisionStatus.textContent='已取消，原答案沒有改動。';},revisionPreview);
 // 草稿開著時把這顆藏起來。學生可能已經在預覽的文字框裡改過字，
 // 再按一次會重新產生、把他改的內容沖掉 —— 那不是複雜，是會掉資料。
 draftButton.hidden=true;
 revisionPreview.scrollIntoView({block:'start'});
}),revisionArea);
// 原本這裡還有「儲存修改後的草稿」與「檢查修改後的完整度」，
// 但它們呼叫的是 saveWithAuto() 與 checks(true) —— 和卡片上方的「儲存草稿」、
// 「查看整張卡還缺什麼」完全同一個函式。同一件事兩個名字兩個位置，
// 是這一區看起來有五顆按鈕的主因。
const previousResponse=el('details','',aiStep);previousResponse.hidden=true;el('summary','查看先前填寫的 AI 回應',previousResponse);const previousResponseText=el('p','',previousResponse);
const openAiButton=button('我要使用 AI：展開選項',()=>{aiControls.hidden=false;openAiButton.textContent='AI 選項已展開，請在下方選擇';openAiButton.setAttribute('aria-expanded','true');aiControls.scrollIntoView({block:'center'});privacyCheckbox.focus({preventScroll:true});},aiChoices);openAiButton.setAttribute('aria-expanded','false');openAiButton.setAttribute('aria-controls','week2-ai-options');
button('暫不使用 AI，繼續提交',()=>{disableAuto();aiControls.hidden=true;openAiButton.textContent='我要使用 AI：展開選項';openAiButton.setAttribute('aria-expanded','false');msg.textContent='可以直接提交，不需要 AI 建議或 AI 回應。既有內容仍保留。';aiSkipped=true;goStage('submit');submitButton.focus();},aiChoices);
const historyBox=el('details','',workspace);el('summary','歷次保存與提交',historyBox);const historyList=el('div','',historyBox);
const journeyControls=el('div','',workspace);journeyControls.className='journey-controls';
const previousStep=button('上一步',()=>moveStage(-1),journeyControls);
const nextStep=button('繼續下一步',()=>moveStage(1),journeyControls);nextStep.className='primary-action';
const helpButton=button('我不知道下一步',()=>helpNext(),journeyControls);
// 七步裡有兩步（來源確認、AI 建議）是選用的，一直攤在步驟列上，
// 會讓這張卡看起來比實際要做的多 40%。預設收進「選用步驟」，需要時再展開。
const OPTIONAL_STEPS=['source','ai'];
const optionalBox=el('details','',journey);optionalBox.className='journey-optional';
el('summary','選用步驟（來源確認、AI 建議）—— 不影響提交',optionalBox);
// 主步驟重新編號 1..5；選用的兩步收在展開區裡，不給編號，免得主列出現 1,2,3,4,7 這種跳號。
const mainOrder=steps.filter(([k])=>!OPTIONAL_STEPS.includes(k)).map(([k])=>k);
const stepNumber=key=>mainOrder.indexOf(key)+1;
const stageButtons=new Map(steps.map(([key,title])=>[key,button(OPTIONAL_STEPS.includes(key)?title:`${stepNumber(key)}. ${title}`,()=>goStage(key),OPTIONAL_STEPS.includes(key)?optionalBox:journey)]));
journey.appendChild(optionalBox); // 收合區放在主步驟之後，不要擋在最前面
function remember(){if(!session)return;try{localStorage.setItem(progressKey(session),JSON.stringify({stage:activeStage,question:step,mode:card.mode,skipped:aiSkipped}));}catch{}}
function refreshJourney(){
 const states=stepState(card,row,{ai:!!latestFeedback,skipped:aiSkipped});
 const labels=stateLabels;
 if(OPTIONAL_STEPS.includes(activeStage))optionalBox.open=true;
 for(const [key,b]of stageButtons){const st=states[key];b.dataset.state=st.state;b.textContent=`${OPTIONAL_STEPS.includes(key)?'':stepNumber(key)+'. '}${steps.find(x=>x[0]===key)[1]} · ${labels[st.state]}${st.missing.length&&key!=='submit'?'（'+st.missing.length+'項）':''}${key===activeStage?' · 目前步驟':''}`;if(key===activeStage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');}
 const index=steps.findIndex(x=>x[0]===activeStage),info=steps[index];
 const welcomeText=welcome.querySelector('p');if(welcomeText){const missing=steps.slice(0,4).find(([key])=>states[key].missing.length);welcomeText.textContent=`歡迎回來，你上次停在「${steps.find(x=>x[0]===remembered?.stage)?.[1]||'選填探索'}」。目前${pendingLocal?'本機與雲端不同，請先選擇版本':dirty?'有本機修改未同步':row?`雲端版本 ${version} · ${readiness(row)}`:'尚未保存至雲端'}。下一步建議：${pendingLocal?'比較差異後接續':dirty?'儲存草稿':states.submit.state==='submitted'?'準備訪談，不必重複提交':missing?`補充${missing[1]}的「${states[missing[0]].missing[0]}」`:'前往提交檢查，AI 為選用'}。位置僅在同裝置、同瀏覽器恢復。`;}
 // 卡片幾乎全空時，學生需要的是一條路，不是「繼續下一步」。
 const missingTotal=steps.slice(0,4).reduce((n,[key])=>n+states[key].missing.length,0);
 const stuck=missingTotal>=STUCK_THRESHOLD&&states.submit.state!=='submitted';
 nextStep.classList.toggle('primary-action',!stuck);
 helpButton.classList.toggle('primary-action',stuck);
 helpButton.textContent=stuck?'我不知道下一步（建議先從這裡開始）':'我不知道下一步';

 journeyTitle.textContent=info?(OPTIONAL_STEPS.includes(activeStage)?`選用步驟：${info[1]}`:`第 ${stepNumber(activeStage)}/${mainOrder.length} 步：${info[1]}`):activeStage==='2'?'選填：第三個痛點':'選填：進階探索';
 journeyHint.textContent=(info?.[2]||'可自由探索，不增加所有學生的必經步驟。')+(states[activeStage]?.missing.length?` 尚缺：${states[activeStage].missing.slice(0,3).join('、')}。`:'');
 journeyStorage.textContent=pendingLocal?'本機與雲端內容不同，請先選擇要繼續的版本。':dirty?'目前有本機修改，尚未同步雲端。':row?`雲端版本 ${version} · ${readiness(row)}`:'目前尚未保存至雲端。';
 submitButton.textContent=states.submit.state==='submitted'?'查看提交結果':states.submit.missing.length?'查看待補內容':'正式提交';
 previousStep.hidden=index<=0;previousStep.disabled=index<=0;nextStep.hidden=activeStage==='submit';nextStep.textContent=activeStage==='ai'?'略過／完成 AI，前往提交檢查':'繼續下一步';
}
function showStage(){
 for(const box of form.querySelectorAll('[data-stage]'))box.hidden=box.dataset.stage!==activeStage;
 form.hidden=['ai','submit'].includes(activeStage);aiStep.hidden=activeStage!=='ai';finalStage.hidden=activeStage!=='submit';if(activeStage==='submit')renderDisclosure();liveCheck.hidden=activeStage!=='submit';report.hidden=activeStage!=='submit';
 const qs=[...form.querySelectorAll('.week2-question')],group=form.querySelector(`[data-stage="${activeStage}"]`);
 if(group){const current=qs[step];if(!current||!group.contains(current))step=qs.findIndex(q=>group.contains(q));
 qs.forEach((q,i)=>{const hide=card.mode==='guided'&&i!==step;q.hidden=hide;for(const helper of q.week2Helpers||[])helper.hidden=hide;});
 // 上一題／下一題永遠緊接在當前題目後面，桌機與手機都一樣。
 // 固定放在表單開頭或結尾，總有一種螢幕會讓按鈕離題目很遠。
 const bar=form.querySelector('.guided-nav-bar'),shown=qs[step];
 if(bar&&shown&&card.mode==='guided'&&!shown.hidden)shown.after(bar);
 }
 refreshJourney();
}
function goStage(key,question){activeStage=key;if(Number.isInteger(question))step=question;render();remember();journeyTitle.tabIndex=-1;journeyTitle.focus({preventScroll:true});journeyInfo.scrollIntoView({block:'start'});
 // 捲到步驟標題還不夠：這一步真正要做的事可能仍在螢幕外。
 // 手機上，步驟標題與該答的題目之間隔著版本行、儲存草稿、節奏選項約 500px，
 // 844px 的螢幕按完「繼續下一步」會看不到任何題目。捲到這一步真正要做的事。
 requestAnimationFrame(()=>{
  const target=key==='submit'?liveCheck:key==='ai'?aiStep:form.querySelector(`[data-stage="${key}"] .week2-question:not([hidden])`);
  if(!target||target.hidden)return;const r=target.getBoundingClientRect();
  if(r.top>innerHeight-140||r.bottom<0)target.scrollIntoView({block:'center'});});}
function moveStage(delta){let index=steps.findIndex(x=>x[0]===activeStage);if(activeStage==='ai'&&!latestFeedback){aiSkipped=true;disableAuto();}goStage(steps[Math.max(0,Math.min(6,index<0?2:index+delta))][0]);}
function helpNext(){
 journeyHelp.replaceChildren();
 if(dirty){el('p','有修改尚未保存。請先儲存草稿。',journeyHelp);button('儲存草稿',()=>saveWithAuto(),journeyHelp);}
 else if(row?.status==='submitted'&&sameAnswers(card,row.card)){el('p',`已提交版本 ${version}，不必重複提交。${readiness(row)}`,journeyHelp);}
 else {const states=stepState(card,row);const missing=steps.slice(0,4).find(([k])=>states[k].missing.length);
 if(missing){const key=missing[0];el('p',`${missing[1]}還需補充：${states[key].missing[0]}。`,journeyHelp);button('前往補充',()=>{goStage(key);const group=form.querySelector(`[data-stage="${key}"]`);const qs=[...form.querySelectorAll('.week2-question')];const q=qs.find(q=>group.contains(q)&&q.querySelector('textarea')&&!q.querySelector('textarea').value.trim());if(q){goStage(key,qs.indexOf(q));qFocus();}else group.querySelector('input[type="checkbox"]:not(:checked)')?.focus();},journeyHelp);}
 else{el('p',aiSkipped||latestFeedback?'可前往最後檢查，正式提交。':'核心填答已完成，可選擇 AI 建議或略過後提交。',journeyHelp);button('前往下一步',()=>goStage(aiSkipped||latestFeedback?'submit':'ai'),journeyHelp);}}
 journeyHelp.scrollIntoView({block:'center'});
}
function qFocus(){const rememberedQuestion=[...form.querySelectorAll('.week2-question')][step];const q=rememberedQuestion&&!rememberedQuestion.closest('[hidden]')?rememberedQuestion:form.querySelector('[data-stage="'+activeStage+'"] .week2-question:not([hidden])');q?.closest('details')?.setAttribute('open','');q?.querySelector('input,textarea')?.focus();
 // 換題時把題目捲到畫面中央：題目高度不一，不捲的話下一題按鈕會慢慢漂出畫面。
 if(q&&q.offsetParent!==null){try{q.scrollIntoView({block:'center',behavior:'auto'});}catch{q.scrollIntoView();}}}
function addBackupDownload(){try{const backup=localStorage.getItem(cacheKey()+'-backup');if(backup&&!actions.querySelector('[data-backup]'))button('下載先前本機備份',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+backup],{type:'text/plain;charset=utf-8'}));a.download='Week2-本機備份.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}).dataset.backup='true';}catch{}}
const cacheKey=()=>`sjl-week2-${session?.class_id}-${session?.student_id}`;
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`連線失敗 ${r.status}`);return b;}
function button(label,fn,parent=actions){const b=el('button',label,parent);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn(b);}catch(e){msg.textContent=e.message;}finally{b.disabled=b===previousStep&&activeStage==='0';}};return b;}
let confirmOpen=false;
function confirmAnonymous(content,automatic=false,after=null,trigger=null){
 if(confirmOpen)return Promise.resolve(false);
 confirmOpen=true;
 return new Promise(resolve=>{
 const panel=el('section');panel.className='video-learning-card';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','確認交給 AI 的內容');
 el('h3','確認交給 AI 的匿名內容',panel);if(automatic)el('p','啟用後，本卡日後儲存完整草稿時會自動傳送更新後的匿名痛點、選題理由與訪談題至 OpenAI API，不會每次再預覽。請勿填入個資，可隨時取消勾選關閉。啟用本身不會呼叫 AI。',panel);el('p','以下文字將傳送至 OpenAI API 取得建議。若仍有可識別個資，請取消並修改。',panel);const preview=JSON.parse(content);
 const names=Object.fromEntries([...fields,...challengeFields]);Object.assign(names,{candidates:'候選痛點',selected:'暫定選題（從 1 起算）',reason:'選擇理由',reconsider:'重新選題的條件',statement:'痛點描述',questions:'訪談問題',challenge:'進階挑戰'});
 const translated=value=>Array.isArray(value)?value.map(translated):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[names[key]||key,key==='selected'?Number(v)+1:translated(v)])):value;
 el('pre',JSON.stringify(translated(preview),null,2),panel);
 const triggerLabel=trigger?trigger.textContent:null;
 if(trigger)trigger.textContent='↑ 請到上方確認送出內容';
 const end=value=>{confirmOpen=false;panel.remove();if(trigger&&triggerLabel)trigger.textContent=triggerLabel;resolve(value);};button(automatic?'同意，啟用儲存後自動 AI':'確認內容，取得 AI 建議',()=>end(true),panel);button('取消，回去修改',()=>end(false),panel);
 // 面板要出現在「剛才按的那顆按鈕」旁邊。插在卡片最上面時，手機上距離可達六個螢幕，
 // 按鈕同時因為 await 變灰，學生看起來就是「按了沒反應」。
 if(after&&after.parentNode)after.parentNode.insertBefore(panel,after.nextSibling);
 else root.insertBefore(panel,workspace);
 panel.querySelector('button').focus();panel.scrollIntoView({block:'center'});
 msg.textContent='有一段內容在等你確認：請按「確認內容，取得 AI 建議」或「取消，回去修改」。';
});}
function localSave(){submitResult.hidden=true;clearTimeout(rulesTimer);rulesTimer=setTimeout(updateLiveCheck,450);editGeneration++;dirty=true;refreshJourney();remember();try{localStorage.setItem(cacheKey(),JSON.stringify({card,version,savedAt:new Date().toISOString()}));msg.textContent='已暫存在此裝置；請按儲存草稿同步雲端。';}catch{msg.textContent='此裝置無法暫存，請立即儲存草稿或下載備份。';}}
function input(label,value,set,parent,placeholder='',pair=null,extra=null){
 const wrap=el('label',label,parent);wrap.className='week2-question';const t=el('textarea','',wrap);t.value=value||'';t.maxLength=label.startsWith('受訪者 ')?200:label.startsWith('訪談問題 ')?300:label==='內容來源與 AI 使用說明'?60:600;t.placeholder=placeholder;t.oninput=()=>{set(t.value);localSave();};
 wrap.week2Helpers=[];
 if(pair){const d=el('details','',parent);d.className='week2-hint';el('summary','看範例對照',d);const bad=el('p','',d);bad.className='week2-hint-bad';bad.textContent='❌ 這樣不夠：'+pair[0];const good=el('p','',d);good.className='week2-hint-good';good.textContent='✅ 這樣可以：'+pair[1];el('p','範例只是說明寫法，不能當成你的證據。',d).className='week2-hint-note';wrap.week2Helpers.push(d);}
 if(extra)wrap.week2Helpers.push(extra(parent,t,set));
 return t;
}

/** 誠實選項：讓學生標記「這不是我親眼看到的」，不扣分也不必編造證據。 */
function honestOption(parent,t,set){
 const b=el('button','我還沒親眼看過',parent);b.type='button';b.className='week2-honest';
 b.onclick=()=>{const cur=t.value.trim();
  if(HONEST_MARK.test(cur)){msg.textContent='已經標記過「還沒親眼看過」了，不需要再按一次。';return;}
  t.value=cur?cur+HONEST_TAIL:HONEST_TEXT;
  set(t.value);localSave();updateLiveCheck();};
 return b;
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
// 進階探索的開關：有填過內容就永遠顯示；否則看本機偏好（與步驟位置同樣按班級＋學生區分）。
const challengeKey=()=>session?`sjl-week2-extra-${session.class_id}-${session.student_id}`:'';
function hasChallengeContent(){return Object.values(card.challenge||{}).some(Boolean);}
function challengeOptIn(){try{return localStorage.getItem(challengeKey())==='1';}catch{return false;}}
function setChallengeOptIn(on){try{on?localStorage.setItem(challengeKey(),'1'):localStorage.removeItem(challengeKey());}catch{}}
function showChallenge(){return hasChallengeContent()||challengeOptIn();}
// 舊資料相容：'challenge' 已不再是填答節奏，轉為 standard 並保留進階題入口。
function adoptPacing(mode){if(mode==='challenge'){setChallengeOptIn(true);return 'standard';}return mode==='guided'?'guided':'standard';}
// 每個欄位的 ❌／✅ 對照，全部是合成範例，不是任何學生的作答。
const examplePairs={
 people:['大家、同學還有我','午休只有 50 分鐘、下午第一堂在另一棟大樓的大二學生'],
 context:['有時候會發生','週二中午 12 點 10 分，在第二餐廳門口'],
 job:['想要有一個 App 可以解決這件事','在下一堂課開始前，買到並吃完午餐'],
 problem:['很不方便、體驗不好','排隊時間無法預估，不知道還來不來得及吃完'],
 frequency:['應該很常發生','待驗證：我自己這三週各發生一次，其他人還沒問過'],
 cost:['浪費很多時間','待驗證：我上次多花 19 分鐘，午餐只吃了一半'],
 workaround:['沒有什麼辦法','改買便利商店麵包、提早十分鐘離開教室'],
 evidence:['很多人都有這個問題','9/23 中午我在現場計時，排了 19 分鐘，這是我自己看到的'],
 assumption:['大家一定都會需要','我猜等太久是付款流程造成的，但還沒問過店家'],
};
const HONEST_TEXT='我還沒親眼看過這件事，目前是我從別人說的或網路上看到的推測，還需要自己去確認。';
const HONEST_TAIL='（以上不是我親眼看到的，還需要自己確認。）';
const HONEST_MARK=/還沒親眼看過|不是我親眼看到/;

function render(){
 updateLiveCheck();
 form.replaceChildren();report.replaceChildren();responseInput.value=card.ai_response||'';previousResponseText.textContent=card.ai_response||'';previousResponse.hidden=!card.ai_response||!responseBox.hidden;el('h3','開始填答',form);
 // 填答節奏：只影響一次顯示幾題，不影響必填內容。仍沿用既有的 mode 欄位（guided／standard），不需要資料遷移。
 const pacingLabel=el('label','',form),pacing=el('input','',pacingLabel);
 pacing.type='checkbox';pacing.checked=card.mode==='guided';
 pacingLabel.append(document.createTextNode('一次只顯示一題（第一次填建議打開）'));
 pacing.onchange=()=>{card.mode=pacing.checked?'guided':'standard';localSave();render();remember();};
 // 進階探索：獨立選填，與填答節奏無關。已填過內容者一律保持開啟。
 const extraLabel=el('label','',form),extraToggle=el('input','',extraLabel);
 extraToggle.type='checkbox';extraToggle.checked=showChallenge();
 extraToggle.disabled=hasChallengeContent();
 extraLabel.append(document.createTextNode(hasChallengeContent()?'進階探索已開啟（已有填寫內容）':'我想多挑戰 5 個進階問題（選填，不影響提交）'));
 extraToggle.onchange=()=>{setChallengeOptIn(extraToggle.checked);render();remember();};
 el('p','不論勾選與否，必填內容完全相同：兩個候選痛點、三位受訪者與兩題訪談問題。隨時可以切換，答案不會消失。',form);
 if(card.candidates.length===3)button('前往第三個痛點（選填）',()=>goStage('2'),form);
 card.candidates.forEach((c,i)=>{
  const box=el('details','',form);box.className='candidate';box.dataset.stage=String(i);box.open=true;el('summary',`痛點 ${i+1}${i===2?'（選填）':''}：${i===0?'延續 Week 1 的困擾':i===1?'另一個不同困擾':'額外比較的困擾'}`,box);
  el('p',i===0?'已帶入可用的 Week 1 內容；請在下面的文字框確認並補充。':'請在下面的文字框填寫另一個困擾，不是上一題的解決方法。',box);
  if(card.mode==='guided'){
   const q=el('label','先從生活場景選擇（可自行填寫）',box),s=el('select','',q);for(const text of ['請選擇','吃飯','通勤','上課','租屋','打工','分組','行政流程']){el('option',text,s);}s.onchange=()=>{if(s.selectedIndex){const hint=el('p',`你選了「${s.value}」。請在「何時何地發生」補充自己的時間、地點與事件；不會覆蓋原答案。`,box);hint.setAttribute('role','status');}};
  }
  const examples={people:'例如：午休只有 50 分鐘、下午要換教室的同學',context:'例如：週二中午 12 點，在學校餐廳；請填自己的事件',job:'例如：下一堂課開始前，買到並吃完午餐（不是開發 App）',problem:'例如：排隊時間不確定，無法判斷是否來得及吃完',frequency:'不確定可寫：待驗證，訪談最近一週發生幾次',cost:'不確定可寫：待驗證，上次多花多久、放棄了什麼',workaround:'例如：改買麵包、提早出門、群組詢問，或暫時忍耐',evidence:'請寫自己真的看過的事件、時間與來源；例子不能當成證據',assumption:'例如：我猜其他同學也困擾，但尚未問過他們'};
  // 這裡只問篩選用的五欄；深入的四欄在「選題與深入」那一步，只問選中的那一個。
  triageFields.forEach(([k,t,q])=>input(q||t,c[k],v=>c[k]=v,box,examples[k],examplePairs[k],k==='evidence'?honestOption:null));
  if(i===2)button('不需要第三題，移除並保留復原',()=>{removedCandidate={candidate:card.candidates[2],selected:card.selected};card.candidates.pop();if(card.selected===2)card.selected=0;step=0;activeStage='0';localSave();render();msg.textContent='已移除第三題，可按「復原第三題」找回剛才的內容。請確認暫定選題。';},box);
 });
 // 痛點 2 的篩選五欄都填完才出現。還沒寫完第二個就看到「加第三個」，
 // 只會讓畫面更滿，也讓學生以為第三個是必要的。
 const secondReady=card.candidates[1]&&triageFields.every(([k])=>String(card.candidates[1][k]||'').trim());
 if(card.candidates.length<3&&secondReady)button('增加第三個候選題（選填）',()=>{card.candidates.push(Object.fromEntries(fields.map(([k])=>[k,''])));step=triageFields.length*2;activeStage='2';localSave();render();},form);
 if(removedCandidate&&card.candidates.length===2)button('復原第三題',()=>{card.candidates.push(removedCandidate.candidate);card.selected=removedCandidate.selected;removedCandidate=null;step=18;activeStage='2';localSave();render();},form);
 const choice=el('section','',form);choice.dataset.stage='choice';el('h3','比較選題：先選一個要訪談的方向',choice);
 const pickLabel=el('label','我暫時選擇',choice),pick=el('select','',pickLabel);card.candidates.forEach((c,i)=>{const o=el('option',`痛點 ${i+1}：${c.problem||'尚未填寫阻礙'}`,pick);o.value=i;});pick.value=card.selected;pick.onchange=()=>{card.selected=Number(pick.value);localSave();};
 input('為什麼先選這一題？其他題目為什麼暫緩？',card.reason,v=>card.reason=v,choice,'例如：這件事我每週都遇到，而且找得到人訪談；另一題我自己沒碰過，只是聽說。');
 input('什麼證據會讓我改變選擇？',card.reconsider,v=>card.reconsider=v,choice);
 input('修訂後的痛點陳述',card.statement,v=>card.statement=v,choice,'在＿＿情境中，＿＿的人想要＿＿，但遇到＿＿，目前用＿＿處理；仍需驗證＿＿。');
 // 選完才挖深，而且只挖選中的那一個。沒被選中的候選不必回答這四題 ——
 // 逼學生把即將放棄的題目也挖到底，教的是錯的做法。
 {
  const pick=Math.max(0,selectedIndex(card)),chosen=card.candidates[pick];
  const depthBox=el('section','',choice);depthBox.className='week2-depth';
  el('h3',`深入你選的這一題：痛點 ${pick+1}`,depthBox);
  el('p',`「${chosen.problem||'（尚未填寫阻礙）'}」—— 接下來四題只問這一個困擾。`,depthBox);
  const depthHints={cost:'不確定可寫：待驗證，上次多花多久、放棄了什麼',workaround:'例如：改買麵包、提早出門、群組詢問，或暫時忍耐',
   // 選題的及格線：如果現在的方法其實夠用，這個題目做下去第五週會沒人在乎。
   acceptance:'例如：便利商店買得到，但排隊一樣久，而且常常賣完；或：現在的方法其實還可以，我還不確定值不值得做',
   evidence:'請寫自己真的看過的事件、時間與來源；例子不能當成證據',assumption:'例如：我猜其他同學也困擾，但尚未問過他們'};
  depthFields.forEach(([k,t,q])=>input(q||t,chosen[k],v=>{chosen[k]=v;},depthBox,depthHints[k],examplePairs[k],k==='evidence'?honestOption:null));
 }
 const interview=el('section','',form);interview.dataset.stage='interview';el('h3','準備訪談：只針對剛才選中的一題',interview);el('h3','三位可接觸的受訪者',interview);el('p','使用角色代稱，例如「通勤同學 A，課後詢問」。不要寫姓名、電話或 Email。',interview);
 card.interviewees.forEach((v,i)=>input(`受訪者 ${i+1}：角色與接觸方式`,v,x=>card.interviewees[i]=x,interview));
 // 這兩題原本共用同一個範例，而且畫面上唯一可見的說明是在講受訪者怎麼命名 ——
 // 學生會合理地以為兩題要問一樣的東西。給各自的範例，並補一句屬於問題的說明。
 el('p','問最近一次真實經驗，不要問「你會不會用」。兩題問不同的面向。',interview);
 const questionHints=['例如：上一次遇到這件事是什麼時候？當下你怎麼處理？',
                      '例如：那個做法哪裡讓你不滿意？你有想過換別的方式嗎？'];
 card.questions.forEach((v,i)=>input(`訪談問題 ${i+1}`,v,x=>card.questions[i]=x,interview,questionHints[i]));
 if(showChallenge()){button('前往進階探索（選填）',()=>goStage('challenge'),form);const extra=el('section','',form);extra.dataset.stage='challenge';el('h3','進階探索（選填）',extra);challengeFields.forEach(([k,t])=>input(t,card.challenge[k],v=>card.challenge[k]=v,extra));}
 const sourceStage=el('section','',form);sourceStage.dataset.stage='source';const sources=el('section','內容從哪裡來？（勾選即可）',sourceStage);sources.className='week2-question';
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


 for(const [k,t]of [['contact_confirmed','我確認三位受訪者符合暫定對象，而且可以實際接觸。'],['questions_checked','我確認兩題問題詢問過去的真實經驗，不暗示答案或推銷產品。']]){const l=el('label','',interview),c=el('input','',l);c.type='checkbox';c.dataset.confirmation=k;c.checked=card[k];c.onchange=()=>{card[k]=c.checked;localSave();};l.append(document.createTextNode(t));}

 const questions=[...form.querySelectorAll('.week2-question')];
 const group=form.querySelector(`[data-stage="${activeStage}"]`);
 if(group&&card.mode==='guided'){
  const inStage=questions.filter(q=>group.contains(q));
  if(!inStage.includes(questions[step]))step=questions.indexOf(inStage[0]);
  const nav=el('nav','',form);nav.className='guided-nav';nav.setAttribute('aria-label','本步驟題目');
  const label=el('label','跳到本步驟的問題',nav),select=el('select','',label);
  inStage.forEach(q=>{const o=el('option',q.childNodes[0].textContent,select);o.value=questions.indexOf(q);});select.value=step;
  const jump=i=>{step=i;render();remember();qFocus();};select.onchange=()=>jump(Number(select.value));
  const at=inStage.indexOf(questions[step]);
  form.insertBefore(nav,form.querySelector('.candidate'));
  // 上一題／下一題放在表單最後，並在窄螢幕吸附在畫面底部。
  // 原本和跳題選單一起放在題目「上方」302px 處：手機捲到題目時按鈕已被推出畫面，
  // 每答一題都要往上捲才能按下一題，二十幾題就是二十幾次。
  const bar=el('nav','',form);bar.className='guided-nav-bar';bar.setAttribute('aria-label','上一題與下一題');
  el('p',`本步驟第 ${at+1}/${inStage.length} 題`,bar);
  button('上一題',()=>jump(questions.indexOf(inStage[at-1])),bar).disabled=at===0;
  const nextBtn=button('下一題',()=>jump(questions.indexOf(inStage[at+1])),bar);
  nextBtn.disabled=at===inStage.length-1;nextBtn.className='primary-action';
 }
 showStage();
 // 每次 render 都試一次；函式自己有旗標，整個頁面生命週期只會真的跳一次。
 // 掛在 render 結尾是因為進入卡片的路徑不只一條（雲端恢復、切換檢視、草稿衝突）。
 firstQuestionJump();

 form.onsubmit=e=>{e.preventDefault();};
}
function checks(full=false){
 report.replaceChildren();const c=check(normalize(card));
 const targets=[];
 card.candidates.forEach((candidate,i)=>triageFields.forEach(([k,label])=>{if(!candidate[k])targets.push({label:`痛點 ${i+1}：${label}`,index:i*triageFields.length+triageFields.findIndex(([key])=>key===k)});}));
 const base=card.candidates.length*triageFields.length;
 [['reason','選題理由'],['reconsider','會改變選擇的證據'],['statement','修訂後的痛點陳述']].forEach(([k,label],i)=>{if(!card[k])targets.push({label,index:base+i});});
 const pick=Math.max(0,selectedIndex(card)),chosen=card.candidates[pick];
 depthFields.forEach(([k,label],i)=>{if(!chosen[k])targets.push({label:`選中的痛點：${label}`,index:base+3+i});});
 const afterDepth=base+3+depthFields.length;
 card.interviewees.forEach((v,i)=>{if(!v)targets.push({label:`受訪者 ${i+1} 的角色與接觸方式`,index:afterDepth+i});});
 card.questions.forEach((v,i)=>{if(!v)targets.push({label:`訪談問題 ${i+1}`,index:afterDepth+3+i});});
 const shown=full||card.mode!=='guided'?targets:targets.filter(t=>t.index===step);
 el('h3',c.ok?'必要內容已填齊':full?'提交前：還有哪些內容需要補充？':'目前填答進度',report);
 el('p',`尚有 ${targets.length} 個文字欄位待填。可先保存草稿，不必一次完成。${!full&&card.mode==='guided'?'這裡先顯示目前這一題；完整檢查可按下方按鈕。':''}`,report);
 shown.forEach(t=>button(`前往填寫：${t.label}`,()=>{step=t.index;const before=[...form.querySelectorAll('.week2-question')][t.index];activeStage=before.closest('[data-stage]').dataset.stage;render();remember();const q=[...form.querySelectorAll('.week2-question')][t.index];const box=q.closest('details');if(box)box.open=true;q.querySelector('textarea').focus();q.scrollIntoView({block:'center'});},report));
 if(!full&&card.mode==='guided')button('查看整張卡還缺什麼',()=>checks(true),report);
 if(full){for(const [key,label]of [['contact_confirmed','確認受訪者的接觸方式'],['questions_checked','確認訪談問題不引導']])if(!card[key])button('前往確認：'+label,()=>{goStage('interview');form.querySelector(`[data-confirmation="${key}"]`).focus();},report);for(const t of c.errors.filter(t=>!t.includes('請填寫')))el('p',t+' 請至「準備訪談」或相關步驟確認。',report);if(c.warnings.length){const tips=el('details','',report);el('summary','改善提醒（不會阻擋提交）',tips);c.warnings.forEach(t=>el('p',t,tips));}}
 report.hidden=false;report.scrollIntoView({block:'nearest'});return c;
}
function showFeedback(fb,cached=false){latestFeedback=fb;aiSkipped=false;refreshJourney();const aiRecord=form.querySelector('[data-system-ai]');if(aiRecord)aiRecord.textContent='系統內 AI：已取得建議（系統自動記錄，不需重填）。';feedback.hidden=false;responseBox.hidden=false;previousResponse.hidden=true;responseInput.value=card.ai_response||'';feedback.replaceChildren();el('h3',cached?'已保存的 AI 建議':'AI 學習建議',feedback);el('p',({ready:'內容完整，可準備訪談',revise:'請修訂後再次檢查',help:'建議尋求教師協助'})[fb.status],feedback);el('p',fb.strength,feedback);for(const [key,title]of [['directions','探索方向（待驗證）'],['gaps','建議補充'],['assumptions','仍是推測'],['questions','可以追問']]){if(fb[key]?.length){el('h4',title,feedback);const ul=el('ul','',feedback);fb[key].forEach(t=>el('li',t,ul));}}el('p',`最小行動：${fb.next_action}`,feedback);el('p','AI 建議不是使用者證據，也不是成績。請自行確認、補充觀察，不可直接當成事實。',feedback);}
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
  if(row?.status==='submitted'&&sameAnswers(row.card,snapshot)){
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
 }finally{saving=false;refreshJourney();}
}
const moreBox=el('details','',workspace);moreBox.className='card-more';el('summary','更多（檢查進度、下載內容）',moreBox);
button('檢查目前進度',()=>checks(false),moreBox);button('儲存草稿',()=>saveWithAuto());const submitButton=button('正式提交',submitCard,finalStage);submitButton.className='primary-action';
button('下載目前內容',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeffWeek 2 問題探索與選題\n更新時間：'+new Date().toLocaleString('zh-TW')+'\n'+JSON.stringify(card,null,2)],{type:'text/plain;charset=utf-8'}));a.download='Week2-痛點卡.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);msg.textContent='已產生「Week2-痛點卡.txt」。若沒看到檔案，請查看瀏覽器的下載項目。';},moreBox);
for(const [kind,title]of [['explore','我卡住了，給我探索方向'],['review','檢查我的痛點，取得 AI 建議']])button(title,async(trigger)=>{
 if(autoBusy)throw Error('已有 AI 請求處理中，請稍候。');
 if(confirmOpen)throw Error('已經有一段內容在等你確認，請先按「確認內容」或「取消」。');
 const requestCard=normalize(card),anonymous=aiInput(requestCard,kind,week1Identity);if(privacyRisk(anonymous))throw Error('文字可能含個資，請改成角色代稱後再請 AI 協助。');
 if(!document.querySelector('#week2-privacy').checked)throw Error('請先在 AI 選用區確認文字不含個資。');
 if(kind==='review'&&!checks(true).ok)return;
 if(!await confirmAnonymous(anonymous,false,aiControls,trigger)){msg.textContent='已取消傳送，內容保持不變。';return;}
 if(autoBusy)throw Error('已有 AI 請求處理中，請稍候。');
 autoBusy=true;try{await save('draft',requestCard);msg.textContent='正在取得 AI 建議…';
 const r=await api({action:'ai',kind,card:requestCard,privacy_confirmed:true});if(kind==='review'){lastAutoContent=anonymous;lastAutoFeedback=r.feedback;}showFeedback(r.feedback,r.cached);feedback.scrollIntoView({block:'start'});msg.textContent='AI 建議已顯示，請依真實觀察修訂；仍可直接保存或提交。';
 }finally{autoBusy=false;}
},aiControls);
window.addEventListener('beforeunload',e=>{if(dirty||pendingLocal){e.preventDefault();e.returnValue='';}});
(async()=>{
 if(!session){msg.textContent='請先到學生起點卡輸入學號與班級邀請碼，再回來此頁。';const a=el('a','進入 Week 1 起點卡');a.href='index.html#student';return;}
 try{
 const data=await api({action:'load'});
 if(data.week1?.status!=='submitted'){msg.textContent='你尚未提交 Week 1。請先完成起點卡，提交後即可回來使用 Week 2。';const a=el('a','補交 Week 1');a.href='index.html#student';return;}
 week1Identity=[session.student_id,data.week1.student_name];
 try{autoAuthorized=localStorage.getItem(autoKey())==='enabled';autoToggle.checked=autoAuthorized;}catch{}
 if(autoToggle.checked)autoStatus.textContent='已啟用自動 AI：完整草稿儲存後取得建議，可隨時關閉。';
 row=data.row;version=row?.version??null;card=normalize(row?.card||emptyCard());
 if(!row){card.candidates[0].people=data.week1.affected_user||'';card.candidates[0].context=data.week1.observed_context||'';card.candidates[0].problem=data.week1.observed_problem||'';card.candidates[0].evidence=data.week1.known_fact||'';card.candidates[0].assumption=data.week1.unverified_assumption||'';}
 if(data.week1_feedback?.feedback_json)el('p','Week 1 AI 回饋：'+(data.week1_feedback.feedback_json.overall_feedback||'請返回 Week 1 查看'),priorBody);
 for(const [k,t]of [['observed_problem','問題'],['known_fact','事實'],['unverified_assumption','假設']])el('p',`${t}：${data.week1[k]||'尚未填寫'}`,priorBody);
 const a=el('a','修改 Week 1（保留原版本）',priorBody);a.href='index.html#student';
 for(const v of data.versions||[]){const d=el('details','',historyList);el('summary',`Week ${v.week} · 版本 ${v.version} · ${new Date(v.created_at).toLocaleString('zh-TW')}`,d);el('pre',JSON.stringify(v.snapshot,null,2),d);}
 try{const savedUndo=JSON.parse(localStorage.getItem(undoKey())||'null');if(Array.isArray(savedUndo)&&savedUndo.length){revisionUndo=savedUndo;undoButton.hidden=false;}}catch{}
 card.mode=adoptPacing(card.mode);
 try{remembered=JSON.parse(localStorage.getItem(progressKey(session))||'null');}catch{}
 if(remembered){activeStage=[...steps.map(x=>x[0]),'2','challenge'].includes(remembered.stage)?remembered.stage:'0';if(activeStage==='2'&&card.candidates.length<3)activeStage='0';if(activeStage==='challenge'&&!showChallenge())activeStage='0';step=Number.isInteger(remembered.question)?remembered.question:0;aiSkipped=remembered.skipped===true;}
 workspace.hidden=false;render();msg.textContent=row?`已恢復版本 ${version} · ${readiness(row)}${row.teacher_note?' · 老師：'+row.teacher_note:''}`:'已帶入 Week 1 觀察，請補充第二個候選題。';
 let local;try{local=JSON.parse(localStorage.getItem(cacheKey())||'null');}catch{}
 if(local&&sameAnswers(local.card,card)){card.mode=adoptPacing(normalize(local.card).mode);render();}
 if(local&&!sameAnswers(local.card,card)){
  pendingLocal=local;workspace.inert=true;refreshJourney();
  const conflict=el('section');conflict.className='video-learning-card';conflict.tabIndex=-1;conflict.setAttribute('role','region');conflict.setAttribute('aria-label','選擇要繼續的草稿');root.insertBefore(conflict,workspace);workspace.hidden=true;
 msg.textContent='答案有兩個版本，請在下方選擇後繼續填寫。原答案均保留。';
  el('h3','本機草稿與雲端不同，請先選擇要接續的版本',conflict);el('p',`本機：${local.savedAt||'時間未記錄'}；雲端：版本 ${version??'尚未保存'}。選擇前不會覆蓋任一份。`,conflict);
  for(const diff of cardDifferences(local.card,card)){const d=el('details','',conflict);el('summary',diff.label,d);el('p','本機：'+(typeof diff.local==='string'?diff.local:JSON.stringify(diff.local)),d);el('p','雲端：'+(typeof diff.cloud==='string'?diff.cloud:JSON.stringify(diff.cloud)),d);}
  const choose=useLocal=>{
   if(!useLocal){try{localStorage.setItem(cacheKey()+'-backup',JSON.stringify(local));localStorage.removeItem(cacheKey());}catch{msg.textContent='無法保留本機備份，請先下載本機草稿再選擇。';return;}}
   if(useLocal){card=normalize(local.card);dirty=true;}
   pendingLocal=null;workspace.inert=false;workspace.hidden=false;conflict.remove();render();
   if(useLocal)localSave();else{msg.textContent='已選用雲端內容；原本機草稿另留本裝置備份。';addBackupDownload();}
  };
  button('繼續本機草稿',()=>choose(true),conflict);button('使用雲端內容，保留本機備份',()=>choose(false),conflict);
 conflict.focus({preventScroll:true});conflict.scrollIntoView({block:'start'});
 }
 addBackupDownload();
 if(remembered){welcome.hidden=false;el('h3','歡迎回來',welcome);el('p',`你上次停在「${steps.find(x=>x[0]===activeStage)?.[1]||'選填探索'}」。${pendingLocal?'請先比較本機與雲端內容。':dirty?'有本機修改未同步。':row?`雲端版本 ${version} · ${readiness(row)}`:'尚未保存至雲端。'} 下一步可繼續上次進度，或查看步驟缺項。位置僅在同裝置、同瀏覽器恢復。`,welcome);
  button('繼續上次進度',()=>{welcome.hidden=true;if(['guided','standard','challenge'].includes(remembered.mode)){const next=adoptPacing(remembered.mode);if(card.mode!==next){card.mode=next;localSave();}}goStage(activeStage);qFocus();},welcome);button('查看全部步驟',()=>{journey.scrollIntoView({block:'center'});stageButtons.get('0').focus();},welcome);
 }
 refreshJourney();
 const fb=data.feedback?.find(x=>x.state==='complete');if(fb){showFeedback(fb.feedback,true);if(fb.submission_version!==version)el('p','此建議來自較早版本，請依目前內容重新判讀。',feedback);}
 }catch(e){msg.textContent=`${e.message} 你仍可閱讀本週藍圖與下載教材。`;}
})();
}
