import {INDUSTRY_CARDS,cardById,emptyWeek4,normalizeWeek4,buildPrompt,toolUrl,TOOLS,NOTEBOOKLM_URL,SOURCE_LABEL,labelText,classDate,CLASS_SCHEDULE,week4Progress,rankCards,painPattern,PATTERN_HINTS} from './week4-core.mjs?v=20261020-seg';
import {showRelogin} from './relogin.mjs?v=20261016-prior';
import {mountPreclass} from './preclass-ui.mjs?v=20261020-w4quiz';
// 課前預習三題：沒登入也能做，不存（Week 4 沒有「第一個問題」要存）。
mountPreclass(document.querySelector('#week-four-materials .preclass'),4,{});
// Week 4 第一輪研究頁：課堂兩題 → 選一條產業線 → 三張「問 AI 卡」（同一個形狀：一句要問什麼、一顆鈕、一個貼回框、來源）。
// 一直開著、沒有截止。每次存，伺服器替有變動的欄位蓋時間章；上課時段內＝課中。prompt 由 week4-core 用學生自己的痛與產業組好。
const root=document.querySelector('#week-four');
if(root&&new URLSearchParams(location.search).get('week')==='4'){
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
let data=emptyWeek4(),row=null,questions=null,recommended=[],week3Statement='',dirty=false,saving=false,timer=null,expired=false;
const el=(tag,text,parent=root,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const msg=el('p','正在載入你的研究頁…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');msg.className='w4-msg';
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok){const e=Error(b.error||`連線失敗 ${r.status}`);e.status=r.status;e.body=b;if(r.status===401)onExpired();throw e;}return b;}
function onExpired(){if(expired)return;expired=true;showRelogin(root,'week4',msg);msg.textContent=dirty?'你剛打的內容還沒存進雲端：重新進入前請先複製起來。':'';}

// ---- 工具選擇（記在這台裝置）----
const TOOL_KEY='sjl-ai-tool';
const getTool=()=>{try{return localStorage.getItem(TOOL_KEY)||'gemini';}catch{return 'gemini';}};
const setTool=t=>{try{localStorage.setItem(TOOL_KEY,t);}catch{}};
async function copyText(t){try{await navigator.clipboard.writeText(t);return true;}catch{const ta=document.createElement('textarea');ta.value=t;document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;}}

// ---- 畫面 ----
const page=el('div','',root,'w4');
const head=el('div','',page,'w4-head');
el('p','WEEK 4 · 第一輪研究（個人）',head,'eyebrow');
el('h1','從我的痛看產業，找三個機會',head);
el('p','先答課堂兩題，選一條產業線，然後三張卡：每張都是「按一下開 AI 工具 → 貼回來 → 選來源」。下週拿這三個機會來比。',head,'w4-lead');
const rule=el('p','',head,'w4-rule');
const painBox=el('div','',page,'w4-pain');el('span','我的痛（系統從 Week 3／2／1 帶出，可改）',painBox,'w4-cap');
const painInput=el('textarea','',painBox);painInput.rows=2;painInput.maxLength=300;painInput.placeholder='〔誰〕在〔什麼時候〕因為〔什麼〕而〔付出什麼代價〕';painInput.setAttribute('aria-label','我的痛一句話');
const painStamp=el('div','',painBox,'w4-stamp');
painInput.addEventListener('change',()=>renderCards());

// 課堂兩題
const quiz=el('section','',page,'w4-quiz');
const quizHead=el('div','',quiz,'w4-quiz-head');el('h2','課堂兩題',quizHead);const quizWhen=el('span','',quizHead,'w4-quiz-when');
el('p','上課時段內答完就算出席；之後還是可以答，但標「課後」、不算出席。答完可以按「讓 AI 評我的答案」，貼回一句評語（選填、不計分）。',quiz,'w4-hint');
const qBlocks={};
for(const k of ['q1','q2']){
 const b=el('div','',quiz,'w4-q');const title=el('p','',b,'w4-q-title');
 const ta=el('textarea','',b);ta.rows=2;ta.maxLength=600;ta.placeholder='寫一到兩句';ta.setAttribute('aria-label',k==='q1'?'第一題答案':'第二題答案');
 const row2=el('div','',b,'w4-row');const btn=el('button','讓 AI 評我的答案',row2,'button-link w4-small');btn.type='button';
 const ai=el('input','',row2);ai.type='text';ai.maxLength=400;ai.placeholder='貼回 AI 的一句評語（選填，不計分）';ai.setAttribute('aria-label',k==='q1'?'第一題 AI 評語':'第二題 AI 評語');
 const stamp=el('div','',b,'w4-stamp');
 btn.addEventListener('click',async()=>{if(!ta.value.trim()){msg.textContent='先寫下你的答案，再讓 AI 評。';return;}await openTool(buildPrompt(k,snapshot(),questions),btn);});
 qBlocks[k]={title,ta,ai,stamp};
}

