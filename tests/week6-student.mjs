// Week 6 課堂兩題（通用 classq）真瀏覽器測試。先啟動：SJL_WRITE_OPEN_AT=2000-01-01T00:00:00Z PORT=4261 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4261';const SID='A1132706'+String(Date.now()%100).padStart(2,'0');
const post=(path,body,jwt)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,260):''));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));window.__opened=[];window.open=u=>{window.__opened.push(u);return null;};const oc=document.execCommand.bind(document);document.execCommand=c=>{if(c==='copy'){const a=document.activeElement;window.__clip=a&&a.value;}return oc(c);};},[token,SID]);
await p.goto(`${BASE}/week.html?week=6`);await p.waitForTimeout(1200);
const v0=await p.evaluate(()=>({nav:!document.querySelector('#week-six-navigation').hidden,card:document.querySelector('#week-six').hidden,blue:document.querySelector('#week-blueprint').hidden,vid:!!document.querySelector('#week-blueprint .preclass iframe[src*="ZGPb1bSGqUE"]'),link:!!document.querySelector('#week-six-materials a[href="#card"]')}));
ok('Week 6 學習藍圖：有導覽列、影片在標題下且載入、作答頁先藏起來、教材區有「答 Week 6 課堂兩題」',v0.nav&&v0.card&&!v0.blue&&v0.vid&&v0.link,v0);
await p.click('#week-six-navigation a[data-week-view="card"]');await p.waitForTimeout(400);
const v1=await p.evaluate(()=>({card:!document.querySelector('#week-six').hidden,blue:document.querySelector('#week-blueprint').hidden,qs:document.querySelectorAll('#week-six .w4-q:not([hidden])').length,t1:document.querySelector('#week-six .w4-q-title')?.textContent||'',rule:document.querySelector('#week-six .w4-rule')?.textContent||''}));
ok('作答頁：兩題、Week 6 預設題（發電廠）、規則寫 11/06 與 Week 6 出席',v1.card&&v1.blue&&v1.qs===2&&/發電廠/.test(v1.t1)&&/11\/06/.test(v1.rule)&&/Week 6 出席/.test(v1.rule),v1);
// 空答案按 Gemini：提示、不開分頁
await p.click('#week-six .w4-own');await p.waitForTimeout(200);
ok('答案空白按「自己用 Gemini 問」：旁邊提示、不開分頁',await p.evaluate(()=>/先在上面的框寫下你的答案/.test(document.querySelector('#week-six .w4-near')?.textContent||'')&&window.__opened.length===0));
await p.fill('textarea[aria-label="第一題答案"]','底層單筆大、家數少；小團隊用現成引擎做某一行的服務');await p.waitForTimeout(2600);
const st1=await p.evaluate(()=>document.querySelectorAll('#week-six .w4-stamp')[0].textContent);
ok('打字自動存、Q1 出現「已存」',/已存/.test(st1),st1);
await p.click('#week-six .w4-own');await p.waitForTimeout(300);
ok('有答案按「自己用 Gemini 問」：開 Gemini、同步複製題目＋答案、題目下面出現可再複製的問題框',await p.evaluate(()=>window.__opened[0]==='https://gemini.google.com/app'&&/已開 Gemini/.test(document.querySelector('#week-six .w4-near').textContent)&&(()=>{const d=document.querySelector('#week-six .w4-q .w4-prompt');return !!d&&d.open&&/發電廠/.test(d.querySelector('textarea').value)&&/底層單筆大/.test(d.querySelector('textarea').value);})()&&/底層單筆大/.test(window.__clip||'')));
await p.fill('textarea[aria-label="第二題答案"]','島 6，Owner 幫餐廳做點餐');
await p.click('#week-six .w4-q:nth-of-type(2) .w4-row button:first-child').catch(()=>{});
await p.evaluate(()=>document.querySelectorAll('#week-six .w4-q')[1].querySelector('.w4-row button').click());await p.waitForTimeout(1500);
const v2=await p.evaluate(()=>({ai:document.querySelector('textarea[aria-label="第二題 AI 評語"]').value,near:document.querySelectorAll('#week-six .w4-q')[1].querySelector('.w4-near')?.textContent||''}));
ok('Q2 讓 AI 評：先存再評，評語在下面那格、說剩幾次',v2.ai.length>0&&/還能再問 2 次/.test(v2.near),v2);
await p.reload();await p.waitForTimeout(1500);
const v3=await p.evaluate(()=>({q1:document.querySelector('textarea[aria-label="第一題答案"]').value,q2:document.querySelector('textarea[aria-label="第二題答案"]').value,ai:document.querySelector('textarea[aria-label="第二題 AI 評語"]').value,prog:document.querySelector('#week-six .w4-prog').textContent,card:!document.querySelector('#week-six').hidden}));
ok('重整後：#card 直接到作答頁，兩題與 AI 評語都在、兩題 2/2',v3.card&&/底層/.test(v3.q1)&&/島 6/.test(v3.q2)&&v3.ai.length>0&&/2\/2/.test(v3.prog),v3);
// Week 5 頁不受影響、預設 Q2 不是群島題
await p.goto(`${BASE}/week.html?week=5#card`);await p.waitForTimeout(1500);
ok('Week 5 頁：兩題還在、Q2 是預設（為什麼是現在），不是群島題',await p.evaluate(()=>{const t=[...document.querySelectorAll('#week-five .w4-q-title')].map(x=>x.textContent);return t.length===2&&/為什麼是現在/.test(t[1]);}));
// 教師端
const t=await post('week2-api',{action:'teacher_load'},'teacher-token');
ok('teacher_load 有 week_class 一列（week 6）',Array.isArray(t.week_class)&&t.week_class.some(r=>r.student_id===SID&&r.week===6));
const tp=await ctx.newPage();tp.on('pageerror',e=>errs.push('T:'+String(e).slice(0,200)));
await tp.addInitScript(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');});
await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(800);
await tp.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await tp.waitForTimeout(1800);
const tv=await tp.evaluate(()=>{const s6=document.querySelector('#teacher-week6'),s5=document.querySelector('#teacher-week5');return {first:!!(s6&&s5&&s6.compareDocumentPosition(s5)&Node.DOCUMENT_POSITION_FOLLOWING),rows:s6?.querySelectorAll('tbody tr').length||0,txt:s6?.innerText.replace(/\s+/g,' ').slice(0,700)||''};});
ok('教師端：Week 6 區在 Week 5 上面、有兩題編輯與一人一列（這次測試不在上課時段＝缺席、課後）',tv.first&&tv.rows>=1&&/學生目前看到/.test(tv.txt)&&/課後/.test(tv.txt),tv);
await tp.evaluate(()=>document.querySelector('#teacher-week6 tbody tr td button').click());await tp.waitForTimeout(300);
ok('點開：看得到 Q1、Q2、AI 評語',await tp.evaluate(()=>{const d=document.querySelector('#teacher-week6 .tw4-detail')?.innerText||'';return /Q1：/.test(d)&&/Q2 AI 評語/.test(d);}));
ok('教師端 Week 6：有「把本週推算存成標記」、規則同 Week 4／5、每列有推算',await tp.evaluate(()=>{const s=document.querySelector('#teacher-week6');const b=[...s.querySelectorAll('button')].find(b=>/推算存成標記/.test(b.textContent));return !!b&&/兩題都在課中答完＝積極/.test(s.querySelector('.tw4-freeze-msg').textContent)&&/推算/.test(s.querySelector('.tw4-remark').innerText);}));
ok('沒有 JS 錯誤',errs.length===0,errs);
await b.close();console.log(R.join('\n'));process.exit(R.some(x=>x.startsWith('❌'))?1:0);
