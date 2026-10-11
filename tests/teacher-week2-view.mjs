// 教師洞察 Week 2：每位學生一張卡（Week 1＋Week 2＋AI＋審核），有進度與篩選，按「確認進入訪談」後狀態要更新。
// 先啟動：PORT=4210 node tests/serve-acceptance.mjs（已接受 teacher-token）
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4210';
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,tok)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const seed=async(sid,name,w2)=>{
 const {token}=await post('Student-api',{action:'login',student_id:sid,invite_code:'GOOD-CODE',confirm_new:true});
 await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map((k,i)=>[k,k==='team_preference'?'訪談／研究':k==='student_name'?name:`${name} 第 ${i} 格，校園餐廳觀察。`])),status:'submitted'}});
 if(!w2)return;
 const card={mode:'guided',candidates:[
   {people:`${name} 午休有連堂的大二同學`,context:'週二中午十二點，校園第一餐廳',job:'五十分鐘內吃完午餐回教室',problem:'排隊買餐就花掉二十分鐘',frequency:'每週兩到三次',cost:'常常放棄午餐',workaround:'改去便利商店買',acceptance:'貴又不健康，而且也要排',evidence:'週二親眼看到隊伍排到門口約三十人',assumption:'只有一個結帳口是主因'},
   {people:`${name} 學期初要在校外合租的同學`,context:'開學前兩週，租屋社團與房仲',job:'找到可以一起分租的室友與房子',problem:'找不到可信任的室友，資訊零散',frequency:'每學期一次',cost:'',workaround:'',acceptance:'',evidence:'',assumption:''}],
  selected:0,reason:'我可以接觸到這群人',reconsider:'若排隊不是主因就換題',statement:`${name}：午休五十分鐘的同學買餐要等二十分鐘，常常放棄午餐，仍待驗證時間代價。`,
  interviewees:['同學 A','同學 B','店員 C'],questions:['請回想最近一次排最久的那次，當時發生什麼？','那次你後來怎麼處理？花了多少時間？'],challenge:{},source:'我的親身觀察',ai_response:'',contact_confirmed:true,questions_checked:true};
 await post('week2-api',{action:'save',token,status:w2,card});
};
await seed('A113270901','甲同學','submitted');
await seed('A113270902','乙同學','draft');
await seed('A113270903','丙同學',null);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.goto(`${BASE}/index.html#teacher`);await p.waitForTimeout(1500);
await p.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d):''));
const click=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('#teacher-week2 button')].find(b=>b.textContent.trim()===t);if(!x)return '找不到：'+t;x.click();return 'ok';},t);
await click('載入／更新 Week 2');await p.waitForTimeout(1500);
const read=()=>p.evaluate(()=>({
 進度:(document.querySelector('.tw2-progress')||{}).textContent,
 卡片:[...document.querySelectorAll('.tw2-student')].map(d=>({id:d.dataset.studentId,桶:d.dataset.bucket,摘要:d.querySelector('summary').textContent.replace(/\s+/g,' ').trim().slice(0,90)})),
 狀態列:document.querySelector('#teacher-week2 [role=status]').textContent}));
const first=await read();
ok('三位學生各一張卡，進度行有數字', first.卡片.length===3 && /已交 1 人/.test(first.進度) && /還沒審 1/.test(first.進度) && /草稿中 1/.test(first.進度) && /尚未開始 1/.test(first.進度), first);
// 展開已交那張：要看到 Week 1 一句、兩個候選（暫定標記）、痛點陳述、訪談問題、三顆審核按鈕
const detail=await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.bucket==='todo');d.open=true;
 return {Week1一句:(d.querySelector('.tw2-lead')||{}).textContent, 候選數:d.querySelectorAll('.tw2-candidate').length, 有暫定標記:!!d.querySelector('.tw2-picked'),
  痛點陳述:(d.querySelector('.tw2-statement')||{}).textContent?.slice(0,30), 訪談題:[...d.querySelectorAll('.tw2-core p')].some(p=>/訪談問題：\(1\)/.test(p.textContent)),
  審核按鈕:[...d.querySelectorAll('.tw2-actions button')].map(b=>b.textContent.trim())};});
ok('展開後 Week 1＋Week 2＋審核都在同一張卡', /甲同學 第 4 格/.test(detail.Week1一句||'') && detail.候選數===2 && detail.有暫定標記 && /甲同學：午休/.test(detail.痛點陳述||'') && detail.訪談題 && detail.審核按鈕.length===3, detail);
// 篩選「已交、還沒審」只剩一張
await p.evaluate(()=>[...document.querySelectorAll('.tw2-filters button')].find(b=>b.textContent==='已交、還沒審').click());await p.waitForTimeout(300);
ok('篩選只顯示還沒審的', (await read()).卡片.length===1);
await p.evaluate(()=>[...document.querySelectorAll('.tw2-filters button')].find(b=>b.textContent==='全部').click());await p.waitForTimeout(300);
// 寫回饋並確認進入訪談
await p.evaluate(()=>{const d=[...document.querySelectorAll('.tw2-student')].find(x=>x.dataset.bucket==='todo');d.open=true;d.querySelector('.tw2-review textarea').value='痛點很具體，下週訪談時請追問時間代價。';});
await click('確認進入訪談');await p.waitForTimeout(1800);
const after=await read();
const card=after.卡片.find(c=>c.id==='A113270901');
const stillOpen=await p.evaluate(()=>{const d=document.querySelector('.tw2-student[data-student-id="A113270901"]');return {展開著:d.open, 目前:(d.querySelector('.tw2-current')||{}).textContent};});
ok('確認後：徽章變已確認、進度已確認 1、卡片仍展開、回饋已存', card&&card.桶==='approved' && /已確認進入訪談 1/.test(after.進度) && stillOpen.展開著 && /痛點很具體/.test(stillOpen.目前), {card,進度:after.進度,stillOpen});
// 伺服器端真的存了
const st=await fetch(`${BASE}/_state`).then(r=>r.json());
ok('Week 2 卡在伺服器上仍是 submitted（審核不改學生版本）', st.week2.find(r=>r.sid==='A113270901')?.status==='submitted');
// 草稿那張不能被確認
await p.evaluate(()=>{const d=document.querySelector('.tw2-student[data-student-id="A113270902"]');d.open=true;});
await p.evaluate(()=>{const d=document.querySelector('.tw2-student[data-student-id="A113270902"]');[...d.querySelectorAll('.tw2-actions button')].find(b=>b.textContent==='確認進入訪談').click();});await p.waitForTimeout(800);
const msg=await p.evaluate(()=>document.querySelector('#teacher-week2 [role=status]').textContent);
ok('草稿不能被確認，狀態列說明原因', /還沒正式提交/.test(msg), msg);
const pass=R.every(x=>x.startsWith('✅'))&&errs.length===0;
console.log(JSON.stringify({結果:R,頁面錯誤:errs},null,1));await b.close();process.exit(pass?0:1);
