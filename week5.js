import {FIVE_QUESTIONS,OPP_KEYS,MAX_SCORE,PAGE_TITLES,emptyWeek5,normalizeWeek5,totals,topChoice,choiceNeedsReason,week5Progress,buildPrompt5,parseRebuttal,draftPage,TOOLS5,toolUrl5,rebuttalNext} from './week5-core.mjs?v=20261104-rb';
import {labelText,classDate,CLASS_SCHEDULE,WRITE_OPEN_LABEL,noteDraftHtml} from './week4-core.mjs?v=20261030-qai';
import {buildNoteDraftV2,buildTalkScript,talkChars} from './note-v2.mjs?v=20261105-mt';
import {showRelogin} from './relogin.mjs?v=20261025-w5';
import {mountPreclass} from './preclass-ui.mjs?v=20261025-w5';
// 課前預習三題：沒登入也能做，不存。
mountPreclass(document.querySelector('#week-five-materials .preclass'),5,{});
// Week 5 三個機會比一比：課堂兩題 → 三個機會（從 Week 4 卡 3 帶出）→ 3×5 計分表（每格 0／1／2＋一句證據）→ 選一個（非最高分要理由）
// → AI 反方三回合（Claude）→ 一頁六段「為什麼這是好的商業痛點」。一直開著、沒有截止；每次存，伺服器替有變動的欄位蓋章。
const root=document.querySelector('#week-five');
if(root&&new URLSearchParams(location.search).get('week')==='5'){
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
let data=emptyWeek5(),row=null,questions=null,seedOpps=['','',''],hasCards=false,dirty=false,saving=false,timer=null,expired=false;
const el=(tag,text,parent=root,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const msg=el('p','正在載入你的比較頁…');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');msg.className='w4-msg';
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok){const e=Error(b.error||`連線失敗 ${r.status}`);e.status=r.status;e.body=b;if(r.status===401)onExpired();throw e;}return b;}
function onExpired(){if(expired)return;expired=true;showRelogin(root,'week5',msg);msg.textContent=dirty?'你剛打的內容還沒存進雲端：重新進入前請先複製起來。':'';}

// ---- 工具（反方預設 Claude：比較不會誤拒答、也比較會真的反駁；記在這台裝置）----
const TOOL_KEY='sjl-ai-tool-w5';
const getTool=()=>{try{return localStorage.getItem(TOOL_KEY)||'claude';}catch{return 'claude';}};
const setTool=t=>{try{localStorage.setItem(TOOL_KEY,t);}catch{}};
// 先在點擊當下用同步 execCommand 複製，再用 clipboard API 補一次（11/5：app 內嵌瀏覽器先開分頁再非同步複製會失敗，貼出來是舊的剪貼簿）。
function copySync(t){const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();ta.setSelectionRange(0,t.length);let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;}
async function copyText(t){const ok=copySync(t);try{await navigator.clipboard.writeText(t);return true;}catch{return ok;}}
function showPrompt(sec,prompt,open=false){let d=sec.querySelector('.w4-prompt');if(!d){d=document.createElement('details');d.className='w4-prompt';const s=document.createElement('summary');s.textContent='看 app 幫你問了 AI 什麼（貼不出來時用）';d.append(s);const pre=document.createElement('textarea');pre.rows=6;pre.readOnly=true;pre.setAttribute('aria-label','這次複製給 AI 的問題');d.append(pre);const again=document.createElement('button');again.type='button';again.className='button-link w4-small';again.textContent='⌘V 貼出來是空的？按這裡再複製一次';const st=document.createElement('span');st.className='w4-copied';again.addEventListener('click',async()=>{const ok=await copyText(pre.value);st.textContent=ok?'已複製，到 AI 工具按 ⌘V':'這個瀏覽器不讓網頁複製：請在上面的框按 ⌘A 全選、⌘C';});d.append(again,st);sec.append(d);}d.querySelector('textarea').value=prompt;if(open)d.open=true;}
async function openTool(prompt,btn,tool,keep){
 const t=tool||getTool();if(!keep)setTool(t);
 // 先同步開新分頁再等複製：手機 Safari 在 await 之後開分頁會被當成彈出視窗擋掉（10/30 課堂：按了沒反應）。
 const cp=copyText(prompt);
 window.open(toolUrl5(t,prompt),'_blank','noopener');
 const ok=await cp;
 const td=TOOLS5.find(x=>x[0]===t)||TOOLS5[0],name=td[1],prefill=td[3];
 if(prefill)msg.textContent=ok?`已開 ${name}，問題已帶進輸入框（也複製了一份）。`:`已開 ${name}，問題已帶進輸入框。`;
 else msg.textContent=ok?`已開 ${name}。${name} 打開會是空的，這是正常的：問題已經複製好了，到 ${name} 的輸入框按 ⌘V（Windows：Ctrl+V）再送出。`:`已開 ${name}；複製失敗，請把下面的問題全選複製。`;
 showPrompt(btn.closest('section')||page,prompt,!prefill||!ok);
 near(btn,msg.textContent);
}
// 狀態訊息也顯示在按鈕旁邊：頁面頂端那行在手機上看不到，學生以為按了沒反應。
function near(btn,text){let p=btn.parentElement.querySelector(':scope > .w4-near');if(!p){p=document.createElement('p');p.className='w4-hint w4-near';p.setAttribute('role','status');btn.parentElement.append(p);}p.textContent=text;}

