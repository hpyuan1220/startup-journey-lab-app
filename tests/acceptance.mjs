import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE='http://127.0.0.1:4222';
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const R=[];const ok=(n,c,d)=>R.push({[c?'✅':'❌']:n,...(d?{細節:d}:{})});
const state=async()=>fetch(`${BASE}/_state`).then(r=>r.json());

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push('pageerror:'+String(e).slice(0,100)));
p.on('console',m=>{if(m.type()==='error'&&!/favicon/.test(m.text()))errs.push('console:'+m.text().slice(0,100));});
const bad=[];
p.on('response',async r=>{ if(r.status()>=400 && r.url().indexOf('/functions/v1')>=0){
  let body='';try{body=(await r.text()).slice(0,130);}catch(e){}
  let req='';try{req=(r.request().postData()||'').slice(0,70);}catch(e){}
  bad.push({狀態:r.status(),端點:r.url().split('/').pop(),請求:req,回應:body});}});

// ========== 路徑 A：全新學生完成 Week 1 ==========
await p.goto(`${BASE}/index.html#student`);await p.waitForTimeout(1200);
await p.fill('#access-student-id','a113270999');   // 故意用小寫
await p.fill('#access-code','GOOD-CODE');
await p.click('#student-enter');await p.waitForTimeout(1200);
const gate=await p.evaluate(()=>({有確認區:!!document.querySelector('#access-message button'),
  按鈕:[...document.querySelectorAll('#access-message button')].map(x=>x.textContent.trim())}));
ok('A1 新學號登入會先問「是不是第一次」', gate.有確認區, gate.按鈕);
await p.evaluate(()=>[...document.querySelectorAll('#access-message button')].find(x=>/第一次/.test(x.textContent)).click());
await p.waitForTimeout(1500);
const entered=await p.evaluate(()=>({進工作區:!document.getElementById('student-workspace').hidden,
  學號標籤:(document.getElementById('student-label')||{}).textContent}));
ok('A2 按「是」能進入，學號已轉大寫', entered.進工作區 && /A113270999/.test(entered.學號標籤||''), entered.學號標籤);

