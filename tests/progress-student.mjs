// 「我的進度」學生端煙霧測試（真瀏覽器，對 serve-acceptance）。先啟動：PORT=4251 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4251';const SID='A1132706'+String(Date.now()%100).padStart(2,'0');
const post=(path,body,jwt)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,240):''));
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
// 只做 Week 4 卡 1；Week 1–3、5 都沒有
await post('week2-api',{action:'week4_save',token,version:null,data:{pain:'午休排隊 20 分鐘',industry:{card:1},card1:{text:'老闆付外送抽成三成',source:'gemini'}}});
const api=await post('week2-api',{action:'my_progress',token});
ok('my_progress 回五週、Week 4 是 1/3、下一步是 Week 1',api.weeks?.length===5&&api.weeks[3].label==='三張卡 1/3'&&/^Week 1：/.test(api.next)&&api.doneCount===0,{w4:api.weeks?.[3],next:api.next});
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[token,SID]);
await p.goto(`${BASE}/index.html`);await p.waitForTimeout(1500);
const v=await p.evaluate(()=>({box:!!document.getElementById('my-progress'),cells:[...document.querySelectorAll('#my-progress .mp-grid li')].map(li=>li.className+':'+li.querySelector('span').textContent),next:document.querySelector('#my-progress .mp-next')?.textContent,msg:document.querySelector('#my-progress .mp-msg')?.textContent,href4:document.querySelector('#my-progress .mp-grid li:nth-child(4) a')?.getAttribute('href'),thisweek:document.querySelector('#home .thisweek')?.textContent,current:[...document.querySelectorAll('#home .week-grid li.current a')].map(a=>a.getAttribute('href'))}));
ok('課程地圖登入後有「我的進度」：五格、Week 4 橘色 1/3、下一步 Week 1',v.box&&v.cells.length===5&&v.cells[3]==='mp-partial:三張卡 1/3'&&v.cells[0]==='mp-none:還沒開始'&&/Week 1/.test(v.next||'')&&v.msg==='0/5 週完成'&&v.href4==='week.html?week=4#card',v);
ok('「本週」照上課日表自動算（10/30 以後是 Week 5）',/本週 Week \d/.test(v.thisweek||'')&&v.current.length===1,{thisweek:v.thisweek,current:v.current});
// 沒登入：沒有那一條
const p2=await (await b.newContext({viewport:{width:390,height:844}})).newPage();await p2.goto(`${BASE}/index.html`);await p2.waitForTimeout(800);
ok('沒登入：課程地圖沒有「我的進度」',await p2.evaluate(()=>!document.getElementById('my-progress')));
ok('沒有 JS 錯誤',errs.length===0,errs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