// ---- 畫面 ----
const page=el('div','',root,'w4 w5');
const head=el('div','',page,'w4-head');
el('p','WEEK 5 · 三個機會比一比（個人）',head,'eyebrow');
el('h1','五問計分、反方三回合，選最值得創業的一個',head);
el('p','Week 4 的三個機會，每個對五個問題打 0／1／2 分，每一格要有一句證據（來自卡 1／卡 2 貼回的東西）。最高分的那個交給 AI 反方拒絕三回合，最後寫一頁「為什麼這是好的商業痛點」。這一頁加 Week 4 筆記就是期中報告。',head,'w4-lead');
const rule=el('p','',head,'w4-rule');

// 課堂兩題
const quiz=el('section','',page,'w4-quiz');
const quizHead=el('div','',quiz,'w4-quiz-head');el('h2','課堂兩題',quizHead);const quizWhen=el('span','',quizHead,'w4-quiz-when');
el('p','上課時段內答完就算出席；之後還是可以答，但標「課後」、不算出席。答完可以按「讓 AI 評我的答案」，評語直接出現在答案下面（選填、不計分、每題 3 次）。',quiz,'w4-hint');
const qBlocks={};
for(const k of ['q1','q2']){
 const b=el('div','',quiz,'w4-q');const title=el('p','',b,'w4-q-title');
 const ta=el('textarea','',b);ta.rows=2;ta.maxLength=600;ta.placeholder='寫一到兩句';ta.setAttribute('aria-label',k==='q1'?'第一題答案':'第二題答案');
 const row2=el('div','',b,'w4-row');const btn=el('button','讓 AI 評我的答案',row2,'button-link w4-small');btn.type='button';
 const ai=el('textarea','',b,'w4-ai');ai.rows=2;ai.maxLength=400;ai.placeholder='按「讓 AI 評我的答案」，評語會出現在這裡（不計分）';ai.setAttribute('aria-label',k==='q1'?'第一題 AI 評語':'第二題 AI 評語');
 const stamp=el('div','',b,'w4-stamp');
 // 10/30 起：課堂兩題的 AI 評語直接在 app 裡回（伺服器用已存的答案問模型，評語寫進下面那格）；想自己問的人保留「自己用 Gemini 問」。
 const own=el('button','自己用 Gemini 問',row2,'button-link w4-small w4-own');own.type='button';
 own.addEventListener('click',async()=>{if(!ta.value.trim()){near(own,'先在上面的框寫下你的答案，再按「自己用 Gemini 問」。');ta.focus();return;}await openTool(buildPrompt5(k,snapshot(),questions),btn,'gemini',true);});
 btn.addEventListener('click',async()=>{
  if(!ta.value.trim()){msg.textContent='先寫下你的答案，再讓 AI 評。';near(btn,msg.textContent);return;}
  if(locked||btn.disabled)return;
  btn.disabled=true;const label=btn.textContent;btn.textContent='AI 看你的答案中…';near(btn,'先幫你存答案，再請 AI 看（約 5–15 秒）。');
  try{
   for(let i=0;i<20&&saving;i++)await new Promise(r=>setTimeout(r,150));
   if(dirty||!row){clearTimeout(timer);await save(true);}
   if(dirty||!row)throw Error('答案還沒存好，請再按一次。');
   let r;try{r=await api({action:'class_q_ai',week:5,q:k});}catch(e){if(e.status===409&&e.body?.retry)r=await api({action:'class_q_ai',week:5,q:k});else throw e;}
   row=r.row;data[`${k}_ai`]=r.feedback;ai.value=r.feedback;
   near(btn,`AI 評語放在下面那格了（不計分；這題還能再問 ${Math.max(0,r.limit-r.used)} 次）。改好答案記得存。`);
  }catch(e){if(e.status!==401)near(btn,e.message||'AI 暫時沒有回應，請再按一次。');}
  finally{btn.disabled=false;btn.textContent=label;}
 });
 qBlocks[k]={title,ta,ai,stamp};
}

// 三個機會（從 Week 4 卡 3 帶出；可改字）
const oppSec=el('section','',page,'w4-sec');
const oppHead=el('div','',oppSec,'w4-sec-head');el('span','1',oppHead,'w4-n');el('h2','我的三個機會',oppHead);
const oppHint=el('p','從 Week 4 卡 3 帶出。一句話：誰的哪個困難 → 第一個付錢的人。可以改字；空的就回 Week 4 補。',oppSec,'w4-hint');
const oppInputs=OPP_KEYS.map((k,n)=>{const row=el('div','',oppSec,'w5-opp');el('b',k,row,'w5-opp-k');const inp=el('input','',row);inp.type='text';inp.maxLength=200;inp.placeholder=`機會 ${k}：誰的哪個困難 → 第一個付錢的人`;inp.setAttribute('aria-label',`機會 ${k}`);inp.addEventListener('input',()=>{data.opps[n]=inp.value;touch();renderScores();});return inp;});
const oppStamp=el('div','',oppSec,'w4-stamp');
const oppBack=el('a','回 Week 4 卡 3 補三個機會 →',oppSec,'button-link w4-small');oppBack.href='week.html?week=4#card';oppBack.hidden=true;

