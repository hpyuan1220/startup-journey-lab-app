// 回看前幾週＋登入失效（2026-10-16）：已交的 Week 2 頂端有整張卡；痛點 1 不再說「延續 Week 1」；Week 3 可展開 Week 1／2；
// 換裝置登入讓舊登入作廢後，Week 2／3 顯示「重新進入（資料都在）」，按了、登入完自動回 Week 3。合成學號，不碰正式資料。
// 先啟動：PORT=4302 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4302';const SID='A1132709'+String(Date.now()%100).padStart(2,'0');const SID2='A1132708'+String(Date.now()%100).padStart(2,'0');
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
const tok=await seed(SID,true);const tokNew=await seed(SID2,false);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(c||d===undefined?'':' '+JSON.stringify(d)));
const open=async(token,sid,path,w=390,h=844)=>{const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
 if(token)await p.addInitScript(([t,s])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));sessionStorage.setItem('seeded','1');}},[token,sid]);
 await p.goto(`${BASE}/${path}`);await p.waitForTimeout(2200);return {p,errs,ctx};};
const wide=p=>p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
// 1) 已交的 Week 2：頂端有整張卡
let {p,errs}=await open(tok,SID,'week.html?week=2#card');
let s=await p.evaluate(()=>{const box=document.querySelector('#week2-summary');const sumOpen=box?.querySelector('details')?.open;const first=document.querySelector('details.candidate summary')?.textContent||'';
 return {shown:!!box&&!box.hidden,open:sumOpen,text:box?.innerText||'',beforeIntro:box&&box.previousElementSibling?.id==='week2-quality',first,hint:document.body.innerText.includes('已帶入可用的 Week 1 內容')};});
