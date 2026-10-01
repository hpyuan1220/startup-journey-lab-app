// 真的用瀏覽器走完「套用 AI 修改 → 存到雲端」，確認畫面上不會同時出現
// 「已同步 版本 N」和「還沒存到雲端」兩句相反的話。
// 這個缺陷曾經讓使用者以為存檔卡住（其實伺服器上已經是版本 28）。
// 先啟動驗收伺服器：PORT=4210 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE='http://127.0.0.1:4210';
const SID='A113270998';
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const lr=await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true})});
const tok=(await lr.json()).token;
const sub=Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':`第 ${i} 格：發生在校園餐廳，內容與其他欄位不同。`]));
await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({action:'save',token:tok,submission:{...sub,status:'submitted'}})});

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,140)));
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[tok,SID]);
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(2500);

// 填滿整張卡
await p.evaluate(async()=>{
 const g=[...document.querySelectorAll('input[type=checkbox]')].find(c=>/一次只顯示一題/.test((c.closest('label')||{}).innerText||''));
 if(g&&g.checked)g.click();
 await new Promise(r=>setTimeout(r,600));
 for(const d of document.querySelectorAll('details'))d.open=true;
 let i=0;const places=['校園餐廳','圖書館','宿舍交誼廳','系館走廊','校車站'];
 for(const ta of document.querySelectorAll('textarea')){i++;if(!ta.value.trim()){
  const q=ta.closest('.week2-question');const lab=q?String(q.innerText).replace(/\s+/g,' ').slice(0,18):'欄位';
  ta.value=lab+'｜內容第 '+i+' 項，發生在'+places[i%5]+'，與其他欄位不同。';
  ta.dispatchEvent(new Event('input',{bubbles:true}));}}
 for(const s of document.querySelectorAll('select')){if(!s.value&&s.options.length>1){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));}}
 for(const c of document.querySelectorAll('input[type=checkbox]')){if(!c.checked&&!/一次只顯示一題|進階|自動|個資/.test((c.closest('label')||{}).innerText||''))c.click();}
 for(const r of document.querySelectorAll('input[type=radio]')){if(!document.querySelector(`input[type=radio][name="${r.name}"]:checked`))r.click();}
 await new Promise(r=>setTimeout(r,800));
});
const click=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('button')].find(b=>new RegExp(t).test(b.textContent));if(!x)return '找不到按鈕：'+t;x.click();return 'ok';},t);

const steps={};
steps['展開 AI 選項']=await click('我要使用 AI：展開選項');
await p.waitForTimeout(400);
steps['勾個資確認']=await p.evaluate(()=>{const c=document.querySelector('#week2-privacy');if(!c)return '找不到個資確認框';if(!c.checked)c.click();return c.checked?'ok':'fail';});
steps['按取得建議']=await click('檢查我的痛點，取得 AI 建議');
await p.waitForTimeout(900);
steps['確認匿名內容']=await click('確認內容，取得 AI 建議');
await p.waitForTimeout(3000);
steps['勾要改的欄位']=await p.evaluate(()=>{
 // 只勾「痛點陳述」，並把該欄清空 —— 學生本來就可以留白請 AI 草擬，
 // 這樣草擬結果一定和現況不同，才走得到真正的套用。
 const ra=document.querySelector('.revision-area');
 if(!ra)return '找不到修改區';
 let picked=null;
 for(const c of ra.querySelectorAll('input[type=checkbox]')){
  const want=/痛點陳述|痛點描述/.test((c.closest('label')||{}).innerText||'');
  if(c.checked!==want)c.click();if(want)picked=c;}
 const ta=[...document.querySelectorAll('.week2-question')].map(q=>({q,t:q.querySelector('textarea')}))
  .find(x=>x.t&&/痛點陳述|痛點描述/.test(x.q.innerText));
 if(ta){ta.t.value='';ta.t.dispatchEvent(new Event('input',{bubbles:true}));}
 return {勾的欄位:picked?(picked.closest('label').innerText||'').replace(/\s+/g,' ').slice(0,20):'沒勾到',已清空痛點陳述:!!ta};});
await p.waitForTimeout(600);
steps['草擬修改']=await click('幫我草擬修改');
await p.waitForTimeout(900);
steps['確認套用']=await click('確認套用已勾選欄位');
await p.waitForTimeout(900);

// 修改區位在未啟用的步驟裡，document.body.innerText 讀不到它，
// 所以直接讀 .revision-area 的文字，不要用整頁文字判斷。
const read=()=>p.evaluate(()=>{
 const ra=document.querySelector('.revision-area');
 const txt=ra?ra.innerText:'';
 const btn=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='儲存草稿到雲端');
 return {狀態列:[...new Set([...document.querySelectorAll('[role="status"]')]
   .filter(n=>n.offsetParent!==null).map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(Boolean))],
  修改區全文:txt.replace(/\s+/g,' ').trim().slice(0,260),
  含還沒存到雲端:/還沒存到雲端/.test(txt),
  含已存到雲端:/已存到雲端（版本/.test(txt),
  儲存草稿到雲端按鈕隱藏:btn?btn.hidden:'找不到'};});

const before=await read();
steps['按儲存草稿到雲端']=await click('^儲存草稿到雲端$');
await p.waitForTimeout(3500);
const after=await read();

const pass=before.含還沒存到雲端 && before.儲存草稿到雲端按鈕隱藏===false
 && !after.含還沒存到雲端 && after.含已存到雲端 && after.儲存草稿到雲端按鈕隱藏===true;
console.log(JSON.stringify({步驟:steps,套用後_應該先出現提示:before,存檔後_提示應該清掉:after,
 結論:pass?'✅ 存檔成功後畫面上不再有「還沒存到雲端」':'❌ 畫面上兩句話仍然矛盾',頁面錯誤:errs},null,1));
await b.close();
process.exit(pass?0:1);
