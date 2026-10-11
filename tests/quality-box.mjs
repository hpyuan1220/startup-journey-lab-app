// 三階完成度：提交永遠成功；差哪一件只講那一件；可點選項一點就填進去；老師指路一鍵跳到那一格。
// 先啟動：PORT=4210 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4210';const SID='A1132709'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,tok)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':`第 ${i} 格，校園餐廳觀察。`])),status:'submitted'}});
// 一張「人是我、沒代價、證據是猜的」但其他都填滿的卡 —— 典型只求完成的學生
const weakCard={mode:'standard',candidates:[
 {people:'我',context:'週三中午 12 點，學校餐廳窗口前',job:'下一堂課前吃完午餐',problem:'排隊要很久',frequency:'每週 2–3 次',cost:'待驗證',workaround:'提早去排',acceptance:'會影響下課休息',evidence:'我猜很多人都這樣',assumption:'只有一個結帳口'},
 {people:'要合租的同學',context:'開學前兩週，租屋社團',job:'找到室友',problem:'找不到可信的室友',frequency:'每學期一次',cost:'',workaround:'',acceptance:'',evidence:'',assumption:''}],
 selected:0,reason:'我可以接觸這群人',reconsider:'若排隊不是主因就換',statement:'午休短的同學買餐要等很久，常放棄午餐。',
 interviewees:['同學 A 課後','同學 B 課後','店員 C 中午'],questions:['上次排最久那次發生什麼？','那次你怎麼處理？'],challenge:{},source:'我的親身觀察',ai_response:'',contact_confirmed:true,questions_checked:true};
const r0=await post('week2-api',{action:'save',token,status:'submitted',card:weakCard});
if(!r0.row)throw Error('seed 失敗：'+JSON.stringify(r0).slice(0,200));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[token,SID]);
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(2500);
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d):''));
const read=()=>p.evaluate(()=>{const q=document.getElementById('week2-quality');const r=q.getBoundingClientRect();
 return {顯示:!q.hidden, 在畫面內:r.top<innerHeight&&r.bottom>0, 格:[...q.querySelectorAll('.quality-track li')].map(li=>li.textContent+':'+li.dataset.state),
  下一步:(q.querySelector('.quality-next')||{}).textContent, 選項:[...q.querySelectorAll('.quality-chip')].map(b=>b.textContent), 老師按鈕:(q.querySelector('.quality-teacher button')||{}).textContent||null};});
const s1=await read();
ok('提交成功但關卡沒過：第 1 格亮、只講一件事、旁邊有可點選項', s1.顯示&&s1.在畫面內&&s1.格[0].endsWith('done')&&s1.格[1].endsWith('next')&&/誰的痛/.test(s1.下一步)&&s1.選項.length===3, s1);
// 點第一個「誰」的選項 → 應該填進「受到影響的人」那一格，而且畫面跳到那一格
await p.evaluate(()=>document.querySelector('#week2-quality .quality-chip').click());await p.waitForTimeout(600);
const afterChip=await p.evaluate(()=>{const q=[...document.querySelectorAll('.week2-question')].find(x=>!x.hidden&&!x.closest('[hidden]')&&/受到影響的人/.test(x.innerText));
 const ta=q&&q.querySelector('textarea');return {跳到那一格:!!q, 內容:ta&&ta.value, 在畫面內:!!(ta&&ta.getBoundingClientRect().top<innerHeight&&ta.getBoundingClientRect().bottom>0), 焦點在格子裡:document.activeElement===ta};});
ok('點選項：「我」被換成一群人，而且畫面跳到那一格', afterChip.跳到那一格&&/學生|客人|大學生/.test(afterChip.內容||'')&&afterChip.在畫面內, afterChip);
const s2=await read();
ok('換完人之後，下一步變成講「代價」', /損失/.test(s2.下一步)&&s2.選項.some(t=>/分鐘/.test(t)), {下一步:s2.下一步,選項:s2.選項});
// 用代價選項＋手動補證據，存檔 → 第 2 格亮
await p.evaluate(()=>[...document.querySelectorAll('#week2-quality .quality-chip')].find(b=>/分鐘/.test(b.textContent)).click());await p.waitForTimeout(400);
await p.evaluate(()=>{const ta=document.activeElement;if(ta&&ta.tagName==='TEXTAREA'){ta.value=ta.value.replace('__','20');ta.dispatchEvent(new Event('input',{bubbles:true}));}});
await p.evaluate(()=>{const chip=[...document.querySelectorAll('#week2-quality .quality-chip')][0];if(chip)chip.click();});await p.waitForTimeout(400);
await p.evaluate(()=>{const ta=document.activeElement;if(ta&&ta.tagName==='TEXTAREA'){ta.value='10月1日中午 12 點，在校園餐廳，我親眼看到隊伍排到門口約 30 人，前面同學一直看時間。';ta.dispatchEvent(new Event('input',{bubbles:true}));}});
await p.evaluate(()=>{const s=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='儲存草稿');s.click();});await p.waitForTimeout(3000);
const s3=await read();
ok('三個關卡都過了：第 2 格亮，下一步改講訪談回來要補的事', s3.格[1].endsWith('done')&&/訪談回來|等老師/.test(s3.下一步), s3);
// 老師指路（用教師 token 直接呼叫 teacher_review）
const st=await fetch(`${BASE}/_state`).then(r=>r.json());
const ver=st.week2.find(r=>r.sid===SID).ver;
const rv=await post('week2-api',{action:'teacher_review',class_id:'class-a',student_id:SID,version:ver,review_status:'revision',note:'把頻率寫成每週幾次',target:'frequency'},'teacher-token');
await p.reload();await p.waitForTimeout(2500);
const s4=await read();
ok('老師指路：學生看到「老師要你改：重複發生 →」按鈕', /老師要你改：重複發生/.test(s4.老師按鈕||''), {老師按鈕:s4.老師按鈕, rv:rv.error||'ok'});
await p.evaluate(()=>document.querySelector('#week2-quality .quality-teacher button').click());await p.waitForTimeout(600);
const jumped=await p.evaluate(()=>{const q=[...document.querySelectorAll('.week2-question')].find(x=>!x.hidden&&!x.closest('[hidden]')&&/頻率/.test(x.innerText));return {跳到頻率那一格:!!q,焦點:document.activeElement&&document.activeElement.tagName};});
ok('按下去直接跳到「頻率」那一格並放好游標', jumped.跳到頻率那一格&&jumped.焦點==='TEXTAREA', jumped);
const pass=R.every(x=>x.startsWith('✅'))&&errs.length===0;
console.log(JSON.stringify({結果:R,頁面錯誤:errs},null,1));await b.close();process.exit(pass?0:1);
