// Week 3 學生端：準備單從 Week 2 帶出來；三次訪談可分次存草稿；提交要通過檢查；重新開頁內容都在；沒有 Week 2 會被導回去。
// 先啟動：PORT=4241 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4241';const SID='A1132709'+String(Date.now()%100).padStart(2,'0');const SID2='A1132708'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
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
const open=async(token,sid,w=390,h=844)=>{const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
 await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[token,sid]);
 await p.goto(`${BASE}/week.html?week=3#card`);await p.waitForTimeout(2200);return {p,errs};};
const click=(p,t)=>p.evaluate(t=>{const x=[...document.querySelectorAll('#week-three button')].find(b=>b.textContent.trim()===t);if(!x)return '找不到：'+t;x.click();return 'ok';},t);
const state=p=>p.evaluate(()=>({
 準備單:document.querySelector('#week3-sheet')?.innerText.replace(/\s+/g,' ').slice(0,400),
 燈:[...document.querySelectorAll('#week3-quality .quality-track li')].map(l=>l.textContent+':'+(l.dataset.state||'')),
 下一步:document.querySelector('#week3-quality .quality-next')?.textContent, 記錄:document.querySelector('#week3-quality .quality-why')?.textContent,
 狀態:document.querySelector('#week-three [role=status]')?.textContent, 訪談區塊:document.querySelectorAll('.week3-interview').length,
 陳述預填:document.querySelector('textarea[name=statement]')?.value, 列印鈕:!!document.querySelector('#week3-sheet button'),
 導回:document.querySelector('#week3-sheet a')?.textContent}));
// 1) 有 Week 2 的學生
let {p,errs}=await open(tok,SID);let s=await state(p);
ok('準備單帶出 Week 2 的痛點、三位受訪者、兩題問題，陳述預填，有列印鈕', /午休有連堂的大二同學/.test(s.準備單)&&/通勤同學 A/.test(s.準備單)&&/餐廳店員 C/.test(s.準備單)&&/排最久/.test(s.準備單)&&/午休五十分鐘/.test(s.陳述預填||'')&&s.列印鈕&&s.訪談區塊===4, {燈:s.燈,下一步:s.下一步});
ok('一開始：燈在「還沒交」、下一步說還差 3 次', s.燈[0]==='還沒交:next'&&/還差 3 次/.test(s.下一步||''), s.燈);
// 填第一次訪談並存草稿
const fillInterview=(p,n,fits='yes')=>p.evaluate(([n,fits])=>{const set=(k,v)=>{const e=document.querySelector(`[name="i${n}_${k}"]`);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));};
 set('who',`通勤同學 ${'ABC'[n]}`);set('when_where','10/14 下課後走廊');set('quotes','「上禮拜三我排到快上課，直接不吃了。」');set('cost','大概 20 分鐘');set('workaround','後來都去便利商店');set('surprise','他其實怕賣完');
 const r=document.querySelector(`input[name="i${n}_fits"][value="${fits}"]`);r.click();},[n,fits]);
