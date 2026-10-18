// Week 4 學生端＋教師端煙霧測試（真瀏覽器，對 serve-acceptance 的記憶體資料）。
// 先啟動：PORT=4251 node tests/serve-acceptance.mjs
import pw from '/opt/npm-tools/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4251';const SID='A1132704'+String(Date.now()%100).padStart(2,'0');
const post=(path,body,jwt)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,200):''));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));window.open=()=>null;},[token,SID]);
await p.goto(`${BASE}/week.html?week=4#card`);await p.waitForTimeout(1500);
ok('頁面有課堂兩題與三張卡',await p.evaluate(()=>document.querySelectorAll('.w4-q').length===2&&document.querySelectorAll('.w4-askcard').length===3));
ok('兩題文字是預設題',await p.evaluate(()=>document.querySelector('.w4-q-title').textContent.includes('Bhidé')));
ok('產業卡預設只秀兩張',await p.evaluate(()=>document.querySelectorAll('.w4-card').length===2));
// 答兩題、選產業、存
await p.fill('textarea[aria-label="我的痛一句話"]','午休 50 分鐘的大二同學每週兩次排 20 分鐘');
await p.fill('textarea[aria-label="第一題答案"]','七成來自自己工作裡碰到的問題');
await p.fill('textarea[aria-label="第二題答案"]','買方鏈：家長付錢');
await p.click('text=看全部 9 條');ok('看全部變九張',await p.evaluate(()=>document.querySelectorAll('.w4-card').length===9));
await p.check('input[name="w4-ind"][value="1"]');
await p.click('button.w4-save');await p.waitForTimeout(800);
const st1=await p.evaluate(()=>({msg:document.querySelector('.w4-msg').textContent,q1:document.querySelectorAll('.w4-q .w4-stamp')[0].textContent,ind:document.querySelector('.w4-sec .w4-stamp').textContent}));
ok('存成功、Q1 與產業有時間章',/版本 1/.test(st1.msg)&&/已存/.test(st1.q1)&&/已存/.test(st1.ind),st1);
// 卡 1：按鈕會複製 prompt、顯示問題；貼回自動選來源
await p.click('.w4-askcard >> nth=0 >> button.w4-go');await p.waitForTimeout(300);
const prompt=await p.evaluate(()=>document.querySelector('.w4-askcard .w4-prompt textarea')?.value||'');
ok('卡 1 prompt 帶入產業與痛',prompt.includes('餐飲小店')&&prompt.includes('午休 50 分鐘'),prompt.slice(0,80));
await p.fill('textarea[aria-label="這一行的錢流與困難 貼回"]','1. 尖峰出 120 份人手不夠 2. 外送抽 30%（估計）');
await p.waitForTimeout(2300);// 自動存
const st2=await p.evaluate(()=>({src:[...document.querySelectorAll('input[name="w4-src-card1"]')].find(r=>r.checked)?.value,stamp:document.querySelectorAll('.w4-askcard .w4-stamp')[0].textContent,prog:document.querySelector('.w4-prog').textContent}));
ok('卡 1 自動存、來源預設 gemini',st2.src==='gemini'&&/已存/.test(st2.stamp)&&/三張卡 1\/3/.test(st2.prog),st2);
// 卡 3 沒有卡 2 要擋
await p.click('.w4-askcard >> nth=2 >> button.w4-go');await p.waitForTimeout(200);
ok('卡 3 沒卡 2 證據被擋',await p.evaluate(()=>document.querySelector('.w4-msg').textContent.includes('先把 NotebookLM')));
// 重新開頁內容都在
await p.reload();await p.waitForTimeout(1500);
const back=await p.evaluate(()=>({q1:document.querySelector('textarea[aria-label="第一題答案"]').value,ind:document.querySelector('.w4-card.is-on b')?.textContent,c1:document.querySelector('textarea[aria-label="這一行的錢流與困難 貼回"]').value.length}));
ok('重開頁：兩題、產業、卡 1 都在',back.q1.includes('七成')&&/餐飲小店/.test(back.ind||'')&&back.c1>10,back);
// 教師端：teacher_load 有 week4；老師改題後學生看到新題
const t=await post('week2-api',{action:'teacher_load'},'teacher-token');
ok('teacher_load 有 week4 一列',t.week4?.length===1&&t.week4[0].student_id===SID);
await post('week2-api',{action:'teacher_week_questions',class_id:'class-a',week:4,questions:{q1:'老師臨時出的第一題',q2:'',points:''}},'teacher-token');
await p.reload();await p.waitForTimeout(1500);
ok('學生看到老師改的題',await p.evaluate(()=>document.querySelector('.w4-q-title').textContent.includes('老師臨時出的第一題')));
// 教師頁：登入態模擬
const tp=await ctx.newPage();tp.on('pageerror',e=>errs.push('T:'+String(e).slice(0,200)));
await tp.addInitScript(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');});
await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(800);
await tp.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await tp.waitForTimeout(1500);
const tv=await tp.evaluate(()=>({rows:document.querySelectorAll('#teacher-week4 tbody tr').length,txt:document.querySelector('#teacher-week4')?.innerText.replace(/\s+/g,' ').slice(0,300)}));
ok('教師端 Week 4 一人一列有資料',tv.rows>=1&&/出席|缺席/.test(tv.txt),tv);
ok('沒有 JS 錯誤',errs.length===0,errs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