// 計分表：一題一區，每題三列（A／B／C）：0／1／2 三顆鍵＋一句證據
const scSec=el('section','',page,'w4-sec');
const scHead=el('div','',scSec,'w4-sec-head');el('span','2',scHead,'w4-n');el('h2','五問計分表',scHead);
el('p','每一格先按 0／1／2，再寫一句證據（貼卡 1 或卡 2 裡的那一句，或寫「估計」）。沒證據的格只能打 0 或標「估計」；老師看的是證據，不是分數。',scSec,'w4-hint');
const cells={};
for(const q of FIVE_QUESTIONS){
 const box=el('div','',scSec,'w5-q');
 const t=el('div','',box,'w5-q-title');el('b',`${q.n}. ${q.title}`,t);el('span',q.ask,t,'w5-q-ask');
 // 0／1／2 的意思一直顯示（不用點開），出處才收在 details 裡
 const lg=el('div','',box,'w5-legend');q.levels.forEach((s,i)=>{const c=el('span','',lg,'w5-lg');el('b',String(i),c);c.append(' '+s);});
 const lv=el('details','',box,'w5-levels');el('summary','理論出處',lv);el('p',q.theory,lv,'w5-theory');
 for(const k of OPP_KEYS){
  const row=el('div','',box,'w5-cell');el('b',k,row,'w5-opp-k');
  const btns=el('div','',row,'w5-score');
  const bs=[0,1,2].map(v=>{const b=el('button',String(v),btns,'w5-sbtn');b.type='button';b.setAttribute('aria-label',`機會 ${k} 第 ${q.n} 問 ${v} 分`);b.title=`${v} 分＝${q.levels[v]}`;b.addEventListener('click',()=>{const c=data.scores[k][q.key];c.score=c.score===v?null:v;touch();renderScores();});return b;});
  const ev=el('input','',row);ev.type='text';ev.maxLength=240;ev.placeholder='一句證據（來源：卡 1／卡 2 的哪一句）或「估計」';ev.setAttribute('aria-label',`機會 ${k} 第 ${q.n} 問 證據`);
  ev.addEventListener('input',()=>{data.scores[k][q.key].evidence=ev.value;touch();renderScores(false);});
  cells[k+q.key]={bs,ev,row};
 }
}
const totalBox=el('div','',scSec,'w5-totals');
const scStamp=el('div','',scSec,'w4-stamp');

// 選一個
const chSec=el('section','',page,'w4-sec');
const chHead=el('div','',chSec,'w4-sec-head');el('span','3',chHead,'w4-n');el('h2','選一個',chHead);
const chHint=el('p','',chSec,'w4-hint');
const chRow=el('div','',chSec,'w4-row w5-choice');
const chRadios=OPP_KEYS.map(k=>{const l=el('label','',chRow);const r=el('input','',l);r.type='radio';r.name='w5-choice';r.value=k;l.append(' 機會 '+k);r.addEventListener('change',()=>{if(r.checked){data.choice.key=k;touch();renderChoice();}});return r;});
const reasonBox=el('div','',chSec,'w5-reason');reasonBox.hidden=true;
el('p','你選的不是最高分的那個——可以，但要寫一段理由（至少 20 字）：為什麼分數低的反而更值得做？哪一問你覺得計分表沒量到？',reasonBox,'w4-hint');
const reason=el('textarea','',reasonBox);reason.rows=3;reason.maxLength=600;reason.placeholder='例：機會 B 分數低是因為「為什麼是現在」只有 1 分，但我接觸得到第一個付錢的人，而且……';reason.setAttribute('aria-label','選非最高分的理由');
reason.addEventListener('input',()=>{data.choice.reason=reason.value;touch();renderChoice();});
const chStamp=el('div','',chSec,'w4-stamp');