// 選產業線
const indSec=el('section','',page,'w4-sec');
const indHead=el('div','',indSec,'w4-sec-head');el('span','0',indHead,'w4-n');el('h2','選一條產業線',indHead);
const indHint=el('p','依你的痛，最相關的排前面；都不對就看全部，或自己填。',indSec,'w4-hint w4-indhint');
const indWarn=el('p','',indSec,'w4-indwarn');indWarn.hidden=true;
el('p','原題是「早八起不來、記帳、找抽菸的地方、個人搶票」的同學：這四題找不到願意付錢的人，直接從下面改選一條。',indSec,'w4-unusable');
const indList=el('div','',indSec,'w4-cards');
const moreBtn=el('button','看全部 9 條',indSec,'button-link w4-small');moreBtn.type='button';let showAll=false;moreBtn.addEventListener('click',()=>{showAll=!showAll;moreBtn.textContent=showAll?'只看最相關的':'看全部 9 條';renderCards();});
const customRow=el('div','',indSec,'w4-row');const customRadio=el('input','',customRow);customRadio.type='radio';customRadio.name='w4-ind';customRadio.value='custom';customRadio.id='w4-ind-custom';
const customLabel=el('label','或自己填一個產業：',customRow);customLabel.htmlFor='w4-ind-custom';
const customInput=el('input','',customRow);customInput.type='text';customInput.maxLength=40;customInput.placeholder='例：寵物美容';customInput.setAttribute('aria-label','自填產業');
const indStamp=el('div','',indSec,'w4-stamp');
customRadio.addEventListener('change',()=>{if(customRadio.checked){data.industry={card:'custom',custom:customInput.value.trim()};touch();renderCards();}});
customInput.addEventListener('input',()=>{customRadio.checked=true;data.industry={card:'custom',custom:customInput.value.trim()};touch();});
function renderCards(){
 indList.replaceChildren();
 // 先看痛的文字對到哪一條，再看普查；對不到任何一條就直接秀九條，不假裝有推薦。
 const {list,related}=rankCards(painInput.value||data.pain,recommended);
 const best=related?list[0]:null;
 if(related){indHint.textContent=`從你的痛看，最接近的是「${best.card.name}」；不對就看全部，或自己填。`;}
 else{const pt=painInput.value||data.pain;indHint.textContent=pt.trim()?PATTERN_HINTS[painPattern(pt)]:'先在上面寫一句你的痛，系統會把最接近的產業線排前面；也可以直接從下面九條選一條。';}
 const order=list.map(x=>({card:x.card,hits:x.byText?2:(x.hits?1:0),byText:x.byText}));
 const shown=(showAll||!related)?order:order.slice(0,2);
 // 選了跟痛對不上的線：不擋，但提醒；卡 1 的 prompt 也會先要 AI 判斷關不關聯。
 const sel=data.industry.card;const selRank=typeof sel==='number'?list.find(x=>x.card.id===sel):null;
 if(related&&selRank&&selRank.byText===0){indWarn.hidden=false;indWarn.textContent=`提醒：你的痛看起來比較接近「${best.card.name}」，你選的是「${selRank.card.name}」。可以選，但卡 1 的 AI 會先告訴你這個痛跟這一行關不關聯；如果它說關係不大，就回來改選。`;}
 else indWarn.hidden=true;
 for(const {card,hits} of shown){
  const lab=el('label','',indList,'w4-card'+(data.industry.card===card.id?' is-on':''));
  const r=el('input','',lab);r.type='radio';r.name='w4-ind';r.value=String(card.id);r.checked=data.industry.card===card.id;
  const body=el('div','',lab,'w4-card-body');
  const t=el('div','',body,'w4-card-title');el('b',`${card.id} ${card.name}`,t);if(hits)el('span',hits>=2?'從你的痛看最接近':'普查相關',t,'w4-tag');
  el('div',card.sub,body,'w4-card-sub');
  el('div','誰付錢給誰：'+card.payers,body,'w4-card-pay');
  if(card.redline)el('div','紅線：'+card.redline,body,'w4-card-red');
  r.addEventListener('change',()=>{if(r.checked){data.industry={card:card.id,custom:''};customRadio.checked=false;touch();renderCards();}});
 }
 customRadio.checked=data.industry.card==='custom';
}