await fillInterview(p,0);s=await state(p);
ok('填完第一次：記錄 1/3、下一步說還差 2 次（還沒存也會即時算）', /已記錄 1 \/ 3/.test(s.記錄||'')&&/還差 2 次/.test(s.下一步||''), {記錄:s.記錄,下一步:s.下一步});
await click(p,'儲存草稿');await p.waitForTimeout(1200);s=await state(p);
ok('存草稿成功、訊息說已記錄 1/3', /草稿已儲存（已記錄 1 \/ 3 次）/.test(s.狀態||''), s.狀態);
// 只有一次就想提交 → 被擋，說明缺什麼
await click(p,'正式提交');await p.waitForTimeout(800);s=await state(p);
ok('只記一次就提交：擋下來並說訪談 2 缺什麼', /還不能提交：訪談 2/.test(s.狀態||''), s.狀態);
// 填滿並提交
await fillInterview(p,1,'partly');await fillInterview(p,2,'yes');
await p.evaluate(()=>{document.querySelector('input[name=judgment][value=adjust]').click();const l=document.querySelector('textarea[name=learned]');l.value='原本以為是排隊久，其實是怕賣完';l.dispatchEvent(new Event('input',{bubbles:true}));});
await click(p,'正式提交');await p.waitForTimeout(1500);s=await state(p);
ok('三次都記完＋判斷＋陳述 → 提交成功，燈到「三次都記了」', /已正式提交/.test(s.狀態||'')&&s.燈[2]==='三次都記了:done'&&s.燈[3]==='老師說 OK:next', {狀態:s.狀態,燈:s.燈});
// 重新開頁：內容都在
await p.reload();await p.waitForTimeout(2200);
const after=await p.evaluate(()=>({who2:document.querySelector('[name=i1_who]').value,fits1:document.querySelector('input[name=i1_fits]:checked')?.value,judgment:document.querySelector('input[name=judgment]:checked')?.value,learned:document.querySelector('textarea[name=learned]').value,status:document.querySelector('#week-three [role=status]').textContent,燈:[...document.querySelectorAll('#week3-quality .quality-track li')].map(l=>l.dataset.state)}));
ok('重新開頁：三次訪談、判斷、學到什麼都在，燈仍在第 2 格', after.who2==='通勤同學 B'&&after.fits1==='partly'&&after.judgment==='adjust'&&/怕賣完/.test(after.learned)&&after.燈[2]==='done', after);
ok('有 Week 2 的學生：沒有 JS 錯誤', errs.length===0, errs);
// 2) 沒有 Week 2 的學生
const o2=await open(tok2,SID2);s=await state(o2.p);
ok('沒有 Week 2：說明原因並給「去填 Week 2」的連結，沒有表單', /還沒有 Week 2 痛點卡/.test(s.準備單||'')&&/去填 Week 2/.test(s.導回||'')&&s.訪談區塊===0, {導回:s.導回,區塊:s.訪談區塊});
ok('沒有 Week 2 的學生：沒有 JS 錯誤', o2.errs.length===0, o2.errs);
// 3) 教師端看得到 Week 3
const t=await (await fetch(`${BASE}/functions/v1/week2-api`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer teacher-token'},body:JSON.stringify({action:'teacher_load'})})).json();
ok('teacher_load 帶回這位學生的 Week 3（已提交、三次訪談）', t.week3.some(r=>r.student_id===SID&&r.status==='submitted'&&r.record.interviews.length===3), t.week3.map(r=>[r.student_id,r.status]));
// 4) 教師洞察的學生卡顯示 Week 3
{const ctx=await b.newContext({viewport:{width:1280,height:900}});const tp=await ctx.newPage();const terrs=[];tp.on('pageerror',e=>terrs.push(String(e).slice(0,160)));
 await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(1200);
 await tp.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});
 await tp.evaluate(()=>[...document.querySelectorAll('#teacher-week2 button')].find(b=>b.textContent.trim()==='載入／更新 Week 2').click());await tp.waitForTimeout(1500);
 const v=await tp.evaluate(sid=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.studentId===sid);if(!d)return {none:true};d.open=true;const w3=d.querySelector('.tw2-week3');return {摘要:d.querySelector('summary').textContent.replace(/\s+/g,' '),標題:w3?.querySelector('h4')?.textContent,訪談:[...(w3?.querySelectorAll('.tw2-interview summary')||[])].map(x=>x.textContent),原話:w3?.querySelector('.tw2-quote')?.textContent,判斷:[...(w3?.querySelectorAll('.tw2-week3-after p')||[])].map(x=>x.textContent.slice(0,30)),進度:document.querySelector('.tw2-progress')?.textContent};},SID);
 ok('教師洞察：學生卡摘要有 Week 3、三次訪談可展開、原話與判斷都在、進度行有 Week 3 已交', /Week 3 已交 3\/3 次訪談/.test(v.摘要||'')&&v.訪談.length===3&&/通勤同學 B · 部分/.test(v.訪談[1]||'')&&/上禮拜三/.test(v.原話||'')&&v.判斷.some(t=>/判斷：調整/.test(t))&&/Week 3 已交 1/.test(v.進度||''), v);
 ok('教師洞察：沒有 JS 錯誤', terrs.length===0, terrs);}
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