// AI 反方三回合
const rbSec=el('section','',page,'w4-sec w4-askcard');
const rbHead=el('div','',rbSec,'w4-sec-head');el('span','4',rbHead,'w4-n');el('h2','AI 反方：撐了十年的老闆拒絕三回合',rbHead);
el('p','把你選的機會和五格證據帶給 AI，它扮演「做這一行十年、不想花錢的老闆」，每回合給一個拒絕理由、等你回應。你要用證據回，不是用形容詞。三回合後它會給一段總結。',rbSec,'w4-hint');
// 11/4：反方三回合直接在 app 裡跟 AI 老闆對話（手機也能用）；舊的「複製問題、開外部 AI、貼回紀錄」放在下面當備用。
const rbApp=el('div','',rbSec,'w5-rb-app');
el('p','',rbApp,'w5-rb-app-title').innerHTML='<b>在 app 裡跟 AI 老闆過三回合</b>（建議，手機也能用；每人最多 8 次）';
const rbAppRow=el('div','',rbApp,'w4-row');const rbAppBtn=el('button','開始反方：請 AI 老闆給第 1 個拒絕',rbAppRow,'primary w5-rb-go');rbAppBtn.type='button';
const rbReplyBox=el('div','',rbApp,'w5-rb-reply');rbReplyBox.hidden=true;
const rbReplyLabel=el('p','',rbReplyBox,'w4-hint');
const rbReplyTa=el('textarea','',rbReplyBox);rbReplyTa.rows=3;rbReplyTa.maxLength=800;rbReplyTa.placeholder='用證據回：數字、來源、你訪談到的事。回不出來就老實寫「這一題我沒證據」。';rbReplyTa.setAttribute('aria-label','我的回應');
const rbReplyBtn=el('button','送出我的回應',rbReplyBox,'primary');rbReplyBtn.type='button';
const rbAppNote=el('p','',rbApp,'w4-hint w4-near');rbAppNote.setAttribute('role','status');
el('p','或者用外部 AI（舊方式）：',rbSec,'w4-hint');
function rbRefresh(){
 const n=rebuttalNext(data.rebuttal.text);rbReplyBox.hidden=n.step!=='reply';rbAppBtn.hidden=n.step==='reply'||n.step==='done';
 if(n.step==='reject')rbAppBtn.textContent=n.n===1?'開始反方：請 AI 老闆給第 1 個拒絕':`請 AI 老闆給第 ${n.n} 個拒絕`;
 if(n.step==='summary')rbAppBtn.textContent='三回合完成：請 AI 老闆總結';
 if(n.step==='reply')rbReplyLabel.textContent=`我的回應 ${n.n}（回應上面老闆第 ${n.n} 回合的拒絕）`;
 if(n.step==='done')rbAppNote.textContent='✅ 三回合與總結都完成了，紀錄已存。總結裡「最該補的證據」就是你期中前要做的事。';
}
async function rbAsk(){
 if(locked)return;
 if(!week5Progress(snapshot()).choice){rbAppNote.textContent='先在上面選一個機會，反方才知道要拒絕哪一個。';chSec.scrollIntoView({block:'center'});return;}
 rbAppBtn.disabled=true;rbReplyBtn.disabled=true;rbAppNote.textContent='AI 老闆在想怎麼拒絕你…（約 5–15 秒）';
 try{
  for(let i=0;i<20&&saving;i++)await new Promise(r=>setTimeout(r,150));
  if(dirty||!row){clearTimeout(timer);await save(true);}
  if(dirty||!row)throw Error('內容還沒存好，請再按一次。');
  let r;try{r=await api({action:'rebuttal_ai'});}catch(e){if(e.status===409&&e.body?.retry)r=await api({action:'rebuttal_ai'});else throw e;}
  row=r.row;data.rebuttal=normalizeWeek5(row.data).rebuttal;rbTa.value=data.rebuttal.text;rbRadios.forEach(x=>x.checked=x.value===data.rebuttal.source);renderRounds();renderStamps();renderProgress();
  rbAppNote.textContent=r.next?.step==='done'?'':(r.next?.step==='reply'?`老闆說話了（看上面「第 ${r.next.n} 回合」）。用證據回他。`:'');
 }catch(e){if(e.status!==401)rbAppNote.textContent=e.message||'AI 老闆暫時沒有回應，請再按一次。';}
 finally{rbAppBtn.disabled=false;rbReplyBtn.disabled=false;rbRefresh();}
}
rbAppBtn.addEventListener('click',rbAsk);
rbReplyBtn.addEventListener('click',async()=>{
 const n=rebuttalNext(data.rebuttal.text);const v=rbReplyTa.value.replace(/\s+/g,' ').trim();
 if(n.step!=='reply')return;if(!v){rbAppNote.textContent='先寫你的回應（回不出來就寫「這一題我沒證據」）。';return;}
 data.rebuttal.text=`${data.rebuttal.text.trim()}\n我的回應 ${n.n}：${v}`;rbTa.value=data.rebuttal.text;rbReplyTa.value='';dirty=true;renderRounds();
 await rbAsk();
});
const rbRow=el('div','',rbSec,'w4-row');
const rbBtn=el('button','複製問題、開 AI 反方',rbRow,'primary w4-go');rbBtn.type='button';
const toolSel=el('select','',rbRow,'w4-tool');for(const [v,label] of TOOLS5){const o=el('option',label,toolSel);o.value=v;}toolSel.value=getTool();toolSel.setAttribute('aria-label','反方用哪個 AI');toolSel.title='建議 Claude：比較不會誤拒答，也比較會真的反駁。Gemini／Copilot 打開是空的，要按 ⌘V';toolSel.addEventListener('change',()=>setTool(toolSel.value));
const rbSteps=el('ol','',rbSec,'w4-steps');
for(const t of ['按上面的按鈕：問題已複製、AI 已打開（ChatGPT／Claude 會自動帶入；Gemini／Copilot 要按 ⌘V）','跟它來三回合：它拒絕，你用證據回；回不出來就老實寫「這一題我沒證據」','第三回合後它會輸出【反方紀錄】：按回答下方的「複製」，回到這一頁在下面的框按 ⌘V'])el('li',t,rbSteps);
const rbTa=el('textarea','',rbSec);rbTa.rows=6;rbTa.maxLength=6000;rbTa.placeholder='貼回整份【反方紀錄】（拒絕 1～3、我的回應 1～3、總結）';rbTa.setAttribute('aria-label','反方紀錄 貼回');
const rbSrcRow=el('div','來源：',rbSec,'w4-src');
const rbRadios=[['claude','Claude'],['gpt','GPT'],['gemini','Gemini'],['copilot','Copilot']].map(([v,label])=>{const l=el('label','',rbSrcRow);const r=el('input','',l);r.type='radio';r.name='w5-rb-src';r.value=v;l.append(label);r.addEventListener('change',()=>{if(r.checked){data.rebuttal.source=v;touch();}});return r;});
const rbParsed=el('div','',rbSec,'w5-rounds');rbApp.insertBefore(rbParsed,rbReplyBox);// 對話放在 app 內反方區（回應框正上方），手機不用往下捲過舊方式
const rbStamp=el('div','',rbSec,'w4-stamp');
rbTa.addEventListener('input',()=>{data.rebuttal.text=rbTa.value;if(!data.rebuttal.source){const d=getTool();data.rebuttal.source=d==='gemini'||d==='copilot'||d==='gpt'?d:'claude';rbRadios.forEach(r=>r.checked=r.value===data.rebuttal.source);}touch();renderRounds();rbRefresh();});
rbBtn.addEventListener('click',async()=>{const p=week5Progress(snapshot());if(!p.choice){msg.textContent='先在上面選一個機會，反方才知道要拒絕哪一個。';chSec.scrollIntoView({block:'center'});return;}await openTool(buildPrompt5('rebuttal',snapshot()),rbBtn,toolSel.value);});

