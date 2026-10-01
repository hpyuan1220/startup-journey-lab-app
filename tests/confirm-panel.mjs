// 手機寬度：按「檢查我的痛點，取得 AI 建議」之後，確認面板的標題和兩顆按鈕必須都在畫面內。
// 真機量到面板高 2300px+（整份卡片 JSON 攤開），置中捲動後學生只看到一片 JSON，以為按了沒反應。
// 先啟動：PORT=4210 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4210';
const SID='A113270997';
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const lr=await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true})});
const tok=(await lr.json()).token;
const sub=Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':`第 ${i} 格：發生在校園餐廳，內容與其他欄位不同。`]));
await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',token:tok,submission:{...sub,status:'submitted'}})});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[tok,SID]);
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(2500);
await p.evaluate(async()=>{
 const g=[...document.querySelectorAll('input[type=checkbox]')].find(c=>/一次只顯示一題/.test((c.closest('label')||{}).innerText||''));if(g&&g.checked)g.click();
 await new Promise(r=>setTimeout(r,600));for(const d of document.querySelectorAll('details'))d.open=true;
 let i=0;for(const ta of document.querySelectorAll('textarea')){i++;if(!ta.value.trim()){ta.value='內容第 '+i+' 項，與其他欄位不同。';ta.dispatchEvent(new Event('input',{bubbles:true}));}}
 for(const s of document.querySelectorAll('select')){if(!s.value&&s.options.length>1){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));}}
 for(const c of document.querySelectorAll('input[type=checkbox]')){if(!c.checked&&!/一次只顯示一題|進階|自動|個資/.test((c.closest('label')||{}).innerText||''))c.click();}
 for(const r of document.querySelectorAll('input[type=radio]')){if(!document.querySelector(`input[type=radio][name="${r.name}"]:checked`))r.click();}
 await new Promise(r=>setTimeout(r,800));});
const result=await p.evaluate(async()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const vis=n=>n.offsetParent!==null&&!n.closest('details:not([open])');
 const click=t=>{const x=[...document.querySelectorAll('button')].find(b=>vis(b)&&new RegExp(t).test(b.textContent));if(!x)return '找不到可見的：'+t;x.scrollIntoView({block:'center'});x.click();return 'ok';};
 // 像學生一樣先跳到「AI 建議與修訂」那一步（它是獨立步驟，不在主流程畫面上）
 const d=[...document.querySelectorAll('details')].find(x=>/跳到其他步驟/.test(x.textContent));if(d)d.open=true;
 const s0=click('AI 建議與修訂');await sleep(800);
 const s1=click('我要使用 AI：展開選項');await sleep(500);
 const pc=document.querySelector('#week2-privacy');if(pc&&!pc.checked)pc.click();
 const s2=click('檢查我的痛點，取得 AI 建議');await sleep(1200);
 const dlg=document.querySelector('[role="dialog"]');if(!dlg)return {步驟:[s0,s1,s2],面板:'沒有出現'};
 const r=dlg.getBoundingClientRect();const h=dlg.querySelector('h3').getBoundingClientRect();
 const btns=[...dlg.querySelectorAll('button')].map(x=>{const q=x.getBoundingClientRect();return {字:x.textContent.trim(),top:Math.round(q.top),bottom:Math.round(q.bottom)};});
 const inView=q=>q.top>=0&&q.bottom<=innerHeight;
 return {步驟:[s0,s1,s2],面板高:Math.round(r.height),標題在畫面內:inView(h),按鈕:btns,按鈕都在畫面內:btns.every(inView),視窗高:innerHeight,焦點在面板內:dlg.contains(document.activeElement)};});
const pass=result.標題在畫面內&&result.按鈕都在畫面內;
console.log(JSON.stringify({...result,結論:pass?'✅ 確認面板一個螢幕放得下，標題與按鈕都看得到':'❌ 學生按了之後看不到標題或按鈕'},null,1));
await b.close();process.exit(pass?0:1);
