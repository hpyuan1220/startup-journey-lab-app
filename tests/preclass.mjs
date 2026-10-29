// 課前預習互動：Week 3 沒登入也能做三題（但不能存）；有 Week 2 卡的學生存第一個問題 → 進 week3 列、重開頁還在、提交狀態不變；老師端學生卡看得到；Week 2 頁只有三題、沒有問題框。
// 先啟動：PORT=4240 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4240';const SID='A1132709'+String(Date.now()%100).padStart(2,'0');const SID2='A1132708'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,auth)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)}).then(r=>r.json());
async function seed(sid,withW2){
 const {token}=await post('Student-api',{action:'login',student_id:sid,invite_code:'GOOD-CODE',confirm_new:true});
 await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':k==='student_name'?'測試生':`第 ${i} 格：校園餐廳觀察。`])),status:'submitted'}});
 if(withW2){const card={mode:'guided',candidates:[
   {people:'午休有連堂的大二同學',context:'週二中午十二點，校園第一餐廳',job:'五十分鐘內吃完午餐回教室',problem:'排隊買餐就花掉二十分鐘',frequency:'每週兩到三次',cost:'常常放棄午餐',workaround:'改去便利商店買',acceptance:'貴一點也接受',evidence:'我自己上週三排了 22 分鐘',assumption:'其他同學也一樣'},
   {people:'學期初要在校外合租的同學',context:'開學前兩週，租屋社團與房仲',job:'找到可以一起分租的室友與房子',problem:'找不到可信任的室友，資訊零散',frequency:'每學期一次',cost:'',workaround:'',acceptance:'',evidence:'',assumption:''}],
  selected:0,reason:'我可以接觸到這群人',reconsider:'若排隊不是主因就換題',statement:'午休五十分鐘的同學買餐要等二十分鐘，常常放棄午餐，仍待驗證時間代價。',
  interviewees:['通勤同學 A','通勤同學 B','餐廳店員 C'],questions:['請回想最近一次排最久的那次，當時發生什麼？','那次你後來怎麼處理？花了多少時間？'],challenge:{},source:'我的親身觀察',ai_response:'',contact_confirmed:true,questions_checked:true};
  await post('week2-api',{action:'save',token,status:'submitted',card});}
 return token;
}
const tok=await seed(SID,true),tok2=await seed(SID2,false);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d):''));
const open=async(url,token,sid,w=390,h=844)=>{const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
 if(token)await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[token,sid]);
 await p.goto(`${BASE}/${url}`);await p.waitForTimeout(2200);return {p,errs};};
const quizState=(p,sel)=>p.evaluate(sel=>{const q=document.querySelector(sel+' .preclass-quiz');if(!q)return {none:true};return {
 題數:q.querySelectorAll('.preclass-item').length, 選項數:q.querySelectorAll('.preclass-item:first-of-type input[type=radio]').length,
 狀態:[...q.querySelectorAll('.preclass-item')].map(f=>f.dataset.state||''), 解釋:[...q.querySelectorAll('.preclass-why')].map(w=>w.hidden?'':w.textContent.slice(0,12)),
 總結:q.querySelector('.preclass-summary')?.textContent, 問題框:!!q.querySelector('.preclass-question textarea'), 存鈕:q.querySelector('.preclass-actions button')?.disabled,
 訊息:q.querySelector('.preclass-msg')?.textContent, 問題值:q.querySelector('.preclass-question textarea')?.value||''};},sel);
const pick=(p,sel,i,v)=>p.evaluate(([sel,i,v])=>{const r=document.querySelector(`${sel} .preclass-item[data-index="${i}"] input[value="${v}"]`);if(!r)return 'no';r.click();return 'ok';},[sel,i,v]);
const W3='#week-blueprint';
// 1) 沒登入：三題可以做、有解釋、不能存
{const {p,errs}=await open('week.html?week=3#card');let s=await quizState(p,W3);
 ok('沒登入：Week 3 影片下有三題、每題四個選項、問題框在但存鈕停用、有導去入口的訊息', !s.none&&s.題數===3&&s.選項數===4&&s.問題框&&s.存鈕===true&&/先進入班級/.test(s.訊息||''), s);
 await pick(p,W3,0,'b');s=await quizState(p,W3);
 ok('選錯：立刻出現「再想一下」解釋、該題標錯、總結說還有 2 題', s.狀態[0]==='wrong'&&/^再想一下/.test(s.解釋[0])&&/還有 2 題/.test(s.總結), {狀態:s.狀態,解釋:s.解釋[0],總結:s.總結});
 await pick(p,W3,0,'a');await pick(p,W3,1,'c');await pick(p,W3,2,'d');s=await quizState(p,W3);
 ok('重選改對、三題全對：總結「三題都對」', s.狀態.join()==='right,right,right'&&/三題都對/.test(s.總結), {狀態:s.狀態,總結:s.總結});
 ok('沒登入：沒有 JS 錯誤', errs.length===0, errs);await p.context().close();}