// 一頁六段
const pgSec=el('section','',page,'w4-sec');
const pgHead=el('div','',pgSec,'w4-sec-head');el('span','5',pgHead,'w4-n');el('h2','一頁：為什麼這是好的商業痛點',pgHead);
el('p','六段，照五問的順序，每段一句主張、一個證據（附來源）、一個理論名；最後一段寫反方說了什麼、你怎麼回。先按「用計分表填草稿」，再把每段改成完整的句子。這一頁加 Week 4 研究筆記就是期中報告。',pgSec,'w4-hint');
const draftRow=el('div','',pgSec,'w4-row');const draftBtn=el('button','用計分表的證據填草稿（只填空的段）',draftRow,'button-link w4-small w5-draft');draftBtn.type='button';
const pgTas=PAGE_TITLES.map((t,i)=>{const b=el('div','',pgSec,'w5-para');el('b',`${i+1}. ${t}`,b);const ta=el('textarea','',b);ta.rows=3;ta.maxLength=800;ta.placeholder=i===5?'反方三回合裡最有力的一個拒絕是什麼、你用什麼證據回、哪一題你回不出來':'一句主張＋一個證據（來源：XX）＋一個理論名';ta.setAttribute('aria-label',`第 ${i+1} 段：${t}`);ta.addEventListener('input',()=>{data.page[i]=ta.value;touch();});return ta;});
const pgStamp=el('div','',pgSec,'w4-stamp');
draftBtn.addEventListener('click',()=>{const d=draftPage(snapshot());d.forEach((v,i)=>{if(!pgTas[i].value.trim()){pgTas[i].value=v;data.page[i]=v;}});touch();msg.textContent='草稿填好了：把每段改成完整的句子，證據後面補（來源：XX）。';});

