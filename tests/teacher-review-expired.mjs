// 教師審核：登入過期時錯誤要出現在按鈕旁邊、打好的回饋不能消失；重新載入名單也要保留草稿。
// 先啟動：PORT=4235 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4235';
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,tok)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const seed=async(sid,name)=>{
 const {token}=await post('Student-api',{action:'login',student_id:sid,invite_code:'GOOD-CODE',confirm_new:true});
 await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':k==='student_name'?name:`${name} 第 ${i} 格，校園餐廳觀察。`])),status:'submitted'}});
 const card={mode:'guided',candidates:[
   {people:`${name} 午休有連堂的大二同學`,context:'週二中午十二點，校園第一餐廳',job:'五十分鐘內吃完午餐回教室',problem:'排隊買餐就花掉二十分鐘',frequency:'每週兩到三次',cost:'上週二放棄午餐一次',workaround:'改買便利商店',acceptance:'吃膩了也貴',evidence:'10/7 中午在第一餐廳親眼看到隊伍排到門口',assumption:'排隊是主因'},
   {people:`${name} 學期初要在校外合租的同學`,context:'開學前兩週，租屋社團與房仲',job:'找到可以一起分租的室友與房子',problem:'找不到可信任的室友，資訊零散',frequency:'每學期一次',cost:'待驗證',workaround:'問學長姊',acceptance:'人脈有限',evidence:'社團貼文',assumption:'信任是主因'}],
  selected:0,reason:'我可以接觸到這群人',reconsider:'若排隊不是主因就換題',statement:`${name}：午休五十分鐘的同學買餐要等二十分鐘，常常放棄午餐，仍待驗證時間代價。`,
  interviewees:['同學 A','同學 B','店員 C'],questions:['請回想最近一次排最久的那次，當時發生什麼？','那次你後來怎麼處理？花了多少時間？'],challenge:{},source:'我的親身觀察',contact_confirmed:true,questions_checked:true};
 await post('week2-api',{action:'save',token,status:'submitted',card});
};
await seed('A113270911','過期甲');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.goto(`${BASE}/index.html#teacher`);await p.waitForTimeout(1200);
await p.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d):''));
const click=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('#teacher-week2 button')].find(b=>b.textContent.trim()===t);if(!x)return '找不到：'+t;x.click();return 'ok';},t);
await click('載入／更新 Week 2');await p.waitForTimeout(1200);
const openCard=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');d.open=true;return !!d;});
ok('卡片在',await openCard());
const NOTE='四號公園那段是好證據，補頻率。';
await p.evaluate(n=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');const ta=d.querySelector('.tw2-review textarea');ta.value=n;ta.dispatchEvent(new Event('input',{bubbles:true}));const sel=d.querySelector('.tw2-review select');sel.value='frequency';sel.dispatchEvent(new Event('change',{bubbles:true}));},NOTE);
// 1) 模擬登入過期：teacher_review 回 401
let blocked=0;
await p.route(`${BASE}/functions/v1/week2-api`,async route=>{const body=route.request().postDataJSON();if(body.action==='teacher_review'){blocked++;return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'請重新登入教師帳號。'})});}return route.continue();});
await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');[...d.querySelectorAll('.tw2-actions button')].find(b=>b.textContent.trim()==='需要小幅修訂').click();});
await p.waitForTimeout(1200);
const after401=await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');const rv=d.querySelector('.tw2-review');const msg=rv.querySelector('.tw2-msg');return {msg:msg&&msg.textContent, isError:msg&&msg.classList.contains('error'), link:!!(msg&&msg.querySelector('a')), ta:rv.querySelector('textarea').value, sel:rv.querySelector('select').value, summary:d.querySelector('summary').textContent.replace(/\s+/g,' '), msgNearButtons: msg&&Math.abs(msg.getBoundingClientRect().top-rv.querySelector('.tw2-actions').getBoundingClientRect().bottom)<80};});
ok('401：錯誤出現在審核按鈕旁邊，附「去重新登入」連結', blocked===1 && after401.isError && /沒有存進去/.test(after401.msg||'') && /重新登入/.test(after401.msg||'') && after401.link && after401.msgNearButtons, after401);
ok('401：回饋和指路都還在格子裡，狀態沒變', after401.ta===NOTE && after401.sel==='frequency' && /尚未審核/.test(after401.summary));
// 2) 重新載入名單（登入後會按「載入／更新」）：草稿要留著
await click('載入／更新 Week 2');await p.waitForTimeout(1200);await openCard();
const afterReload=await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');const rv=d.querySelector('.tw2-review');return {ta:rv.querySelector('textarea').value, sel:rv.querySelector('select').value};});
ok('重新載入名單後草稿還在', afterReload.ta===NOTE && afterReload.sel==='frequency', afterReload);
// 3) 登入恢復：再按一次就存進去，草稿清掉、改讀資料庫的值
await p.unroute(`${BASE}/functions/v1/week2-api`);
await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');[...d.querySelectorAll('.tw2-actions button')].find(b=>b.textContent.trim()==='需要小幅修訂').click();});
await p.waitForTimeout(1500);await openCard();
const saved=await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId==='A113270911');const rv=d.querySelector('.tw2-review');return {summary:d.querySelector('summary').textContent.replace(/\s+/g,' '), current:rv.querySelector('.tw2-current').textContent, ta:rv.querySelector('textarea').value, status:document.querySelector('#teacher-week2 [role=status]').textContent};});
ok('再按一次：存進去，標題列變「需要小幅修訂」，回饋寫進目前狀態', /需要小幅修訂/.test(saved.summary) && saved.current.includes(NOTE) && saved.ta===NOTE && /已標為/.test(saved.status), saved);
ok('沒有 JS 錯誤', errs.length===0, errs);
console.log(R.join('\n'));console.log(`${R.filter(x=>x.startsWith('✅')).length}/${R.length}`);
await b.close();process.exit(R.every(x=>x.startsWith('✅'))?0:1);
