// 每一週頁的上方「學號 · 離開」：按了清掉本機登入、回到學生入口；沒登入時不顯示。先啟動：PORT=4251 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE='http://127.0.0.1:4251';const SID='A1132706'+String(Date.now()%100).padStart(2,'0');
const post=(path,body)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto(`${BASE}/week.html?week=4#card`);await p.evaluate(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[token,SID]);await p.reload();await p.waitForTimeout(1200);
const who=await p.locator('.topbar-who').textContent();
await p.click('.topbar-who button');await p.waitForTimeout(800);
const after=await p.evaluate(()=>({url:location.href,session:localStorage.getItem('sjl-student-session'),gate:!document.getElementById('student-gate').hidden}));
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(600);const none=await p.locator('.topbar-who').count();
console.log({who,after,noneWhenLoggedOut:none===0,errs});await b.close();