// 存檔與完成狀態
const foot=el('div','',page,'w4-foot');
const saveBtn=el('button','存',foot,'primary w4-save');saveBtn.type='button';
el('p','離開會自動存草稿。期中（11/13）要交的 PDF＝Week 4 研究筆記 v1 ＋ 這一頁；研究筆記 v2 範本在「學習藍圖與教材」。',foot,'w4-hint');
const prog=el('p','',foot,'w4-prog');
const done=el('div','',foot,'w4-done');done.hidden=true;
const doneTitle=el('p','',done,'w4-done-title');const doneBody=el('p','',done);
// 研究筆記 v2 草稿（跟 Week 4 一樣）：按一下把 Week 4 研究頁＋這一頁排進 v2 範本的九段，可以複製全文或下載成 Word；空白範本保留。
const nvBox=el('div','',done,'w4-draft');
const nvBtn=el('button','把我的研究頁＋比較頁整理成研究筆記 v2 草稿（期中用）',nvBox,'primary-link w4-draft-btn');nvBtn.type='button';
el('p','會把 Week 4 的痛、產業線、卡 1（錢流）、卡 2（挑戰與來源）和這一頁的三個機會、五問計分、選擇、一頁六段、反方紀錄，排進 v2 範本的九段。內容一樣存在雲端；草稿是給你改寫成期中報告用的。',nvBox,'w4-hint');
const nvOut=el('div','',nvBox,'w4-draft-out');nvOut.hidden=true;
const nvTa=el('textarea','',nvOut);nvTa.rows=14;nvTa.readOnly=true;nvTa.setAttribute('aria-label','研究筆記 v2 草稿');
const nvRow=el('div','',nvOut,'w4-row');
const nvCopy=el('button','複製全文',nvRow,'button-link');nvCopy.type='button';
const nvWord=el('button','下載成 Word（可用 Word／Pages／Google 文件開）',nvRow,'button-link');nvWord.type='button';
const nvNote=el('p','',nvOut,'w4-hint');nvNote.setAttribute('role','status');
nvBtn.addEventListener('click',async()=>{
 nvBtn.disabled=true;nvNote.textContent='';
 let w4={};try{const r4=await api({action:'week4_load'});w4=r4.row?.data||{};}catch(e){if(e.status===401){nvBtn.disabled=false;return;}nvNote.textContent='Week 4 研究頁讀不到（'+(e.message||'連線失敗')+'），草稿先只放這一頁的內容。';}
 nvTa.value=buildNoteDraftV2(w4,snapshot(),session?.student_id||'');nvOut.hidden=false;nvBtn.disabled=false;
 if(!nvNote.textContent)nvNote.textContent='草稿好了：可以複製貼到 Google 文件／Word，或直接下載。改成自己的句子、補來源，存成 PDF 交到 TronClass。';
 nvOut.scrollIntoView({block:'nearest'});
});
nvCopy.addEventListener('click',async()=>{const ok=await copyText(nvTa.value);if(!ok){nvTa.readOnly=false;nvTa.focus();nvTa.select();}nvNote.textContent=ok?'已複製。到 Google 文件或 Word 貼上（手機：長按→貼上）。':'自動複製失敗：文字已全選，請按「拷貝」。';});
nvWord.addEventListener('click',()=>{const blob=new Blob(['\ufeff'+noteDraftHtml(nvTa.value).replace('<title>Week 4 研究筆記 v1</title>','<title>研究筆記 v2（期中報告）</title>')],{type:'application/msword'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Week5_research_note_v2${session?.student_id?'_'+session.student_id:''}.doc`;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);nvNote.textContent='已下載。iPhone：在預覽畫面按「分享」→ 選 Word／Pages／Google 文件；Android：在「下載」資料夾。';});
// 期中（11/13）：交什麼＋2 分鐘講稿。講稿跟 v2 草稿一樣用 Week 4＋這一頁的資料先排好四段，學生再改成自己的話。
const mtBox=el('div','',done,'w4-draft w5-midterm');
el('p','期中（11/13）要交兩件事',mtBox,'w4-done-title');
el('p','① PDF：按上面的「研究筆記 v2 草稿」，改成自己的句子、補來源，存成 PDF，11/13 13:00 前交到 TronClass。② 上台 2 分鐘：11/13 13:00–17:00 課堂上依學號順序上台，用下面的講稿練習。完整說明在 Week 7 頁。',mtBox,'w4-hint');
const mtRow0=el('div','',mtBox,'w4-row');
const mtBtn=el('button','幫我排 2 分鐘口頭報告講稿',mtRow0,'primary-link w4-draft-btn');mtBtn.type='button';
const w7Link=el('a','看 Week 7 期中說明',mtRow0,'button-link');w7Link.href='week.html?week=7';
const mtOut=el('div','',mtBox,'w4-draft-out');mtOut.hidden=true;
const mtTa=el('textarea','',mtOut);mtTa.rows=14;mtTa.setAttribute('aria-label','2 分鐘講稿');
const mtCount=el('p','',mtOut,'w4-hint');
const mtRow=el('div','',mtOut,'w4-row');
const mtCopy=el('button','複製講稿',mtRow,'button-link');mtCopy.type='button';
const mtWord=el('button','下載成 Word',mtRow,'button-link');mtWord.type='button';
const mtNote=el('p','',mtOut,'w4-hint');mtNote.setAttribute('role','status');
const mtCountNow=()=>{const n=talkChars(mtTa.value);mtCount.textContent=`講稿約 ${n} 字，照中文一分鐘約 220–250 字算，大約 ${Math.round(n/235*60)} 秒。${n>480?'超過 2 分鐘了，刪掉一些。':''}`;};
mtTa.addEventListener('input',mtCountNow);
mtBtn.addEventListener('click',async()=>{
 mtBtn.disabled=true;mtNote.textContent='';
 let w4={};try{const r4=await api({action:'week4_load'});w4=r4.row?.data||{};}catch(e){if(e.status===401){mtBtn.disabled=false;return;}mtNote.textContent='Week 4 研究頁讀不到（'+(e.message||'連線失敗')+'），講稿先只放這一頁的內容。';}
 mtTa.value=buildTalkScript(w4,snapshot(),session?.student_id||'');mtOut.hidden=false;mtBtn.disabled=false;mtCountNow();
 if(!mtNote.textContent)mtNote.textContent='講稿好了：〔＿＿＿〕是要你自己補的地方。可以直接在框裡改；這個框不會存進雲端，改好請複製或下載。';
 mtOut.scrollIntoView({block:'nearest'});
});
mtCopy.addEventListener('click',async()=>{const ok=await copyText(mtTa.value);if(!ok){mtTa.focus();mtTa.select();}mtNote.textContent=ok?'已複製。':'自動複製失敗：文字已全選，請按「拷貝」。';});
mtWord.addEventListener('click',()=>{const blob=new Blob(['\ufeff'+noteDraftHtml(mtTa.value).replace('<title>Week 4 研究筆記 v1</title>','<title>期中 2 分鐘講稿</title>')],{type:'application/msword'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Week7_talk_2min${session?.student_id?'_'+session.student_id:''}.doc`;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);mtNote.textContent='已下載。';});
const doneRow=el('div','',done,'w4-row');const tplLink=el('a','下載空白範本 v2（Word）',doneRow,'button-link');tplLink.href='materials/Week5_研究筆記v2範本.docx?v=20261025';tplLink.setAttribute('download','');
const guideLink=el('a','看講義：五問出處與一頁怎麼寫',doneRow,'button-link');guideLink.href='materials/Week5_講義.pdf?v=20261105';guideLink.target='_blank';guideLink.rel='noreferrer';

function snapshot(){data.q1=qBlocks.q1.ta.value;data.q2=qBlocks.q2.ta.value;data.q1_ai=qBlocks.q1.ai.value;data.q2_ai=qBlocks.q2.ai.value;data.opps=oppInputs.map(i=>i.value);for(const k of OPP_KEYS)for(const q of FIVE_QUESTIONS)data.scores[k][q.key].evidence=cells[k+q.key].ev.value;data.choice.reason=reason.value;data.rebuttal.text=rbTa.value;data.page=pgTas.map(t=>t.value);return normalizeWeek5(data);}
function touch(){dirty=true;saveBtn.textContent='存';clearTimeout(timer);timer=setTimeout(()=>save(true),1800);renderProgress();}
[qBlocks.q1.ta,qBlocks.q2.ta,qBlocks.q1.ai,qBlocks.q2.ai].forEach(x=>x.addEventListener('input',touch));
saveBtn.addEventListener('click',()=>save(false));

// 開放作答前：看得到題目、不能存。全部表單元件反灰、上面一行說明；時間到自動重新載入。
let locked=false;
function applyLock(r){locked=r.write_open===false;if(!locked)return;
 const note=document.createElement('p');note.className='w4-msg w4-lock';note.setAttribute('role','status');note.textContent=`${WRITE_OPEN_LABEL} 開放作答：現在可以先看題目和要做什麼，還不能填、不能存。課前影片和簡報可以先看。`;page.before(note);
 page.querySelectorAll('input,textarea,select,button').forEach(x=>{x.disabled=true;});queueMicrotask(()=>{msg.textContent='';});
 const ms=Date.parse(r.write_open_at||'')-Date.now();if(ms>0&&ms<864e5)setTimeout(()=>location.reload(),ms+1500);}
async function save(auto){
 if(saving||expired||locked||!session?.token)return;
 const snap=snapshot();saving=true;if(!auto)saveBtn.textContent='存檔中…';
 try{
  const r=await api({action:'week5_save',version:row?.version??null,data:snap});
  row=r.row;data=normalizeWeek5(row.data);dirty=false;saveBtn.textContent='已存';renderStamps();renderProgress();
  if(!auto)msg.textContent=`已存（版本 ${row.version}）。`;
 }catch(e){if(e.status===409){msg.textContent=e.message;}else if(e.status!==401)msg.textContent=e.message;saveBtn.textContent='存';}
 finally{saving=false;}
}
function fill(){
 qBlocks.q1.ta.value=data.q1;qBlocks.q2.ta.value=data.q2;qBlocks.q1.ai.value=data.q1_ai;qBlocks.q2.ai.value=data.q2_ai;
 oppInputs.forEach((i,n)=>i.value=data.opps[n]||'');
 for(const k of OPP_KEYS)for(const q of FIVE_QUESTIONS)cells[k+q.key].ev.value=data.scores[k][q.key].evidence;
 chRadios.forEach(r=>r.checked=r.value===data.choice.key);reason.value=data.choice.reason;
 rbTa.value=data.rebuttal.text;rbRadios.forEach(r=>r.checked=r.value===data.rebuttal.source);if(typeof rbRefresh==='function')rbRefresh();
 pgTas.forEach((t,i)=>t.value=data.page[i]||'');
 renderScores();renderChoice();renderRounds();renderStamps();renderProgress();
}
const fmt=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}（${labelText(iso)}）`;};
function renderStamps(){
 const st=row?.stamps||{};
 for(const k of ['q1','q2'])qBlocks[k].stamp.textContent=st[k]?'已存 '+fmt(st[k]):'未存';
 oppStamp.textContent=st.opps?'已存 '+fmt(st.opps):'';scStamp.textContent=st.scores?'已存 '+fmt(st.scores):'未存';
 chStamp.textContent=st.choice?'已存 '+fmt(st.choice):'未存';rbStamp.textContent=st.rebuttal?'已存 '+fmt(st.rebuttal):'未存';pgStamp.textContent=st.page?'已存 '+fmt(st.page):'未存';
}
function renderScores(paintTotals=true){
 const has=OPP_KEYS.map((k,n)=>!!data.opps[n]);
 oppBack.hidden=has.every(Boolean);
 for(const k of OPP_KEYS)for(const q of FIVE_QUESTIONS){const c=cells[k+q.key];const cell=data.scores[k][q.key];c.row.classList.toggle('w5-off',!has[OPP_KEYS.indexOf(k)]);c.bs.forEach((b,v)=>b.setAttribute('aria-pressed',String(cell.score===v)));c.row.classList.toggle('w5-noev',cell.score!==null&&cell.score>0&&!c.ev.value.trim());}
 if(!paintTotals)return;
 const t=totals(data);const top=topChoice(data);
 totalBox.replaceChildren();
 for(const k of OPP_KEYS){const n=OPP_KEYS.indexOf(k);if(!data.opps[n])continue;const b=el('div','',totalBox,'w5-total'+(k===top?' is-top':''));el('b',`機會 ${k}`,b);el('span',`${t[k].sum} / ${MAX_SCORE}`,b,'w5-total-n');el('span',t[k].complete?(t[k].estimated?`${t[k].estimated} 格是估計`:'五格都有證據'):`還有 ${FIVE_QUESTIONS.length-t[k].scored} 格沒打`,b,'w5-total-s');}
 renderChoice();
}
function renderChoice(){
 const top=topChoice(data);
 chHint.textContent=top?`計分表最高分是機會 ${top}。建議選它；選別的也可以，但要寫理由。`:'先把計分表打完，這裡會告訴你最高分是哪一個。';
 chRadios.forEach(r=>{r.checked=r.value===data.choice.key;r.disabled=!data.opps[OPP_KEYS.indexOf(r.value)];});
 const need=choiceNeedsReason(data);reasonBox.hidden=!need;
}
function renderRounds(){
 rbParsed.replaceChildren();const p=parseRebuttal(data.rebuttal.text);if(!p.rounds.length){if(data.rebuttal.text)el('p','貼的內容裡找不到「拒絕 1：」「我的回應 1：」這種格式；沒關係，老師看得到全文。想要整齊一點，請 AI 照【反方紀錄】的格式再整理一次。',rbParsed,'w4-hint');return;}
 for(const r of p.rounds){const b=el('div','',rbParsed,'w5-round');el('b',`第 ${r.n} 回合`,b);el('p','老闆：'+r.reject,b);if(r.reply)el('p','我：'+r.reply,b,'w5-me');}
 if(p.summary)el('p','總結：'+p.summary,rbParsed,'w5-sum');
}
function renderProgress(){
 const p=week5Progress(data);
 prog.textContent=`兩題 ${[p.q1,p.q2].filter(Boolean).length}/2 · 機會 ${p.oppsN}/3 · 計分 ${p.scoredAll?'完成':'未完成'} · 選 ${p.choice||'—'} · 反方 ${p.rounds}/3 · 一頁 ${p.pageN}/6`;
 done.hidden=false;
 if(p.done){done.dataset.state='done';doneTitle.textContent=dirty?'✅ 都填好了，正在存…':'✅ Week 5 比較頁完成，已存雲端。';doneBody.textContent=(p.q1&&p.q2?'':'課堂兩題還沒答（不影響完成，但上課時段內答完才算出席）。')+`你選的是機會 ${p.choice}。下一步：用研究筆記 v2 範本，把 Week 4 的五段＋這一頁六段合成一份 PDF，11/13 上課前交到 TronClass；上課要上台講。`;}
 else{done.dataset.state='todo';doneTitle.textContent=`還沒完成：差 ${p.missing.join('、')}。`;doneBody.textContent='每一格存了就在（離開會自動存草稿）。做完這裡會變成綠色。';}
}
function renderQuestions(){qBlocks.q1.title.textContent='Q1 '+(questions?.q1||'');qBlocks.q2.title.textContent='Q2 '+(questions?.q2||'');}

async function load(){
 const date=classDate(5);rule.textContent=`上課日 ${date?date.slice(5).replace('-','/'):''} ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內答完課堂兩題＝出席。這一頁一直開著、沒有截止；每次存都記時間。`;
 quizWhen.textContent=`上課日 ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內答完＝出席`;
 if(!session?.token){msg.textContent='';page.hidden=true;el('h2','先進入你的班級',root);el('p','用學號和班級邀請碼進入後，比較頁會自動帶出你 Week 4 的三個機會。',root);const a=el('a','前往學生入口 →',root,'primary-link');a.href='index.html#student';return;}
 try{
  const r=await api({action:'week5_load'});
  row=r.row;questions=r.questions;seedOpps=r.seed_opps||['','',''];hasCards=!!r.week4_has_cards;
  data=normalizeWeek5(row?.data||emptyWeek5());
  // 三個機會：本週沒存過就用 Week 4 卡 3 的；存過但某一格空、Week 4 有＝也帶（學生可能在 Week 4 補填）。
  data.opps=data.opps.map((o,n)=>o||seedOpps[n]||'');
  renderQuestions();fill();applyLock(r);
  if(!data.opps.some(Boolean))oppHint.textContent='Week 4 卡 3 還沒有三個機會：先回 Week 4 把卡 3 做完（卡 2 有證據，卡 3 才會打開），這一頁才有東西可以比。';
  else if(!hasCards)oppHint.textContent='Week 4 卡 1／卡 2 還沒貼回：計分表的證據會找不到東西填。建議先回 Week 4 補，再回來打分。';
  msg.textContent=row?'':(data.opps.some(Boolean)?'這一頁已帶出你的三個機會。從計分表開始，每格打分＋一句證據。':'你的 Week 4 卡 3 還沒有三個機會，這一頁先是空的。先回 Week 4 做完三張卡，再回來打分。');
 }catch(e){if(e.status!==401)msg.textContent=e.message;}
}
window.addEventListener('beforeunload',()=>{if(dirty&&!saving)save(true);});
load();
}
