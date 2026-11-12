// Week 10 比較頁＋Week 9/10 課堂兩題頁＋老師頁 Week 10 區。先啟動：SJL_WRITE_OPEN_AT=2000-01-01T00:00:00Z PORT=4261 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4261';const R=[];const ok=(n,c,x)=>{R.push(c);console.log((c?'✅ ':'❌ ')+n,x!==undefined&&!c?JSON.stringify(x).slice(0,300):'');};
const post=(path,body)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async r=>({status:r.status,...(await r.json())}));
const S=['A113990031','A113990032','A113990033'];const TOK={};for(const s of S)TOK[s]=(await post('Student-api',{action:'login',student_id:s,invite_code:'GOOD-CODE',confirm_new:true})).token;
const t=await post('week2-api',{action:'team_create',token:TOK[S[0]],name:'比較隊'});for(const s of S.slice(1))await post('week2-api',{action:'team_join',token:TOK[s],code:t.team.code});
await post('week2-api',{action:'team_claim',token:TOK[S[0]],directions:[2]});await post('week2-api',{action:'team_claim',token:TOK[S[1]],directions:[1]});await post('week2-api',{action:'team_claim',token:TOK[S[2]],directions:[3]});
const box=(extra={})=>({found:true,wrong:[],hints:0,clues:['shop','house'],attempts:[1,1,1],scores:[10,10,10],passed:3,url:'https://x.com/a',deep:false,insight:'',argue:'',opened:true,at:null,est:'',estOk:null,...extra});
await post('week2-api',{action:'islands_save',token:TOK[S[0]],data:{boxes:{owner:box()},cards:{owner:{sources:['https://a','https://b'],why:'接電話的錢比請人便宜'}},dir:2,candidates:['owner']}});
await post('week2-api',{action:'islands_save',token:TOK[S[1]],data:{boxes:{arcade:box()},dir:1,candidates:[]}});
await post('week2-api',{action:'islands_save',token:TOK[S[2]],data:{boxes:{sage:box({est:'4 萬–8 萬（約一到兩個照服員）',estOk:true})},dir:3,candidates:[]}});
await post('week2-api',{action:'team_rep',token:TOK[S[0]],direction:2,company:'owner'});await post('week2-api',{action:'team_rep',token:TOK[S[1]],direction:1,company:'arcade'});
const b=await chromium.launch();const errs=[];
const mk=async(s)=>{const c=await b.newContext({viewport:{width:1000,height:1200}});await c.addInitScript(([t,id])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:id}));},[TOK[s],s]);const p=await c.newPage();p.on('pageerror',e=>errs.push(s+':'+String(e)));return p;};
const p=await mk(S[0]);await p.goto(`${BASE}/week.html?week=10`);await p.waitForTimeout(2000);
ok('Week 10 頁：教材區顯示、兩個分頁、比較表只有兩家（第三家還沒推薦）',await p.evaluate(()=>!document.querySelector('#week-ten-materials').hidden&&!document.querySelector('#week-ten-navigation').hidden&&document.querySelectorAll('#compare .cmp-table thead th').length===3&&/至少要兩家|還沒推薦/.test(document.querySelector('#compare').innerText)));
await post('week2-api',{action:'team_rep',token:TOK[S[2]],direction:3,company:'sage'});await p.reload();await p.waitForTimeout(2000);
ok('三家到齊：表頭三家、15 格、每格有「從理由卡帶入」',await p.evaluate(()=>document.querySelectorAll('#compare .cmp-table thead th').length===4&&document.querySelectorAll('#compare .cmp-seg').length===15&&document.querySelectorAll('#compare .cmp-table button.button-link').length===15));
// 打分：Owner 全 2、Sage 全 1、Arcade 全 1；用帶入證據
await p.evaluate(()=>{const rows=[...document.querySelectorAll('#compare .cmp-table tbody tr')].slice(0,5);rows.forEach(tr=>{const cells=[...tr.querySelectorAll('td')].slice(1);cells.forEach((td,i)=>{td.querySelectorAll('.cmp-s')[i===0?2:1].click();});});});await p.waitForTimeout(200);
await p.evaluate(()=>{document.querySelectorAll('#compare .cmp-table button.button-link').forEach(b=>b.click());});await p.waitForTimeout(1500);
ok('總分：Owner 10（最高分亮）、Sage 5、Arcade 5；帶入的證據含理由卡估價',await p.evaluate(()=>{const tds=[...document.querySelectorAll('#compare .cmp-total td')].map(x=>x.textContent);return /10／10/.test(tds[1])&&/5／10/.test(tds[2])&&document.querySelector('#compare .cmp-top-cell')?.textContent.includes('10')&&[...document.querySelectorAll('#compare textarea.cmp-ev')].some(t=>/我們的估價：4 萬/.test(t.value));}));
ok('存檔狀態',await p.evaluate(()=>/已存/.test(document.querySelector('#compare .w4-status').textContent)));
// 選非最高分 → 要理由；寫理由 → ok；反方三格
await p.evaluate(()=>[...document.querySelectorAll('#compare .cmp-pick .cmp-s')].find(b=>/Sage/.test(b.textContent)).click());await p.waitForTimeout(300);
ok('選 Sage（非最高分）：出現理由欄、狀態列說要寫理由',await p.evaluate(()=>!!document.querySelector('#cmp-reason')&&/要寫理由/.test(document.querySelector('#compare .w4-done').textContent)));
await p.fill('#cmp-reason','組裡有人家裡做長照，接觸得到真人，期末可以訪談。');
const CT=['大型照護系統商整合同功能','機構預算有限','感測器商自己做 AI'];for(let i=0;i<3;i++){await p.fill(`#compare .cmp-counter:nth-of-type(${i+1}) textarea`,CT[i]);}
await p.evaluate(()=>document.querySelectorAll('#compare .cmp-counter .cmp-s')[0].click());await p.waitForTimeout(1500);
ok('比較表完成 ✅、期末框架出現六頁、講稿按人分（S1 推薦 Owner 落選→講第 4 頁）',await p.evaluate(()=>document.querySelector('#compare .w4-done').dataset.state==='done'&&document.querySelectorAll('#compare .cmp-pages li').length===6&&/第 4 頁/.test(document.querySelector('#compare .cmp-script pre').textContent)&&/Sage/.test(document.querySelector('#compare .cmp-pages li').textContent)));
// 另一個組員看到同一份
const p3=await mk(S[2]);await p3.goto(`${BASE}/week.html?week=10`);await p3.waitForTimeout(2000);
ok('組員 3（推薦 Sage）：看到同一份、講稿是第 1–3 頁',await p3.evaluate(()=>/10／10/.test(document.querySelector('#compare .cmp-total').textContent)&&document.querySelector('#cmp-reason')?.value.includes('長照')&&/第 1 頁/.test(document.querySelector('#compare .cmp-script pre').textContent)));
// Week 9、10 課堂兩題頁
await p.goto(`${BASE}/week.html?week=9#card`);await p.waitForTimeout(1500);
ok('Week 9 課堂兩題：Q1 三把尺、Q2 取代誰',await p.evaluate(()=>!document.querySelector('#week-nine').hidden&&/誰付錢、怎麼收費、取代誰/.test(document.querySelector('#week-nine').innerText)&&/人、軟體、還是平台/.test(document.querySelector('#week-nine').innerText)));
await p.goto(`${BASE}/week.html?week=10#card`);await p.waitForTimeout(1500);
ok('Week 10 課堂兩題：Q1 選了哪一家、Q2 反方',await p.evaluate(()=>!document.querySelector('#week-ten').hidden&&/你們組選了哪一家/.test(document.querySelector('#week-ten').innerText)&&/大廠／客戶／技術/.test(document.querySelector('#week-ten').innerText)));
// 老師頁
const tp=await b.newPage();tp.on('pageerror',e=>errs.push('T:'+String(e)));await tp.addInitScript(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');});await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(800);await tp.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await tp.waitForTimeout(3000);
const tv=await tp.evaluate(()=>{const s=document.querySelector('#teacher-compare');const row=s.querySelector('tbody tr');return {order:[...document.querySelectorAll('#teacher-dashboard > section')].map(x=>x.id).slice(0,4),stats:s.querySelector('.tw4-live')?.innerText.replace(/\s+/g,' '),picks:[...s.querySelectorAll('p')].map(x=>x.textContent).find(x=>/^哪家被幾組選/.test(x)),cells:row?[...row.children].map(c=>c.innerText):[],w9:!!document.querySelector('#teacher-week9'),w10:!!document.querySelector('#teacher-week10')};});
ok('老師頁：順序 compare→week10→week9→islands；統計；Sage ×1；該組列選定 Sage（非最高分）＋理由＋★大廠',tv.order.join(',')==='teacher-compare,teacher-week10,teacher-week9,teacher-islands'&&/1 已選定/.test(tv.stats)&&/Sage ×1/.test(tv.picks)&&/Sage（非最高分）/.test(tv.cells[4])&&/長照/.test(tv.cells[5])&&/★ 大廠/.test(tv.cells[6])&&tv.w9&&tv.w10,tv);
// 期中評分表新制：完成度 30＋PDF 20＋上台 50；貼上已交學號勾 PDF
const mt=await tp.evaluate(()=>{const s=document.querySelector('#teacher-week7');return {th:[...s.querySelectorAll('thead th')].map(x=>x.textContent),hasPaste:!!s.querySelector('textarea[aria-label="已交學號"]'),cb:s.querySelectorAll('tbody input[type=checkbox]').length};});
ok('期中評分表：欄位 B/30、P/20、C/50；每列兩個 PDF 勾選；有貼上工具',mt.th.includes('B 完成 /30')&&mt.th.includes('P PDF /20')&&mt.th.includes('C 上台 /50')&&mt.hasPaste&&mt.cb>=2,mt);
await tp.evaluate(()=>{document.querySelectorAll('#teacher-week7 details').forEach(d=>d.open=true);});await tp.fill('#teacher-week7 textarea[aria-label="已交學號"]',`${S[0]} 已繳 xx\n${S[2]}`);await tp.evaluate(()=>{const s=document.querySelector('#teacher-week7');s.querySelector('select').value='1';[...s.querySelectorAll('button')].find(b=>/套用到這一欄/.test(b.textContent)).click();});await tp.waitForTimeout(3000);
const mt2=await tp.evaluate((ids)=>{const s=document.querySelector('#teacher-week7');const rows=[...s.querySelectorAll('tbody tr')];const get=id=>{const r=rows.find(r=>r.children[1]?.textContent.includes(id));return r?[...r.querySelectorAll('input[type=checkbox]')].map(c=>c.checked):null;};return {a:get(ids[0]),b:get(ids[1]),c:get(ids[2]),msg:[...s.querySelectorAll('.w4-hint')].map(x=>x.textContent).find(t=>/已套用/.test(t))};},S);
ok('貼上兩個學號套用到 W5：那兩人 W5 勾了、中間那人沒勾、W4 都沒動',JSON.stringify(mt2.a)==='[false,true]'&&JSON.stringify(mt2.b)==='[false,false]'&&JSON.stringify(mt2.c)==='[false,true]'&&/2 人已交/.test(mt2.msg||''),mt2);
ok('沒有 JS 錯誤',errs.length===0,errs);
await b.close();console.log(R.filter(Boolean).length+'/'+R.length);process.exit(R.every(Boolean)?0:1);
