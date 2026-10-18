// Week 1 回顧模式（2026-10-18）：已交的人開起點卡只看「MY PROBLEM CARD」摘要＋「修改這張卡」；影片重點、表單（含 AI 建議）收起來。
// 草稿中的人完全照舊。合成學號，對 serve-acceptance 的記憶體資料。
// 先啟動：PORT=4251 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4251';const SID='A1132706'+String(Date.now()%100).padStart(2,'0');const SID2='A1132705'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
const sub=i=>({...Object.fromEntries(F.map((k,n)=>[k,k==='team_preference'?'訪談／研究':k==='student_name'?'測試生':`第 ${n} 格：校園餐廳觀察 ${i}`])),consent_to_share_in_class:true});
const {token:t1}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
await post('Student-api',{action:'save',token:t1,submission:{...sub(1),status:'submitted'}});
const {token:t2}=await post('Student-api',{action:'login',student_id:SID2,invite_code:'GOOD-CODE',confirm_new:true});
await post('Student-api',{action:'save',token:t2,submission:{...sub(2),status:'draft'}});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,240):''));
const b=await chromium.launch();
async function open(tok,sid){const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
 await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[tok,sid]);
 await p.goto(`${BASE}/index.html#student`);await p.waitForTimeout(1800);return {p,errs};}
const look=p=>p.evaluate(()=>{const vis=e=>!!e&&e.getClientRects().length>0;const ws=document.querySelector('#student-workspace');return {
 review:ws.classList.contains('is-review'),form:vis(document.querySelector('#week1-form')),video:vis(ws.querySelector(':scope > .video-learning-card')),preview:vis(document.querySelector('#student-workspace .preview')),
 problem:document.querySelector('#card-problem').textContent,state:document.querySelector('#submitted-state-text').textContent,btn:document.querySelector('#week1-edit')?.textContent||null,btnVis:vis(document.querySelector('#week1-edit')),
 wide:document.documentElement.scrollWidth>innerWidth+1};});
// 1) 已交的人
let {p,errs}=await open(t1,SID);let s=await look(p);
ok('已交：回顧模式，表單與影片重點收起，MY PROBLEM CARD 看得到自己的觀察',s.review&&!s.form&&!s.video&&s.preview&&/校園餐廳觀察 1/.test(s.problem),s);
ok('已交：狀態列說已提交並指到「修改這張卡」；按鈕就在旁邊',/已提交|已於/.test(s.state)&&/修改這張卡/.test(s.state)&&s.btn==='修改這張卡'&&s.btnVis,s);
ok('已交：390px 無橫向捲動',!s.wide);
const y0=await p.evaluate(()=>{const y=scrollY;document.querySelector('#week1-edit').click();return y;});await p.waitForTimeout(400);
s=await look(p);const scrolled=await p.evaluate(y=>scrollY>y+100,y0);
ok('按「修改這張卡」：表單展開、捲到表單、按鈕變「收起表單」',!s.review&&s.form&&scrolled&&s.btn==='收起表單，只看回顧卡',{...s,scrolled});
await p.evaluate(()=>document.querySelector('#week1-edit').click());await p.waitForTimeout(300);s=await look(p);
ok('再按一次：回到回顧模式',s.review&&!s.form,s);
ok('已交的人：沒有 JS 錯誤',errs.length===0,errs);
// 2) 草稿中的人：照舊
({p,errs}=await open(t2,SID2));s=await look(p);
ok('草稿：表單與影片重點照常顯示、沒有修改按鈕',!s.review&&s.form&&s.video&&!s.btnVis,s);
ok('草稿的人：沒有 JS 錯誤',errs.length===0,errs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