ok('已交的 Week 2：頂端摘要卡出現並展開',s.shown&&s.open,s);
ok('摘要有狀態、痛點陳述、選中的痛點、另一題、受訪者、訪談題',/已交 · 老師還沒看 · 版本 1/.test(s.text)&&/午休五十分鐘的同學/.test(s.text)&&/痛點 1 · 我選這一題/.test(s.text)&&/找不到可信任的室友/.test(s.text)&&/餐廳店員 C/.test(s.text)&&/排最久的那次/.test(s.text),s.text.slice(0,300));
ok('摘要緊接在完成度卡下面（開頁會捲到這裡）',s.beforeIntro,s);
ok('開頁時摘要的標題在畫面內',await p.evaluate(()=>{const r=document.querySelector('#week2-summary summary').getBoundingClientRect();return r.top>=0&&r.top<innerHeight;}));
ok('痛點 1 標題不再寫「延續 Week 1」，改成自己的阻礙',!/延續 Week 1/.test(s.first)&&/排隊買餐/.test(s.first),s.first);
ok('已有雲端卡的人看不到「已帶入可用的 Week 1 內容」',!s.hint);
ok('Week 2 頁 390px 無橫向捲動',!(await wide(p)));
if(process.env.SHOT_DIR)await p.screenshot({path:process.env.SHOT_DIR+'/week2-summary.png'});
const btn=await p.evaluate(()=>{const b=[...document.querySelectorAll('#week2-summary button')].find(x=>/往下到填答區/.test(x.textContent));if(!b)return null;const y0=scrollY;b.click();return y0;});
await p.waitForTimeout(300);ok('「往下到填答區」按了會捲下去',btn!==null&&await p.evaluate(y=>scrollY>y+200,btn));
ok('Week 2 頁沒有 JS 錯誤',!errs.length,errs);
// 2) 還沒有 Week 2 的人：照舊
({p,errs}=await open(tokNew,SID2,'week.html?week=2#card'));
s=await p.evaluate(()=>({shown:!document.querySelector('#week2-summary')?.hidden,first:document.querySelector('details.candidate summary')?.textContent||'',hint:document.body.innerText.includes('已帶入可用的 Week 1 內容')}));
ok('第一次填的人：沒有摘要卡、痛點 1 仍寫「延續 Week 1」並有帶入說明',!s.shown&&/延續 Week 1/.test(s.first)&&s.hint,s);
// 3) Week 3 回看
({p,errs}=await open(tok,SID,'week.html?week=3#card'));
s=await p.evaluate(()=>{const box=document.querySelector('#week3-prior');const ds=[...(box?.querySelectorAll('details')||[])];return {shown:box&&!box.hidden,n:ds.length,titles:ds.map(d=>d.querySelector('summary').textContent),closed:ds.every(d=>!d.open),afterMsg:box?.previousElementSibling?.getAttribute('role')==='status'};});
ok('Week 3 頂端有「回看我前兩週的卡」：兩個區塊、預設收起',s.shown&&s.n===2&&s.closed&&/Week 2 痛點卡 · 已交/.test(s.titles[0])&&/Week 1 起點卡 · 已交/.test(s.titles[1]),s);
s=await p.evaluate(()=>{const ds=[...document.querySelectorAll('#week3-prior details')];ds.forEach(d=>d.open=true);return ds.map(d=>d.innerText);});
ok('展開後看得到 Week 2 的陳述與受訪者、Week 1 的觀察',/午休五十分鐘的同學/.test(s[0])&&/通勤同學 B/.test(s[0])&&/第 4 格：校園餐廳觀察/.test(s[1]),s.map(x=>x.slice(0,120)));
ok('Week 3 準備單照常帶出',await p.evaluate(()=>/午休有連堂的大二同學/.test(document.querySelector('#week3-sheet')?.innerText||'')));
ok('Week 3 頁 390px 無橫向捲動',!(await wide(p)));
ok('Week 3 頁沒有 JS 錯誤',!errs.length,errs);
if(process.env.SHOT_DIR)await p.screenshot({path:process.env.SHOT_DIR+'/week3-prior.png'});
// 4) 換裝置登入：舊登入作廢
await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE'});
({p,errs}=await open(tok,SID,'week.html?week=2#card'));
s=await p.evaluate(()=>{const c=document.querySelector('.relogin-card');return {card:!!c,text:c?.innerText||'',href:c?.querySelector('a')?.getAttribute('href'),reload:[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='重新載入')};});
ok('舊裝置開 Week 2：出現「重新進入（資料都在）」卡，連到 return=week2',s.card&&/資料都在/.test(s.text)&&s.href==='index.html?return=week2#student',s);
ok('舊裝置開 Week 2：不再出現沒用的「重新載入」',!s.reload);
({p,errs}=await open(tok,SID,'week.html?week=3#card'));
s=await p.evaluate(()=>{const c=document.querySelector('.relogin-card');return {card:!!c,href:c?.querySelector('a')?.getAttribute('href'),body:document.querySelector('#week-three').innerText,pre:document.querySelector('.preclass-msg')?.textContent||''};});
ok('舊裝置開 Week 3：有重新進入卡，連到 return=week3',s.card&&s.href==='index.html?return=week3#student',s.href);
ok('舊裝置開 Week 3：不再說「先填 Week 2 痛點卡」',!/先填 Week 2 痛點卡/.test(s.body)&&!/先填 Week 2/.test(s.pre),s.pre);
if(process.env.SHOT_DIR)await p.screenshot({path:process.env.SHOT_DIR+'/week3-relogin.png'});
// 5) 按「重新進入」→ 登入 → 自動回 Week 3
await p.click('.relogin-go');await p.waitForTimeout(1500);
s=await p.evaluate(()=>({url:location.href,stored:localStorage.getItem('sjl-student-session'),gate:!document.querySelector('#student-gate').hidden,msg:document.querySelector('#access-message').textContent}));
ok('按了之後：舊登入清掉、到學生入口登入格、說明會自動回去',/index\.html\?return=week3#student$/.test(s.url)&&s.stored===null&&s.gate&&/自動回到/.test(s.msg),s);
await p.fill('#access-student-id',SID);await p.fill('#access-code','GOOD-CODE');await p.click('#student-enter');await p.waitForTimeout(3000);
s=await p.evaluate(()=>({url:location.href,sheet:document.querySelector('#week3-sheet')?.innerText||'',relogin:!!document.querySelector('.relogin-card')}));
ok('登入後自動回到 Week 3，準備單帶出、沒有重新進入卡',/week\.html\?week=3#card$/.test(s.url)&&/午休有連堂的大二同學/.test(s.sheet)&&!s.relogin,{url:s.url,relogin:s.relogin});
// 6) 一般登入（沒有 return）仍停在 Week 1
({p}=await open(null,null,'index.html#student'));
await p.fill('#access-student-id',SID2);await p.fill('#access-code','GOOD-CODE');await p.click('#student-enter');await p.waitForTimeout(2500);
ok('沒有 return 參數：登入後照舊停在 Week 1 起點卡',/index\.html#student$/.test(await p.evaluate(()=>location.href)));
({p}=await open(null,null,'index.html?return=https://evil.example#student'));
await p.fill('#access-student-id',SID2);await p.fill('#access-code','GOOD-CODE');await p.click('#student-enter');await p.waitForTimeout(2500);
ok('return 亂填外部網址：不跳走',/^http:\/\/127\.0\.0\.1/.test(await p.evaluate(()=>location.href)));
await b.close();
console.log(R.join('\n'));console.log(`${R.filter(x=>x.startsWith('✅')).length}/${R.length}`);
process.exit(R.some(x=>x.startsWith('❌'))?1:0);