await p.evaluate(F=>{const f=document.getElementById('week1-form');
 for(const n of F){const el=f.elements[n];if(!el)continue;
  el.value=n==='team_preference'?'訪談／研究':`驗收測試內容（${n}），非真實學生資料。`;
  if(el.tagName==='SELECT'){const i=[...el.options].findIndex(o=>o.value===el.value);el.selectedIndex=i>0?i:1;}
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},F);
await p.waitForTimeout(400);
await p.click('#save-draft');await p.waitForTimeout(1500);
let st=await state();
ok('A3 儲存草稿寫進伺服器', st.week1.some(r=>r.sid==='A113270999'&&r.status==='draft'), st.week1);

await p.click('#ai-feedback-run');await p.waitForTimeout(2500);
const aiOk=await p.evaluate(()=>({有建議:!document.getElementById('ai-feedback-body').hidden,
  狀態:document.getElementById('ai-feedback-status').textContent.replace(/\s+/g,' ').trim().slice(0,40)}));
ok('A4 取得 AI 建議正常', aiOk.有建議, aiOk.狀態);

const sel='#week1-form [type="submit"]';
await p.locator(sel).scrollIntoViewIfNeeded();
await p.locator(sel).click();await p.waitForTimeout(2000);
const sub=await p.evaluate(()=>{const box=document.getElementById('submitted-state');const r=box.getBoundingClientRect();
 return {提交區塊顯示:!box.hidden, 在畫面內:r.bottom>0&&r.top<innerHeight, 文字:box.textContent.replace(/\s+/g,' ').trim().slice(0,50),
  訊息:document.getElementById('form-message').textContent.replace(/\s+/g,' ').trim().slice(0,40)};});
st=await state();
ok('A5 正式提交成功且學生看得到確認', sub.提交區塊顯示 && sub.在畫面內 && st.week1.some(r=>r.sid==='A113270999'&&r.status==='submitted'), {畫面:sub, 伺服器:st.week1});

await p.reload();await p.waitForTimeout(2000);
const back=await p.evaluate(()=>({已填欄位:[...document.querySelectorAll('#week1-form textarea')].filter(t=>t.value.trim()).length,
 提交區塊:!document.getElementById('submitted-state').hidden,
 儲存草稿隱藏:document.getElementById('save-draft').hidden, 清除隱藏:document.getElementById('clear-form').hidden}));
ok('A6 重新整理後內容與提交狀態都在，危險按鈕已隱藏', back.已填欄位>=9 && back.提交區塊 && back.儲存草稿隱藏 && back.清除隱藏, back);

await p.evaluate(()=>{const el=document.getElementById('week1-form').elements['concern'];el.value='修改後再提交一次';el.dispatchEvent(new Event('input',{bubbles:true}));});
await p.locator(sel).click();await p.waitForTimeout(2000);
st=await state();
const v2=st.week1.find(r=>r.sid==='A113270999');
ok('A7 修改後可重新提交（版本遞增）', v2 && v2.ver>=2 && v2.status==='submitted', v2);

// ========== 路徑 B：同一位學生完成 Week 2 ==========
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(3000);
const w2first=await p.evaluate(()=>{
 const tas=[...document.querySelectorAll('textarea')];
 const q=[...document.querySelectorAll('.week2-question')].find(x=>!x.hidden&&x.offsetParent!==null);
 const ta=q&&q.querySelector('textarea');const r=ta?ta.getBoundingClientRect():null;
 return {可以進入:!document.querySelector('#week-two')?.hidden, 輸入框:tas.length, 已帶入:tas.filter(t=>t.value.trim()).length,
  第一題在畫面內:r?(r.bottom>0&&r.top<innerHeight):null,
  訊息:[...new Set([...document.querySelectorAll('[role="status"]')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(Boolean))].slice(0,1)};});
ok('B1 交完 Week 1 的學生可以進 Week 2，且帶入 Week 1 內容', w2first.可以進入 && w2first.已帶入>0 && w2first.第一題在畫面內, w2first);

await p.evaluate(async()=>{
 const g=[...document.querySelectorAll('input[type=checkbox]')].find(c=>/一次只顯示一題/.test((c.closest('label')||{}).innerText||''));
 if(g&&g.checked)g.click();
 await new Promise(r=>setTimeout(r,600));
 for(const d of document.querySelectorAll('details'))d.open=true;
 let i=0;const places=['校園餐廳','圖書館','宿舍交誼廳','系館走廊','校車站'];
 for(const ta of document.querySelectorAll('textarea')){i++;if(!ta.value.trim()){
  const q=ta.closest('.week2-question');const lab=q?String(q.innerText).replace(/\s+/g,' ').slice(0,18):'欄位';
  ta.value=lab+'｜驗收內容第 '+i+' 項，發生在'+places[i%5]+'，與其他欄位不同。';
  ta.dispatchEvent(new Event('input',{bubbles:true}));}}
 for(const s of document.querySelectorAll('select')){if(!s.value&&s.options.length>1){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));}}
 for(const c of document.querySelectorAll('input[type=checkbox]')){if(!c.checked&&!/一次只顯示一題|進階|自動|個資/.test((c.closest('label')||{}).innerText||''))c.click();}
 for(const r of document.querySelectorAll('input[type=radio]')){if(!document.querySelector(`input[type=radio][name="${r.name}"]:checked`))r.click();}
 await new Promise(r=>setTimeout(r,700));
});
const missing=await p.evaluate(async()=>{
 const chk=[...document.querySelectorAll('button')].find(x=>/檢查目前進度/.test(x.textContent));
 if(chk){const d=chk.closest('details');if(d)d.open=true;chk.click();await new Promise(r=>setTimeout(r,700));}
 const full=[...document.querySelectorAll('button')].find(x=>/查看整張卡還缺什麼/.test(x.textContent));
 if(full){full.click();await new Promise(r=>setTimeout(r,700));}
 return [...document.querySelectorAll('button')].filter(x=>/^前往填寫|^前往確認/.test(x.textContent.trim())).map(x=>x.textContent.trim());});
ok('B2 填滿後沒有任何缺項', missing.length===0, missing);

await p.evaluate(()=>{const s=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='儲存草稿');s&&s.click();});
await p.waitForTimeout(2500);
st=await state();
ok('B3 Week 2 草稿寫進伺服器', st.week2.some(r=>r.sid==='A113270999'), st.week2);

const submitted=await p.evaluate(async()=>{
 const d=[...document.querySelectorAll('details')].find(x=>/跳到其他步驟/.test(x.textContent));if(d)d.open=true;
 const b5=[...document.querySelectorAll('button')].find(x=>/5\. 檢查與提交/.test(x.textContent));if(b5)b5.click();
 await new Promise(r=>setTimeout(r,900));
 const sb=[...document.querySelectorAll('button')].find(x=>/^正式提交$/.test(x.textContent.trim()));
 if(!sb)return {沒有提交鈕:[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null).map(x=>x.textContent.trim()).slice(0,8)};
 sb.click();await new Promise(r=>setTimeout(r,2500));
 return {訊息:[...new Set([...document.querySelectorAll('[role="status"]')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(Boolean))].slice(0,2)};});
st=await state();
ok('B4 Week 2 正式提交成功', st.week2.some(r=>r.sid==='A113270999'&&r.status==='submitted'), {畫面:submitted, 伺服器:st.week2});

await p.reload();await p.waitForTimeout(3000);
const w2back=await p.evaluate(()=>({已填:[...document.querySelectorAll('textarea')].filter(t=>t.value.trim()).length,
 訊息:[...new Set([...document.querySelectorAll('[role="status"]')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(Boolean))].slice(0,1)}));
ok('B5 重新整理後 Week 2 內容仍在', w2back.已填>=20, w2back);

console.log(JSON.stringify({結果:R.map(x=>Object.keys(x)[0]+' '+Object.values(x)[0]), 失敗的請求:bad, 頁面錯誤:errs.filter(e=>e.indexOf('pageerror')===0)},null,1));
await b.close();