// 三張卡
const CARDS=[
 ['card1','這一行的錢流與困難','問 AI：這一行誰付錢給誰、業者自己最常說的困難、現在用什麼撐著。追問一次：「哪一個困難是業者最常花錢想解決的？」','複製問題、開我的 AI 工具','把 AI 的回答貼回來（整段或挑重點都可以）',false],
 ['card2','用 NotebookLM 查證','先加 5–8 個來源（政府統計、公會報告、近一年新聞、業者訪談影片、論壇抱怨文），再貼六題問它。每一點要有引用。找來源時用「你的痛那一段」的關鍵字（例：學生租屋、包租代管、室友），不要搜整個產業（例：飯店、民宿）——六題也只問那一段。','複製六題、開 NotebookLM','把有引用的答案貼回來，每點後面留（來源：XX）',true],
 ['card3','要三個機會','把卡 2 的證據一起帶給 AI：請它給三個小團隊能切入的機會，每個寫解誰的哪個困難、第一個會付錢的人、為什麼是現在。','複製問題＋證據、開我的 AI 工具','AI 的完整回答（選填）',false],
];
const cBlocks={};
CARDS.forEach(([k,title,hint,btnText,ph,nb],i)=>{
 const sec=el('section','',page,'w4-sec w4-askcard');
 const h=el('div','',sec,'w4-sec-head');el('span',String(i+1),h,'w4-n');el('h2',title,h);
 el('p',hint,sec,'w4-hint');
 const row2=el('div','',sec,'w4-row');
 const btn=el('button',btnText,row2,'primary w4-go');btn.type='button';
 let toolSel=null;
 if(!nb){toolSel=el('select','',row2,'w4-tool');for(const [v,label] of TOOLS){const o=el('option',label,toolSel);o.value=v;}toolSel.value=getTool();toolSel.setAttribute('aria-label','我的 AI 工具');toolSel.title='Gemini、Copilot 打開是空的，要按 Ctrl+V 貼上；ChatGPT、Claude 會自動帶入問題';toolSel.addEventListener('change',()=>setTool(toolSel.value));}
 const note=el('p',(nb?'六題：這一行多大／誰在賺錢／最常被抱怨的三件事／過去三年什麼變了／有人試過解決嗎／台灣跟國外差在哪。':'問題已用你的痛點和產業填好。工具可以換；查證一律用 NotebookLM。')+' 貼回才算做完：AI 的對話只在你自己的帳號裡，老師看不到；貼回來、標來源，才是你的證據，下一張卡和研究筆記都要用。',sec,'w4-note');
 // 操作步驟寫死在卡上：按鈕只做「複製＋開工具」，貼上、送出、貼回是學生自己的三個動作。
 const steps=el('ol','',sec,'w4-steps');
 for(const t of (nb?['按上面的按鈕：六題已複製、NotebookLM 已打開（先建筆記本；「新增來源」→「網路」用你那一段的關鍵字搜，加 5–8 個）','在 NotebookLM 的對話框按 ⌘V（Windows：Ctrl+V；手機：長按→貼上），一題一題問','每個答案都要有引用；在 NotebookLM 回答下方按「複製」，回到這一頁在下面的框按 ⌘V，每點留（來源：XX）']:['按上面的按鈕：問題已複製、AI 工具已打開（Gemini／Copilot 打開是空的，正常）','在工具的輸入框按 ⌘V（Windows：Ctrl+V；手機：長按→貼上），送出','複製回答：在回答最下面按「複製」圖示（Gemini、ChatGPT 都有；或用滑鼠反白），回到這一頁在下面的框按 ⌘V。整段貼，或只貼最後的【貼回摘要】三行都可以；有數字的句子後面寫出處或「估計」']))el('li',t,steps);
 let opps=null;
 if(k==='card3'){opps=[0,1,2].map(n=>{const inp=el('input','',sec);inp.type='text';inp.maxLength=200;inp.placeholder=`機會 ${'ABC'[n]}：一句話（誰的哪個困難 → 第一個付錢的人）`;inp.className='w4-opp';inp.setAttribute('aria-label',`機會 ${'ABC'[n]}`);inp.addEventListener('input',()=>{data.card3.opps[n]=inp.value;touch();});return inp;});}
 const ta=el('textarea','',sec);ta.rows=4;ta.maxLength=6000;ta.placeholder=ph;ta.setAttribute('aria-label',title+' 貼回');
 const srcRow=el('div','來源：',sec,'w4-src');
 const srcs=nb?[['notebooklm','NotebookLM']]:[['gemini','Gemini'],['gpt','GPT'],['claude','Claude'],['copilot','Copilot'],['notebooklm','NotebookLM']];
 const radios=srcs.map(([v,label])=>{const l=el('label','',srcRow);const r=el('input','',l);r.type='radio';r.name='w4-src-'+k;r.value=v;l.append(label);r.addEventListener('change',()=>{if(r.checked){data[k].source=v;touch();}});return r;});
 const stamp=el('div','',sec,'w4-stamp');
 ta.addEventListener('input',()=>{data[k].text=ta.value;if(!data[k].source){const d=nb?'notebooklm':getTool();data[k].source=d;radios.forEach(r=>r.checked=r.value===d);}touch();});
 btn.addEventListener('click',async()=>{
  const snap=snapshot();
  if(!snap.industry.card||(snap.industry.card==='custom'&&!snap.industry.custom)){msg.textContent='先選一條產業線，問題才能幫你填好。';indSec.scrollIntoView({behavior:'smooth'});return;}
  if(k==='card3'&&!snap.card2.text){msg.textContent='卡 3 要帶著卡 2 的證據問；先把 NotebookLM 的答案貼回卡 2。';return;}
  const prompt=buildPrompt(k,snap,questions);
  if(nb){const ok=await copyText(prompt);window.open(NOTEBOOKLM_URL,'_blank','noopener');msg.textContent=ok?'六題已複製。到 NotebookLM 先加來源，再貼上提問。':'複製失敗，請手動複製下面的問題。';showPrompt(sec,prompt);}
  else await openTool(prompt,btn,toolSel?.value);
 });
 cBlocks[k]={ta,radios,stamp,opps};
});
function showPrompt(sec,prompt,open=false){let d=sec.querySelector('.w4-prompt');if(!d){d=document.createElement('details');d.className='w4-prompt';const s=document.createElement('summary');s.textContent='看 app 幫你問了 AI 什麼';d.append(s);const pre=document.createElement('textarea');pre.rows=6;pre.readOnly=true;pre.setAttribute('aria-label','這次複製給 AI 的問題');d.append(pre);const again=document.createElement('button');again.type='button';again.className='button-link w4-small';again.textContent='再複製一次';const st=document.createElement('span');st.className='w4-copied';again.addEventListener('click',async()=>{const ok=await copyText(pre.value);st.textContent=ok?'已複製，到 AI 工具按 ⌘V':'這個瀏覽器不讓網頁複製：請在上面的框按 ⌘A 全選、⌘C';});d.append(again,st);sec.append(d);}d.querySelector('textarea').value=prompt;if(open)d.open=true;}
async function openTool(prompt,btn,tool){
 const t=tool||getTool();setTool(t);
 const ok=await copyText(prompt);
 window.open(toolUrl(t,prompt),'_blank','noopener');
 const td=TOOLS.find(x=>x[0]===t)||TOOLS[0],name=td[1],prefill=td[3];
 // Gemini／Copilot 沒有「網址帶問題」的功能，開出來一定是空的：問題在剪貼簿裡，要自己貼。ChatGPT／Claude 會直接帶進輸入框。
 if(prefill)msg.textContent=ok?`已開 ${name}，問題已帶進輸入框（也複製了一份）。送出後把回答貼回來。`:`已開 ${name}，問題已帶進輸入框。送出後把回答貼回來。`;
 else msg.textContent=ok?`已開 ${name}。${name} 打開會是空的，這是正常的：問題已經複製好了，到 ${name} 的輸入框按 Ctrl+V（Mac：⌘V；手機：長按→貼上）再送出。`:`已開 ${name}；複製失敗，請把下面的問題全選複製，貼到 ${name}。`;
 showPrompt(btn.closest('section')||page,prompt,!prefill||!ok);
}

