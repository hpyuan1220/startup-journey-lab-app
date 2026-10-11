// 全班痛點普查：老師載入預設題、儲存開放；學生填（遇過才展開細節、願意要代稱）、送出後看到名單；第二位填完彙總更新；老師看到幾人遇過與姓名。
// 先啟動：PORT=4251 node tests/serve-acceptance.mjs（新 port；不要跟跑過 teacher-roster 的伺服器共用）
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4251';const SID='A1132709'+String(Date.now()%100).padStart(2,'0');const SID2='A1132708'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,tok)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify(body)}).then(r=>r.json());
async function seed(sid,name){const {token}=await post('Student-api',{action:'login',student_id:sid,invite_code:'GOOD-CODE',confirm_new:true});
 await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':k==='student_name'?name:`第 ${i} 格。`])),status:'submitted'}});return token;}
const tok=await seed(SID,'普查甲'),tok2=await seed(SID2,'普查乙');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d):''));
const click=(p,scope,t)=>p.evaluate(([scope,t])=>{const x=[...document.querySelectorAll(scope+' button')].find(b=>b.textContent.trim()===t);if(!x)return '找不到：'+t;x.click();return 'ok';},[scope,t]);
// 老師：載入預設、儲存
const tctx=await b.newContext({viewport:{width:1280,height:900}});const tp=await tctx.newPage();const terrs=[];tp.on('pageerror',e=>terrs.push(String(e).slice(0,160)));
await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(1200);
await tp.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});
await click(tp,'#teacher-week2','載入／更新 Week 2');await tp.waitForTimeout(1500);
let t=await tp.evaluate(()=>({summary:document.querySelector('.tw2-survey summary')?.textContent,hasDefaultBtn:[...document.querySelectorAll('.tw2-survey button')].some(b=>/載入預設/.test(b.textContent))}));
ok('老師：普查面板顯示「還沒開放」、有載入預設鈕', /還沒開放/.test(t.summary||'')&&t.hasDefaultBtn, t);
await tp.evaluate(()=>{document.querySelector('.tw2-survey').open=true;document.querySelector('.tw2-survey-edit').open=true;});
await click(tp,'.tw2-survey','載入預設 22 題');await tp.waitForTimeout(300);
// 改第一題文字、刪掉最後一題、加一題
await tp.evaluate(()=>{const ta=document.querySelector('.tw2-survey-textarea');const lines=ta.value.split('\n');lines[0]='1 分組：約開會時間｜老師改過';lines.pop();lines.push('校內 Wi-Fi 常斷線｜上課連不上');ta.value=lines.join('\n');});
await click(tp,'.tw2-survey','儲存題目並開放');await tp.waitForTimeout(1500);
t=await tp.evaluate(()=>({summary:document.querySelector('.tw2-survey summary')?.textContent,rows:[...document.querySelectorAll('.tw2-survey-table tbody tr')].map(r=>r.children[0].textContent),status:document.querySelector('#teacher-week2 [role=status]').textContent}));
ok('老師：儲存後 22 題開放（改字、關一題、加一題都生效）', /22 題 · 0 人已填/.test(t.summary||'')&&t.rows.includes('分組：約開會時間')&&t.rows.includes('校內 Wi-Fi 常斷線')&&!t.rows.includes('陌生開發開不了口'), {summary:t.summary,n:t.rows.length});
// 學生甲填
const open=async(token,sid)=>{const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
 await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[token,sid]);
 await p.goto(`${BASE}/week.html?week=3#card`);await p.waitForTimeout(2200);return {p,errs};};
let {p,errs}=await open(tok,SID);
let s=await p.evaluate(()=>({shown:!document.querySelector('#week3-survey').hidden,open:document.querySelector('.week3-survey-form').open,topics:document.querySelectorAll('.week3-survey-topic').length,detailHidden:document.querySelector('.week3-survey-detail').hidden,summaryText:document.querySelector('.week3-survey-form summary').textContent}));
ok('學生：普查在最上面、預設展開、22 題、細節先收起', s.shown&&s.open&&s.topics===22&&s.detailHidden&&/填普查/.test(s.summaryText), s);
// 勾願意但沒代稱 → 擋
await p.evaluate(()=>{const r=document.querySelector('.week3-survey-topic[data-topic-id="1"]');r.querySelector('input[value=yes]').click();r.querySelector('[data-key=cost]').value='3 天';r.querySelector('.week3-survey-willing input').click();
 const r2=document.querySelector('.week3-survey-topic[data-topic-id="2"]');r2.querySelector('input[value=no]').click();});
