// 課堂實況：學生提交 Week 2 後重新開頁，看不到自己寫的任何內容（整張表單被藏在「檢查與提交」那一步）。
// 期望：重新開頁要看得到答案；提交頁上要有一顆回去看答案的按鈕。
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4210';const SID='A1132709'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const tok=(await (await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true})})).json()).token;
await fetch(`${BASE}/functions/v1/Student-api`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',token:tok,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':`第 ${i} 格：校園餐廳觀察，與其他欄位不同。`])),status:'submitted'}})});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[tok,SID]);
await p.goto(`${BASE}/week.html?week=2#card`);await p.waitForTimeout(2500);
// 用「一次只顯示一題」的預設模式填滿並提交（和學生一樣）
await p.evaluate(async()=>{const g=[...document.querySelectorAll('input[type=checkbox]')].find(c=>/一次只顯示一題/.test((c.closest('label')||{}).innerText||''));if(g&&g.checked)g.click();await new Promise(r=>setTimeout(r,500));
 for(const d of document.querySelectorAll('details'))d.open=true;let i=0;for(const ta of document.querySelectorAll('textarea')){i++;if(!ta.value.trim()){ta.value='內容第 '+i+' 項，與其他欄位不同。';ta.dispatchEvent(new Event('input',{bubbles:true}));}}
 for(const s of document.querySelectorAll('select')){if(!s.value&&s.options.length>1){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}));}}
 for(const c of document.querySelectorAll('input[type=checkbox]')){if(!c.checked&&!/一次只顯示一題|進階|自動|個資/.test((c.closest('label')||{}).innerText||''))c.click();}
 for(const r of document.querySelectorAll('input[type=radio]')){if(!document.querySelector(`input[type=radio][name="${r.name}"]:checked`))r.click();}
 const g2=[...document.querySelectorAll('input[type=checkbox]')].find(c=>/一次只顯示一題/.test((c.closest('label')||{}).innerText||''));if(g2&&!g2.checked)g2.click();
 await new Promise(r=>setTimeout(r,600));
 const d=[...document.querySelectorAll('details')].find(x=>/跳到其他步驟/.test(x.textContent));if(d)d.open=true;
 const b5=[...document.querySelectorAll('button')].find(x=>/5\. 檢查與提交/.test(x.textContent));if(b5)b5.click();await new Promise(r=>setTimeout(r,800));
 const sb=[...document.querySelectorAll('button')].find(x=>/^正式提交$/.test(x.textContent.trim()));sb.click();await new Promise(r=>setTimeout(r,2500));});
const vis=()=>p.evaluate(()=>{const v=n=>n.offsetParent!==null&&!n.closest('details:not([open])');
 const back=[...document.querySelectorAll('button')].find(b=>v(b)&&/回去看／修改我填的內容/.test(b.textContent));
 return {看得到的答案格:[...document.querySelectorAll('.week2-question textarea')].filter(t=>v(t)&&t.value.trim()).length, 已提交:/已提交/.test(document.body.innerText), 有回去看答案的按鈕:!!back, 按鈕在畫面內:!!(back&&back.getBoundingClientRect().top<innerHeight&&back.getBoundingClientRect().bottom>0)};});
const afterSubmit=await vis();
await p.reload();await p.waitForTimeout(3000);
const afterReload=await vis();
const pass=afterSubmit.有回去看答案的按鈕 && afterReload.看得到的答案格>0 && afterReload.已提交;
console.log(JSON.stringify({提交後:afterSubmit,重新開頁後:afterReload,結論:pass?'✅ 提交後與重新開頁後都看得到自己的答案':'❌ 學生提交後看不到自己寫的東西'},null,1));
await b.close();process.exit(pass?0:1);