// 存檔
const foot=el('div','',page,'w4-foot');
const saveBtn=el('button','存',foot,'primary w4-save');saveBtn.type='button';
el('p','離開會自動存草稿。三張卡都有貼回，下週就能比。講義與課前影片在「學習藍圖與教材」。',foot,'w4-hint');
const prog=el('p','',foot,'w4-prog');

function snapshot(){data.pain=painInput.value;data.q1=qBlocks.q1.ta.value;data.q2=qBlocks.q2.ta.value;data.q1_ai=qBlocks.q1.ai.value;data.q2_ai=qBlocks.q2.ai.value;for(const k of ['card1','card2','card3'])data[k].text=cBlocks[k].ta.value;if(data.industry.card==='custom')data.industry.custom=customInput.value.trim();return normalizeWeek4(data);}
function touch(){dirty=true;saveBtn.textContent='存';clearTimeout(timer);timer=setTimeout(()=>save(true),1800);}
[painInput,qBlocks.q1.ta,qBlocks.q2.ta,qBlocks.q1.ai,qBlocks.q2.ai].forEach(x=>x.addEventListener('input',touch));
saveBtn.addEventListener('click',()=>save(false));
async function save(auto){
 if(saving||expired||!session?.token)return;
 const snap=snapshot();saving=true;if(!auto)saveBtn.textContent='存檔中…';
 try{
  const r=await api({action:'week4_save',version:row?.version??null,data:snap});
  row=r.row;data=normalizeWeek4(row.data);dirty=false;saveBtn.textContent='已存';renderStamps();renderProgress();
  if(!auto)msg.textContent=`已存（版本 ${row.version}）。`;
 }catch(e){if(e.status===409){msg.textContent=e.message;}else if(e.status!==401)msg.textContent=e.message;saveBtn.textContent='存';}
 finally{saving=false;}
}
function fill(){
 painInput.value=data.pain;qBlocks.q1.ta.value=data.q1;qBlocks.q2.ta.value=data.q2;qBlocks.q1.ai.value=data.q1_ai;qBlocks.q2.ai.value=data.q2_ai;
 for(const k of ['card1','card2','card3']){cBlocks[k].ta.value=data[k].text;cBlocks[k].radios.forEach(r=>r.checked=r.value===data[k].source);}
 cBlocks.card3.opps.forEach((inp,n)=>inp.value=data.card3.opps[n]||'');
 if(data.industry.card==='custom')customInput.value=data.industry.custom;
 renderCards();renderStamps();renderProgress();
}
const fmt=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}（${labelText(iso)}）`;};
function renderStamps(){
 const st=row?.stamps||{};
 painStamp.textContent=st.pain?'已存 '+fmt(st.pain):'';
 indStamp.textContent=st.industry?'已存 '+fmt(st.industry):'';
 for(const k of ['q1','q2'])qBlocks[k].stamp.textContent=st[k]?'已存 '+fmt(st[k]):'未存';
 for(const k of ['card1','card2','card3'])cBlocks[k].stamp.textContent=st[k]?'已存 '+fmt(st[k]):'未存';
}
function renderProgress(){const p=week4Progress(data);prog.textContent=`兩題 ${[p.q1,p.q2].filter(Boolean).length}/2 · 產業 ${p.industry?'已選':'未選'} · 三張卡 ${p.cards}/3`;}
function renderQuestions(){qBlocks.q1.title.textContent='Q1 '+(questions?.q1||'');qBlocks.q2.title.textContent='Q2 '+(questions?.q2||'');}

async function load(){
 const date=classDate(4);rule.textContent=`上課日 ${date?date.slice(5).replace('-','/'):''} ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內答完課堂兩題＝出席。這一頁一直開著、沒有截止；每次存都記時間。`;
 quizWhen.textContent=`上課日 ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內答完＝出席`;
 if(!session?.token){msg.textContent='';page.hidden=true;el('h2','先進入你的班級',root);el('p','用學號和班級邀請碼進入後，研究頁會自動帶出你 Week 3 的痛點一句話。',root);const a=el('a','前往學生入口 →',root,'primary-link');a.href='index.html#student';return;}
 try{
  const r=await api({action:'week4_load'});
  row=r.row;questions=r.questions;recommended=r.recommended||[];week3Statement=r.pain_seed||r.week3_statement||'';
  data=normalizeWeek4(row?.data||emptyWeek4());
  if(!row&&!data.pain&&week3Statement)data.pain=week3Statement;
  renderQuestions();fill();
  // 種子來源：Week 3 最好；沒做訪談的人用 Week 2／Week 1 的句子先開始，之後再改成訪談後的版本。
  const seedMsg={week3:'已從 Week 3 帶出你的痛點一句話，可以直接用。',week2:'你還沒有 Week 3 的訪談，先用 Week 2 的痛點陳述開始；之後問到真人再回來改。',week1:'你還沒有 Week 2、3，先用 Week 1 的觀察開始；請把它改成「〔誰〕在〔什麼時候〕因為〔什麼〕而〔付出什麼代價〕」。'}[r.pain_source]||'';
  msg.textContent=row?`已載入（版本 ${row.version}）。`:(seedMsg||'系統找不到你前幾週的句子，先在上面寫一句「〔誰〕在〔什麼時候〕因為〔什麼〕而〔付出什麼代價〕」。');
 }catch(e){if(e.status!==401)msg.textContent=e.message;}
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty)save(true);});
load();
}
