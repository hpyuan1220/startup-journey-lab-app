// Week 8 課堂兩題＋建組 真瀏覽器測試。先啟動：SJL_WRITE_OPEN_AT=2000-01-01T00:00:00Z PORT=4261 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4261';const N=String(Date.now()%100).padStart(2,'0');
const S1='A1132708'+N,S2='A1132709'+N,S3='A1132710'+N,S4='A1132711'+N;
const post=(path,body,jwt)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}).then(async r=>({status:r.status,...(await r.json())}));
const login=async sid=>(await post('Student-api',{action:'login',student_id:sid,invite_code:'GOOD-CODE',confirm_new:true})).token;
const T={};for(const s of [S1,S2,S3,S4])T[s]=await login(s);
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,300):''));
const b=await chromium.launch();const errs=[];
async function studentPage(sid){const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(sid+':'+String(e).slice(0,200)));
 await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));window.open=()=>null;},[T[sid],sid]);return p;}
// ---- 學生 1：課堂兩題 + 建組 ----
const p=await studentPage(S1);
await p.goto(`${BASE}/week.html?week=8`);await p.waitForTimeout(1200);
const v0=await p.evaluate(()=>({nav:!document.querySelector('#week-eight-navigation').hidden,card:document.querySelector('#week-eight').hidden,mat:!!document.querySelector('#week-eight-materials a[href*="Week8_講義.pdf"]')}));
ok('Week 8 學習藍圖：導覽列、作答頁先藏、教材區有講義連結',v0.nav&&v0.card&&v0.mat,v0);
await p.click('#week-eight-navigation a[data-week-view="card"]');await p.waitForTimeout(600);
const v1=await p.evaluate(()=>({qs:document.querySelectorAll('#week-eight .w4-q').length,t1:document.querySelector('#week-eight .w4-q-title')?.textContent||'',rule:document.querySelector('#week-eight .w4-rule')?.textContent||'',team:!!document.querySelector('#team .tm h2')}));
ok('作答頁：兩題（講師選擇題）、規則寫 11/20、Week 8 沒有建組區',v1.qs===2&&/鍋具/.test(v1.t1)&&/11\/20/.test(v1.rule)&&!v1.team,v1);
await p.fill('textarea[aria-label="第一題答案"]','B：新鍋具多半當不了主菜');await p.waitForTimeout(2600);
ok('Q1 自動存',await p.evaluate(()=>/已存/.test(document.querySelectorAll('#week-eight .w4-stamp')[0].textContent)));
// 建組：在 Week 7 期中報告頁
await p.goto(`${BASE}/week.html?week=7#team`);await p.waitForTimeout(1200);
ok('Week 7 頁：期中報告內容＋建組區＋建組規則',await p.evaluate(()=>!document.querySelector('#week-seven-materials').hidden&&/研究筆記 v2/.test(document.querySelector('#week-seven-materials').innerText)&&!!document.querySelector('#team .tm h2')&&/建組規則/.test(document.querySelector('#week-seven-materials').innerText)));
await p.fill('input[aria-label="組名"]','火鍋隊');await p.evaluate(()=>[...document.querySelectorAll('#team .tm button')].find(x=>/建一組/.test(x.textContent)).click());await p.waitForTimeout(900);
const code=await p.evaluate(()=>(document.querySelector('#team .tm-code')?.textContent||'').replace('組碼 ','').trim());
ok('建一組：拿到四碼組碼、組名顯示、1／3 人',/^[A-Z2-9]{4}$/.test(code)&&await p.evaluate(()=>/火鍋隊/.test(document.querySelector('.tm-team-head b').textContent)&&/1／3/.test(document.querySelector('.tm-team-head .w4-hint').textContent)),code);
// 認方向一
await p.evaluate(()=>[...document.querySelectorAll('#team .tm-table button')][0].click());await p.waitForTimeout(700);
ok('認方向一：按鈕變 ✓ 我認領',await p.evaluate(()=>document.querySelectorAll('#team .tm-table button')[0].getAttribute('aria-pressed')==='true'));
// ---- 學生 2：加入 ----
const p2=await studentPage(S2);await p2.goto(`${BASE}/week.html?week=7#team`);await p2.waitForTimeout(1200);
await p2.fill('input[aria-label="組碼"]',code.toLowerCase());await p2.evaluate(()=>[...document.querySelectorAll('#team .tm button')].find(x=>/加入這一組/.test(x.textContent)).click());await p2.waitForTimeout(900);
ok('學生 2 用小寫組碼加入：看到同一組、2／3 人、組員表兩列',await p2.evaluate(()=>/火鍋隊/.test(document.querySelector('.tm-team-head b')?.textContent||'')&&/2／3/.test(document.querySelector('.tm-team-head .w4-hint').textContent)&&document.querySelectorAll('.tm-table tbody tr').length===2));
// 學生 2 認方向一（已被學生 1 認）→ 應被擋
const c1=await post('week2-api',{action:'team_claim',directions:[1],token:T[S2]});
ok('同一方向不能兩人認（API 擋）',c1.status>=400&&/方向一/.test(c1.error||''),c1);
const c2=await post('week2-api',{action:'team_claim',directions:[2,3],token:T[S2]});
ok('兩人組：學生 2 認方向二＋三',c2.status===200&&c2.members.find(m=>m.student_id===S2).directions.length===2);
// 產業線：學生 2 Week 4 沒選 → 選單仍有九張卡；選卡 3
const ind=await post('week2-api',{action:'team_industry',industry:{card:3},token:T[S2]});
ok('組的產業線存成卡 3',ind.status===200&&ind.team.industry.card===3,ind.team?.industry);
await p.reload();await p.waitForTimeout(1500);
ok('學生 1 重整：組建好了（✅）',await p.evaluate(()=>document.querySelector('#team .w4-done')?.dataset.state==='done'));
// Week 9 頁第一塊：我的組 + 進群島
await p.goto(`${BASE}/week.html?week=9`);await p.waitForTimeout(1500);
ok('Week 9 頁：Week 9 教材顯示、Week 7 教材藏、「我的組」顯示同一組、有「進群島」連結',await p.evaluate(()=>!document.querySelector('#week-nine-materials').hidden&&document.querySelector('#week-seven-materials').hidden&&/火鍋隊/.test(document.querySelector('#team9 .tm-team-head b')?.textContent||'')&&/islands\.html/.test(document.querySelector('#team9 .tm-go a')?.getAttribute('href')||'')&&/先確認我的組/.test(document.querySelector('#team9 .eyebrow').textContent)));
const p0=await b.newPage();await p0.goto(`${BASE}/week.html?week=9`);await p0.waitForTimeout(1200);
ok('Week 9 沒登入：提示先進入、沒有進群島',await p0.evaluate(()=>/先用學號和邀請碼進入/.test(document.querySelector('#team9').innerText)&&!document.querySelector('#team9 .tm-go')));await p0.close();
const TN=(await post('Student-api',{action:'login',student_id:'A113990061',invite_code:'GOOD-CODE',confirm_new:true})).token;const c9=await b.newContext();await c9.addInitScript(t=>localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:'A113990061'})),TN);const p9=await c9.newPage();await p9.goto(`${BASE}/week.html?week=9`);await p9.waitForTimeout(1500);
ok('Week 9 登入沒組：也有「進群島」＋提示沒組可先玩，建組卡片仍在',await p9.evaluate(()=>!!document.querySelector('#team9 .tm-go a')&&/沒有組也可以先玩/.test(document.querySelector('#team9 .tm-go').textContent)&&!!document.querySelector('#team9 .tm-grid')));await c9.close();
// ---- 學生 3、4 ----
const j3=await post('week2-api',{action:'team_join',code,token:T[S3]});
const j4=await post('week2-api',{action:'team_join',code,token:T[S4]});
ok('第 3 人可加入、第 4 人被擋（已滿）',j3.status===200&&j4.status>=400&&/滿/.test(j4.error||''),j4);
const w4=await post('week2-api',{action:'team_want',want:true,token:T[S4]});
ok('學生 4 登記想請老師分組',w4.status===200&&w4.me?.wants_assignment===true);
const bad=await post('week2-api',{action:'team_join',code:'ZZZZ',token:T[S4]});
ok('錯的組碼：找不到',bad.status===404,bad);
// ---- 教師端 ----
const tp=await b.newPage();tp.on('pageerror',e=>errs.push('T:'+String(e).slice(0,200)));
await tp.addInitScript(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');});
await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(800);
await tp.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await tp.waitForTimeout(2000);
const tv=await tp.evaluate(([s4])=>{const s=document.querySelector('#teacher-team');const t=s?.innerText||'';return {has:!!s,cards:s?.querySelectorAll('.tt-card').length,team:[...s.querySelectorAll('.tt-card input[aria-label="組名"]')].some(i=>i.value==='火鍋隊'),want:new RegExp(s4+'.*想請老師分組').test(t),rows:s?.querySelectorAll('.tt-card .tm-table tbody tr').length};},[S4]);
ok('教師端 Week 7 建組：有組卡、火鍋隊三列、還沒有組名單標出想請老師分組',tv.has&&tv.cards>=1&&tv.team&&tv.want&&tv.rows>=3,tv);
// 老師建一組、把學生 4 指定進去、鎖定
await tp.fill('#teacher-team input[aria-label="新組名"]','老師組');await tp.evaluate(()=>[...document.querySelectorAll('#teacher-team button')].find(x=>/老師建一組/.test(x.textContent)).click());await tp.waitForTimeout(900);
await tp.evaluate(([s4])=>{const card=[...document.querySelectorAll('#teacher-team .tt-card')].find(c=>c.querySelector('input[aria-label="組名"]').value==='老師組');const sel=card.querySelector('select[aria-label="加人"]');sel.value=s4;sel.dispatchEvent(new Event('change'));},[S4]);await tp.waitForTimeout(900);
const ta=await post('week2-api',{action:'team_load',token:T[S4]});
ok('老師把學生 4 指定進「老師組」：學生端看到組、想分組旗標清掉',ta.team?.name==='老師組'&&ta.me?.wants_assignment===false,ta.team);
await tp.evaluate(()=>[...document.querySelectorAll('#teacher-team button')].find(x=>x.textContent==='鎖定全部').click());await tp.waitForTimeout(900);
const lk=await post('week2-api',{action:'team_leave',token:T[S4]});
ok('鎖定全部後：學生不能離開（API 擋）',lk.status>=400,lk);
await p.goto(`${BASE}/week.html?week=7#team`);await p.waitForTimeout(1500);
ok('學生 1 重整：顯示已鎖定、沒有離開按鈕',await p.evaluate(()=>/已鎖定/.test(document.querySelector('#team .w4-lock')?.textContent||'')&&![...document.querySelectorAll('#team button')].some(x=>/離開這一組/.test(x.textContent))));
// Week 6 不受影響
await p.goto(`${BASE}/week.html?week=6#card`);await p.waitForTimeout(1200);
ok('Week 6 頁：兩題還在、沒有建組區',await p.evaluate(()=>document.querySelectorAll('#week-six .w4-q').length===2&&!document.querySelector('.tm')));
ok('沒有 JS 錯誤',errs.length===0,errs);
await b.close();console.log(R.join('\n'));process.exit(R.some(x=>x.startsWith('❌'))?1:0);