// 2) 有 Week 2 卡的學生：做題、存問題
{const {p,errs}=await open('week.html?week=3#card',tok,SID);let s=await quizState(p,W3);
 ok('有 Week 2 的學生：存鈕可用', !s.none&&s.存鈕===false, s);
 await pick(p,W3,0,'a');await pick(p,W3,1,'b');await pick(p,W3,2,'d');
 await p.evaluate(sel=>{const t=document.querySelector(sel+' .preclass-question textarea');t.value='如果有一個 App 幫你排隊你會用嗎';t.dispatchEvent(new Event('input',{bubbles:true}));},W3);
 await p.evaluate(sel=>document.querySelector(sel+' .preclass-actions button').click(),W3);await p.waitForTimeout(400);s=await quizState(p,W3);
 ok('假設題被擋下、不存', /是非題或假設題/.test(s.訊息||''), s.訊息);
 await p.evaluate(sel=>{const t=document.querySelector(sel+' .preclass-question textarea');t.value='上次你排隊排最久那次，後來怎麼辦？';},W3);
 await p.evaluate(sel=>document.querySelector(sel+' .preclass-actions button').click(),W3);await p.waitForTimeout(1200);s=await quizState(p,W3);
 ok('好問題存進去：訊息「存進去了」', /存進去了/.test(s.訊息||''), s.訊息);
 const status=await p.evaluate(()=>document.querySelector('#week-three [role=status]')?.textContent);
 ok('有 Week 2 的學生：沒有 JS 錯誤', errs.length===0, errs);
 // 重開頁
 await p.reload();await p.waitForTimeout(2200);s=await quizState(p,W3);
 ok('重開頁：三題的選擇與第一個問題都還在（第 2 題標錯）', s.狀態.join()==='right,wrong,right'&&s.問題值==='上次你排隊排最久那次，後來怎麼辦？', {狀態:s.狀態,問題值:s.問題值});
 await p.context().close();
 // 後端：week3 列是草稿（還沒交訪談），preclass 齊全
 const l=await post('week2-api',{action:'week3_load',token:tok});
 ok('week3_load：列存在、狀態 draft、preclass 問題與三個答案都在', l.row&&l.row.status==='draft'&&l.row.record.preclass.question==='上次你排隊排最久那次，後來怎麼辦？'&&l.row.record.preclass.answers.join()==='a,b,d'&&/^\d{4}-/.test(l.row.record.preclass.done_at), l.row&&{status:l.row.status,preclass:l.row.record.preclass});}
// 3) 沒有 Week 2 的學生：三題可以做，存鈕停用、訊息說先填 Week 2
{const {p,errs}=await open('week.html?week=3#card',tok2,SID2);const s=await quizState(p,W3);
 ok('沒有 Week 2：三題在、存鈕停用、訊息「先填 Week 2」', !s.none&&s.題數===3&&s.存鈕===true&&/先填 Week 2/.test(s.訊息||''), s);
 ok('沒有 Week 2：沒有 JS 錯誤', errs.length===0, errs);await p.context().close();}
// 4) Week 2 頁：只有三題、沒有問題框
{const {p,errs}=await open('week.html?week=2#card');const s=await quizState(p,'#week-blueprint');
 ok('Week 2 頁：影片下有三題、沒有問題框', !s.none&&s.題數===3&&!s.問題框, s);
 await pick(p,'#week-blueprint',1,'b');const s2=await quizState(p,'#week-blueprint');
 ok('Week 2 第 2 題選「解法先行」是對的', s2.狀態[1]==='right', s2.狀態);
 ok('Week 2 頁：沒有 JS 錯誤', errs.length===0, errs);await p.context().close();}
// 5) 教師端
{const t=await post('week2-api',{action:'teacher_load'},'teacher-token');
 const r=t.week3.find(x=>x.student_id===SID);
 ok('teacher_load 帶回 preclass', !!r&&r.record.preclass.question==='上次你排隊排最久那次，後來怎麼辦？', r&&r.record.preclass);
 const ctx=await b.newContext({viewport:{width:1280,height:900}});const tp=await ctx.newPage();const terrs=[];tp.on('pageerror',e=>terrs.push(String(e).slice(0,160)));
 await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(1200);
 await tp.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});
 await tp.evaluate(()=>[...document.querySelectorAll('#teacher-week2 button')].find(b=>b.textContent.trim()==='載入／更新 Week 2').click());await tp.waitForTimeout(1500);
 const v=await tp.evaluate(sid=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId===sid);if(!d)return {none:true};d.open=true;return {預習:d.querySelector('.tw2-preclass')?.textContent,警示:d.querySelector('.tw2-preclass')?.classList.contains('tw2-warn')};},SID);
 ok('教師洞察：學生卡顯示「課前預習：三題做了 3/3 · 第一個問題：…」', /三題做了 3\/3/.test(v.預習||'')&&/上次你排隊排最久那次/.test(v.預習||'')&&v.警示===false, v);
 ok('教師洞察：沒有 JS 錯誤', terrs.length===0, terrs);await ctx.close();}
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
