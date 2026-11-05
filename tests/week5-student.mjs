// Week 5 學生端煙霧測試（真瀏覽器，對 serve-acceptance 的記憶體資料）。
// 先啟動：PORT=4251 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4251';const SID='A1132705'+String(Date.now()%100).padStart(2,'0');
const post=(path,body,jwt)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
// Week 4 先有三個機會（卡 3）與卡 1／2，比較頁才有東西
await post('week2-api',{action:'week4_save',token,version:null,data:{pain:'午休排隊 20 分鐘',industry:{card:1},card1:{text:'老闆付外送抽成三成',source:'gemini'},card2:{text:'外送抽成 30%（來源：聯合報）',source:'notebooklm'},card3:{text:'',source:'gpt',opps:['滷味攤尖峰出餐慢 → 校園周邊小吃店老闆','外送抽成高 → 有外送的小店','接單漏單 → 用 LINE 接預訂的店']}}});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,220):''));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));window.open=()=>null;},[token,SID]);
await p.goto(`${BASE}/week.html?week=5#card`);await p.waitForTimeout(1500);
ok('頁面有兩題、三個機會、計分表、選一個、反方、一頁',await p.evaluate(()=>document.querySelectorAll('#week-five .w4-q').length===2&&document.querySelectorAll('.w5-opp').length===3&&document.querySelectorAll('.w5-q').length===5&&!!document.querySelector('.w5-choice')&&!!document.querySelector('textarea[aria-label="反方紀錄 貼回"]')&&document.querySelectorAll('.w5-para').length===6));
ok('三個機會從 Week 4 卡 3 帶出',await p.evaluate(()=>[...document.querySelectorAll('.w5-opp input')].map(i=>i.value)[0].startsWith('滷味攤')));
ok('每題的 0／1／2 意思一直顯示、按鈕有提示',await p.evaluate(()=>document.querySelectorAll('.w5-q .w5-legend').length===5&&document.querySelector('.w5-q').querySelectorAll('.w5-lg').length===3&&/已經有人付錢/.test(document.querySelector('.w5-q .w5-legend').textContent)&&/2 分＝/.test(document.querySelector('.w5-sbtn[aria-label$="2 分"]').title)));
ok('Week 5 預設兩題',await p.evaluate(()=>/earlyvangelist/.test(document.querySelector('#week-five .w4-q-title').textContent)));
ok('完成狀態：一開始列出差什麼',await p.evaluate(()=>/還沒完成/.test(document.querySelector('#week-five .w4-done-title').textContent)));
// 打分：A 全 2、B 全 1、C 全 0，每格寫證據
await p.evaluate(()=>{for(const [k,v] of [['A',2],['B',1],['C',0]])for(let i=0;i<5;i++){const q=document.querySelectorAll('.w5-q')[i];const cell=[...q.querySelectorAll('.w5-cell')].find(c=>c.querySelector('.w5-opp-k').textContent===k);cell.querySelectorAll('.w5-sbtn')[v].click();const inp=cell.querySelector('input');inp.value=k==='C'?'估計':'外送抽成 30%（來源：聯合報）';inp.dispatchEvent(new Event('input',{bubbles:true}));}});
await p.waitForTimeout(300);
ok('總分：A 10、B 5、C 0；最高分是 A',await p.evaluate(()=>{const t=[...document.querySelectorAll('.w5-total')].map(x=>x.textContent.replace(/\s/g,''));return /機會A10\/10/.test(t[0])&&/機會B5\/10/.test(t[1])&&document.querySelector('.w5-total.is-top b').textContent==='機會 A'&&/最高分是機會 A/.test(document.body.textContent);}));
// 選 B（非最高分）→ 要理由
await p.check('input[name="w5-choice"][value="B"]');await p.waitForTimeout(200);
ok('選非最高分：理由框出現，完成狀態提醒要理由',await p.evaluate(()=>!document.querySelector('.w5-reason').hidden&&/要寫理由/.test(document.querySelector('#week-five .w4-done-title').textContent)));
await p.fill('textarea[aria-label="選非最高分的理由"]','機會 B 分數低是因為為什麼是現在只有 1 分，但我接觸得到第一個付錢的人，而且已經有兩家店說願意試。');
// 反方：按鈕會組 prompt（含機會 B 與證據）
await p.click('.w4-askcard .w4-go');await p.waitForTimeout(500);
const promptTxt=await p.evaluate(()=>document.querySelector('.w4-askcard .w4-prompt textarea')?.value||'');
ok('反方 prompt 帶入選的機會與五格證據、要求三回合與【反方紀錄】',/外送抽成高/.test(promptTxt)&&/【拒絕 n】/.test(promptTxt)&&/【反方紀錄】/.test(promptTxt)&&/1\. 有人正在為它花錢嗎：1 分｜證據：外送抽成/.test(promptTxt),promptTxt.slice(0,120));
await p.fill('textarea[aria-label="反方紀錄 貼回"]','【反方紀錄】\n拒絕 1：我用 LINE 接單就好了，不花錢。\n我的回應 1：你上個月漏單 12 筆（來源：訪談）。\n拒絕 2：學生做的我不信。\n我的回應 2：先免費幫你做兩週。\n拒絕 3：平台抽三成我都付了。\n我的回應 3：這題我沒證據。\n總結：第一回合說服了我，第三回合沒有；最該補的是抽成對比的數字。');
await p.waitForTimeout(300);
ok('反方紀錄解析出三回合與總結',await p.evaluate(()=>document.querySelectorAll('.w5-round').length===3&&/最該補/.test(document.querySelector('.w5-sum').textContent)));
// 一頁：草稿
await p.click('.w5-draft');await p.waitForTimeout(200);
const paras=await p.evaluate(()=>[...document.querySelectorAll('.w5-para textarea')].map(t=>t.value));
ok('草稿用的是機會 B 的證據、第六段帶反方三回合',/機會 B：外送抽成高/.test(paras[0])&&/外送抽成 30%/.test(paras[1])&&/反方第 1 回合/.test(paras[5])&&paras.filter(x=>x.length>=20).length===6,paras.map(x=>x.slice(0,30)));
await p.waitForTimeout(2500);
const st=await p.evaluate(()=>({done:document.querySelector('#week-five .w4-done').dataset.state,title:document.querySelector('#week-five .w4-done-title').textContent,save:document.querySelector('#week-five .w4-save').textContent,prog:document.querySelector('#week-five .w4-prog').textContent}));
ok('全部填完：完成狀態變綠、已存',st.done==='done'&&/已存雲端/.test(st.title)&&st.save==='已存',st);
await p.reload();await p.waitForTimeout(1500);
const after=await p.evaluate(()=>({choice:document.querySelector('input[name="w5-choice"]:checked')?.value,reason:document.querySelector('textarea[aria-label="選非最高分的理由"]').value.length,rounds:document.querySelectorAll('.w5-round').length,scoreA:document.querySelector('.w5-total b').textContent,paras:[...document.querySelectorAll('.w5-para textarea')].filter(t=>t.value.length>=20).length,done:document.querySelector('#week-five .w4-done').dataset.state}));
ok('重開頁：選擇、理由、反方、分數、一頁都在',after.choice==='B'&&after.reason>20&&after.rounds===3&&after.paras===6&&after.done==='done',after);
// 研究筆記 v2 草稿（跟 Week 4 一樣）
await p.evaluate(()=>[...document.querySelectorAll('#week-five button')].find(b=>/研究筆記 v2 草稿/.test(b.textContent)).click());await p.waitForTimeout(1200);
const nv=await p.evaluate(()=>{const ta=document.querySelector('textarea[aria-label="研究筆記 v2 草稿"]');return {shown:!!ta&&!ta.closest('.w4-draft-out').hidden,t:ta?.value||'',btns:[...ta.closest('.w4-draft-out').querySelectorAll('button')].map(b=>b.textContent),tpl:!!document.querySelector('#week-five a[href*="研究筆記v2範本"]')};});
ok('研究筆記 v2 草稿：帶出 Week 4 卡 1、這頁計分與反方、九段齊全；有複製全文、下載 Word、空白範本',nv.shown&&/老闆付外送抽成三成/.test(nv.t)&&/6　五問計分表/.test(nv.t)&&/8　反方紀錄/.test(nv.t)&&/拒絕 1/.test(nv.t)&&/機會 B（總分 5／10/.test(nv.t)&&nv.btns.some(b=>/複製全文/.test(b))&&nv.btns.some(b=>/下載成 Word/.test(b))&&nv.tpl,{len:nv.t.length,btns:nv.btns,head:nv.t.slice(0,80)});
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null),p.evaluate(()=>[...document.querySelectorAll('.w4-draft-out button')].find(b=>/下載成 Word/.test(b.textContent)).click())]);
ok('下載 Word：檔名 Week5_research_note_v2_學號.doc',!!dl&&/^Week5_research_note_v2_A1132705\d\d\.doc$/.test(dl.suggestedFilename()),dl&&dl.suggestedFilename());
// 期中：2 分鐘講稿＋Week 7 說明頁
await p.evaluate(()=>[...document.querySelectorAll('#week-five button')].find(b=>/2 分鐘口頭報告講稿/.test(b.textContent)).click());await p.waitForTimeout(1200);
const mt=await p.evaluate(()=>{const ta=document.querySelector('textarea[aria-label="2 分鐘講稿"]');return {t:ta?.value||'',count:ta?.closest('.w4-draft-out').querySelector('.w4-hint')?.textContent||'',w7:!!document.querySelector('#week-five a[href="week.html?week=7"]')};});
ok('2 分鐘講稿：四段、帶 Week 4 產業線與這頁選的機會 B、反方最後一回合、有字數與秒數、連到 Week 7',(mt.t.match(/【/g)||[]).length===4&&/餐飲小店/.test(mt.t)&&/我選的是機會 B/.test(mt.t)&&/老闆說：「/.test(mt.t)&&/約 \d+ 字/.test(mt.count)&&/秒/.test(mt.count)&&mt.w7,{head:mt.t.slice(0,200),count:mt.count});
await p.goto(`${BASE}/week.html?week=7`);await p.waitForTimeout(800);
const w7=await p.evaluate(()=>{const s=document.querySelector('#week-seven-materials');return {shown:!!s&&!s.hidden,txt:s?.innerText.replace(/\s+/g,' ').slice(0,300)||'',rows:s?s.querySelectorAll('tbody tr').length:0,link:!!s?.querySelector('a[href="week.html?week=5#card"]'),title:document.querySelector('#week-title')?.textContent||''};});
ok('Week 7 頁：期中說明（九段＋四段表、11/13 13:00–17:00、依學號、連到 Week 5）',w7.shown&&w7.rows===14&&/13:00–17:00/.test(w7.txt)&&/依學號/.test(w7.txt)&&w7.link&&/期中/.test(w7.title),w7);
await p.goto(`${BASE}/week.html?week=5#card`);await p.waitForTimeout(1200);
// 教師端
const t=await post('week2-api',{action:'teacher_load'},'teacher-token');
ok('teacher_load 有 week5 一列',Array.isArray(t.week5)&&t.week5.some(r=>r.student_id===SID));
// 教師頁：Week 5 區在最上、一人一列、點開看計分與反方、CSV 有 W5 欄
const tp=await ctx.newPage();tp.on('pageerror',e=>errs.push('T:'+String(e).slice(0,200)));
await tp.addInitScript(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');});
await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(800);
await tp.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await tp.waitForTimeout(1800);
const tv=await tp.evaluate(()=>{const s5=document.querySelector('#teacher-week5'),s4=document.querySelector('#teacher-week4');return {first:s5&&s4&&s5.compareDocumentPosition(s4)&Node.DOCUMENT_POSITION_FOLLOWING,rows:s5.querySelectorAll('tbody tr').length,txt:s5.querySelector('tbody').innerText.replace(/\s+/g,' ').slice(0,400)};});
ok('教師端 Week 5 區排在 Week 4 前、一人一列有分數與選擇',!!tv.first&&tv.rows>=1&&/A 10 · B 5 · C 0/.test(tv.txt)&&/非最高分（有理由）/.test(tv.txt),tv);
await tp.click('#teacher-week5 tbody tr td button');await tp.waitForTimeout(300);
const det=await tp.evaluate(()=>document.querySelector('#teacher-week5 .tw4-detail')?.innerText||'');
ok('點開：看得到五格證據、理由、反方三回合、一頁',/機會 B 計分/.test(det)&&/選非最高分的理由/.test(det)&&/拒絕 1/.test(det)&&/一頁六段/.test(det));
const csv=await tp.evaluate(async()=>{let got='';const orig=URL.createObjectURL;URL.createObjectURL=b=>{got=b;return 'blob:x';};HTMLAnchorElement.prototype.click=function(){};document.querySelector('#teacher-week4 button[title*="Week 1–5"]').click();await new Promise(r=>setTimeout(r,300));return got?await got.text():'';});
const fold=await tp.evaluate(async()=>{const r={};for(const w of [5,4,2,1]){const sec=document.querySelector('#teacher-week'+w);const b=sec?.querySelector('h2 .tfold');if(!b){r[w]='no-btn';continue;}b.click();await new Promise(r=>setTimeout(r,50));const kids=[...sec.children].filter(c=>c.tagName!=='H2');const hid=kids.length>0&&kids.every(c=>c.hidden);const t1=b.textContent;b.click();await new Promise(r=>setTimeout(r,50));r[w]={hid,t1,t2:b.textContent,shown:kids.every(c=>!c.hidden)};}return r;});
ok('教師端 Week 5／4／2／1 標題旁都有收合：收合後整區隱藏、再按展開',[5,4,2,1].every(w=>fold[w]&&fold[w].hid&&fold[w].t1==='展開'&&fold[w].t2==='收合'&&fold[w].shown),fold);
ok('CSV 有 Week 5 欄位與這位學生的分數',/W5 A 分,W5 B 分,W5 C 分,W5 選,W5 非最高分/.test(csv)&&csv.split('\n').some(l=>l.includes(SID)&&/,10,5,0,B,是（有理由）,5,3,6,/.test(l)),csv.split('\n').find(l=>l.includes(SID))?.slice(0,200));
const mtT=await tp.evaluate(async()=>{const s=document.querySelector('#teacher-week7');if(!s)return null;const row=[...s.querySelectorAll('tbody tr')].find(r=>r.innerText.includes(window.__SID||''));return {txt:s.querySelector('tbody').innerText.replace(/\s+/g,' ').slice(0,300),order:[...s.querySelectorAll('tbody tr td:nth-child(2)')].map(t=>t.textContent.split('　')[0])};});
ok('教師端期中名單：依學號排序、有產業線（餐飲小店）、選定的機會 B',!!mtT&&/餐飲小店/.test(mtT.txt)&&/B 外送抽成高/.test(mtT.txt)&&JSON.stringify(mtT.order)===JSON.stringify([...mtT.order].sort()),mtT);
await tp.evaluate(()=>{const i=document.querySelector('#teacher-week7 tbody input');i.value='85';i.dispatchEvent(new Event('change'));});await tp.waitForTimeout(800);
const t7=await post('week2-api',{action:'teacher_load'},'teacher-token');
ok('上台分數存進 Week 7 老師備註',t7.remarks.some(r=>r.week===7&&r.note==='85'));
ok('沒有 JS 錯誤',errs.length===0,errs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
