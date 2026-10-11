// 教師洞察 · 班級名單：加人、看誰還沒進來、移除；名單一有人，Student-api 就擋不在名單的學號。
// 先啟動：PORT=4231 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4231';
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,tok)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify(body)}).then(async r=>({status:r.status,body:await r.json()}));
const {body:{token}}=await post('Student-api',{action:'login',student_id:'A113270911','invite_code':'GOOD-CODE',confirm_new:true});
await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':k==='student_name'?'名單甲':`名單甲 第 ${i} 格。`])),status:'submitted'}});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.goto(`${BASE}/index.html#teacher`);await p.waitForTimeout(1200);
await p.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d):''));
const click=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('#teacher-week2 button')].find(b=>b.textContent.trim()===t);if(!x)return '找不到：'+t;x.click();return 'ok';},t);
const read=()=>p.evaluate(()=>{const d=document.querySelector('.tw2-roster');return {
 標題:d?.querySelector('summary').textContent, 警告:d?.querySelector('.tw2-warn')?.textContent?.slice(0,20), 名單:[...(d?.querySelectorAll('.tw2-roster-list li')||[])].map(li=>li.textContent.replace(/\s+/g,' ').trim()),
 進度:document.querySelector('.tw2-progress')?.textContent, 卡片:[...document.querySelectorAll('.tw2-student')].map(x=>({id:x.dataset.studentId,桶:x.dataset.bucket,名:x.querySelector('summary b').textContent})),
 篩選:[...document.querySelectorAll('.tw2-filters button')].map(b=>b.textContent), 狀態:document.querySelector('#teacher-week2 [role=status]').textContent};});
await click('載入／更新 Week 2');await p.waitForTimeout(1200);
let s=await read();
ok('沒名單時：面板顯示 0 人並警告「任何學號都能進入」', /班級名單（0 人）/.test(s.標題||'') && /任何學號都能進入/.test(s.警告||''), {標題:s.標題,警告:s.警告});
// 加一位還沒來的同學
await p.evaluate(()=>{document.querySelector('.tw2-roster').open=true;const [id,nm]=document.querySelectorAll('.tw2-roster-add input');id.value=' a113270950 ';nm.value='王小明';});
await click('加入名單');await p.waitForTimeout(1200);s=await read();
ok('加入後：名單 1 人、標成還沒進過系統、進度行多一欄、出現一張「還沒進過系統」的卡', /班級名單（1 人 · 還沒進過系統 1 人）/.test(s.標題||'') && s.名單.some(t=>/^A113270950 王小明 · 還沒進過系統移除$/.test(t)) && /還沒進過系統 1/.test(s.進度||'') && s.卡片.some(c=>c.id==='A113270950'&&c.桶==='absent'&&c.名==='王小明') && s.篩選.includes('還沒進過系統'), s);
// 名單一有人，門就關了：不在名單的學號被擋（走的是真的 student-api）
const gate=await post('Student-api',{action:'login',student_id:'A113270999',invite_code:'GOOD-CODE',confirm_new:true});
ok('名單有人之後，不在名單的學號登入 → 422 not_on_roster', gate.status===422 && gate.body.not_on_roster===true, gate);
// 把已經進來的同學也加進名單：顯示已進入、沒有移除鈕
await p.evaluate(()=>{const [id,nm]=document.querySelectorAll('.tw2-roster-add input');id.value='A113270911';nm.value='名單甲';});
await click('加入名單');await p.waitForTimeout(1200);s=await read();
ok('已進入的同學加進名單後：標成已進入、沒有移除鈕', s.名單.some(t=>/^A113270911 名單甲 · 已進入$/.test(t)) && /班級名單（2 人 · 還沒進過系統 1 人）/.test(s.標題||''), s.名單);
// 移除要按兩次
await p.evaluate(()=>{document.querySelector('.tw2-roster').open=true;});
await click('移除');await p.waitForTimeout(300);
const armed=await p.evaluate(()=>[...document.querySelectorAll('.tw2-remove')].map(b=>b.textContent));
await click('再按一次確定移除');await p.waitForTimeout(1200);s=await read();
ok('移除需要按兩次，移除後名單剩 1 人、那張卡消失', armed.includes('再按一次確定移除') && /班級名單（1 人 · 還沒進過系統 0 人）/.test(s.標題||'') && !s.卡片.some(c=>c.id==='A113270950'), {armed,標題:s.標題});
ok('沒有 JS 錯誤', errs.length===0, errs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
