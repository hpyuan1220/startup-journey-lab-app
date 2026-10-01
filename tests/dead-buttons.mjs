import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE='http://127.0.0.1:4210';
const FIELDS=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const lr=await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({action:'login',student_id:'A113270999',invite_code:'GOOD-CODE',confirm_new:true})});
const tok=(await lr.json()).token;
const sub=Object.fromEntries(FIELDS.map(k=>[k,k==='team_preference'?'訪談／研究':'種子 '+k]));
await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({action:'save',token:tok,submission:{...sub,status:'submitted'}})});

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(t=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:'A113270999'}));},tok);

const scan=async(label)=>p.evaluate(l=>{
 const vis=n=>n.offsetParent!==null&&!n.closest('details:not([open])')&&(!n.checkVisibility||n.checkVisibility());
 const dead=[...document.querySelectorAll('button')].filter(x=>vis(x)&&x.disabled).map(x=>{
  const r=x.getBoundingClientRect();
  return {字:x.textContent.replace(/\s+/g,' ').trim().slice(0,30), 有說明:!!(x.title||x.getAttribute('aria-describedby')), 在畫面內:r.bottom>0&&r.top<innerHeight};});
 return {狀態:l, 變灰的按鈕:dead};
},label);

const found=[];
// Week 2：走完每一題，每一題都掃一次
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(3000);
found.push(await scan('Week 2 剛打開'));
for(let i=0;i<40;i++){
 const moved=await p.evaluate(async()=>{
  const ta=document.querySelector('.week2-question:not([hidden]) textarea');
  if(ta&&!ta.value.trim()){ta.value='內容 '+Math.random().toString(36).slice(2,9);ta.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(x=>setTimeout(x,200));}
  const bar=document.querySelector('.guided-nav-bar');
  const nb=bar&&[...bar.querySelectorAll('button')].find(b=>/下一題|繼續下一步/.test(b.textContent));
  if(nb&&!nb.disabled){nb.click();await new Promise(x=>setTimeout(x,650));return true;}
  const ns=[...document.querySelectorAll('button')].find(b=>/繼續下一步|略過／完成 AI/.test(b.textContent)&&b.offsetParent!==null&&!b.disabled);
  if(ns){ns.click();await new Promise(x=>setTimeout(x,650));return true;}
  return false;
 });
 const s=await p.evaluate(()=>{const t=[...document.querySelectorAll('h2,h3')].map(h=>h.textContent.replace(/\s+/g,' ').trim()).find(x=>/第 \d\/\d 步|選用步驟/.test(x));
  const q=document.querySelector('.guided-nav-bar p');return (t||'?')+' · '+(q?q.textContent.trim():'');});
 found.push(await scan('Week 2 '+s));
 if(!moved)break;
}
// Week 1
await p.goto(`${BASE}/index.html#student`);await p.waitForTimeout(2200);
found.push(await scan('Week 1 已提交的卡'));
await p.evaluate(()=>{const el=document.getElementById('week1-form').elements['concern'];el.value='改一下';el.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForTimeout(400);
found.push(await scan('Week 1 有未存修改'));

const bad=found.filter(f=>f.變灰的按鈕.length>0);
console.log(JSON.stringify({掃描狀態數:found.length, 有變灰按鈕的狀態:bad, errors:errs.slice(0,2)},null,1));
await b.close();