s=await p.evaluate(()=>({detailShown:!document.querySelector('.week3-survey-topic[data-topic-id="1"] .week3-survey-detail').hidden}));
ok('學生：選「遇過」才展開細節', s.detailShown, s);
await click(p,'#week3-survey','送出普查');await p.waitForTimeout(600);
s=await p.evaluate(()=>document.querySelector('#week-three [role=status]').textContent);
ok('學生：勾願意但沒代稱 → 擋下並要代稱', /代稱/.test(s), s);
await p.evaluate(()=>{document.querySelector('#week3-survey input[maxlength="20"]').value='座號 7';});
await click(p,'#week3-survey','送出普查');await p.waitForTimeout(1500);
s=await p.evaluate(()=>({status:document.querySelector('#week-three [role=status]').textContent,open:document.querySelector('.week3-survey-form').open,summaryText:document.querySelector('.week3-survey-form summary').textContent,row1:document.querySelector('.week3-survey-result tr[data-topic-id="1"]')?.textContent,lead:document.querySelector('.week3-survey-lead').textContent}));
ok('學生甲送出：表單收起、結果表第一題 1 人遇過、願意被問列出代稱、提示還有幾題沒選', /普查已送出（還有 20 題沒選/.test(s.status)&&!s.open&&/修改我的回答/.test(s.summaryText)&&/1 人/.test(s.row1||'')&&/座號 7/.test(s.row1||'')&&/1 位同學已填/.test(s.lead), s);
// 學生乙填
const o2=await open(tok2,SID2);
await o2.p.evaluate(()=>{document.querySelector('#week3-survey input[maxlength="20"]').value='小魚';for(const id of [1,3]){const r=document.querySelector(`.week3-survey-topic[data-topic-id="${id}"]`);r.querySelector('input[value=yes]').click();r.querySelector('.week3-survey-willing input').click();}});
await click(o2.p,'#week3-survey','送出普查');await o2.p.waitForTimeout(1500);
s=await o2.p.evaluate(()=>({row1:document.querySelector('.week3-survey-result tr[data-topic-id="1"]')?.textContent,row3:document.querySelector('.week3-survey-result tr[data-topic-id="3"]')?.textContent,lead:document.querySelector('.week3-survey-lead').textContent,first:document.querySelector('.week3-survey-result tbody tr')?.dataset.topicId}));
ok('學生乙送出：第一題 2 人（座號 7、小魚）、第三題 1 人、名單依人數排序、2 位已填', /2 人/.test(s.row1||'')&&/座號 7、小魚/.test(s.row1||'')&&/1 人/.test(s.row3||'')&&s.first==='1'&&/2 位同學已填/.test(s.lead), s);
// 甲重新開頁：答案還在、可以改
await p.reload();await p.waitForTimeout(2200);
s=await p.evaluate(()=>{const r=document.querySelector('.week3-survey-topic[data-topic-id="1"]');return {yes:r.querySelector('input[value=yes]').checked,cost:r.querySelector('[data-key=cost]').value,willing:r.querySelector('.week3-survey-willing input').checked,alias:document.querySelector('#week3-survey input[maxlength="20"]').value,open:document.querySelector('.week3-survey-form').open};});
ok('學生甲重新開頁：回答都在、表單收起', s.yes&&s.cost==='3 天'&&s.willing&&s.alias==='座號 7'&&!s.open, s);
ok('學生端沒有 JS 錯誤', errs.length===0&&o2.errs.length===0, errs.concat(o2.errs));
// 老師看結果
await click(tp,'#teacher-week2','載入／更新 Week 2');await tp.waitForTimeout(1500);
t=await tp.evaluate(()=>{document.querySelector('.tw2-survey').open=true;const r=document.querySelector('.tw2-survey-table tr[data-topic-id="1"]');const d=r.querySelector('details');if(d)d.open=true;return {summary:document.querySelector('.tw2-survey summary').textContent,row1:r.textContent.replace(/\s+/g,' ')};});
ok('老師：面板顯示 2 人已填；第一題 2 人遇過、願意兩位、展開看到學生姓名與代價', /2 人已填/.test(t.summary)&&/2 \/ 2/.test(t.row1)&&/座號 7、小魚/.test(t.row1)&&/普查甲（3 天）/.test(t.row1)&&/普查乙/.test(t.row1), t);
ok('老師端沒有 JS 錯誤', terrs.length===0, terrs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
