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
// 六頁 PPT 初稿：CDN 在測試裡換成本機的 pptxgenjs（沙箱連不到 CDN）；檔案要是 7 張投影片的 .pptx
{const fs=await import('node:fs');const lib=['../pptxlib/node_modules/pptxgenjs/dist/pptxgen.bundle.js','node_modules/pptxgenjs/dist/pptxgen.bundle.js'].map(x=>new URL(x,new URL('..',import.meta.url)).pathname).find(x=>fs.existsSync(x));
 if(lib){await p3.route(/pptxgen/,r=>r.fulfill({path:lib,contentType:'application/javascript'}));
  const [dl]=await Promise.all([p3.waitForEvent('download',{timeout:20000}),p3.evaluate(()=>{[...document.querySelectorAll('#compare button')].find(b=>/下載六頁 PPT/.test(b.textContent)).click();})]);
  const path=await dl.path();const {execSync}=await import('node:child_process');const list=execSync(`unzip -l "${path}"`).toString();const n=(list.match(/ppt\/slides\/slide\d+\.xml/g)||[]).length;const notes=(list.match(/ppt\/notesSlides\/notesSlide\d+\.xml/g)||[]).length;
  ok('六頁 PPT 初稿：下載的檔是 7 張投影片＋7 張備忘稿的 pptx（headless 對中文檔名只回 download，真的瀏覽器會是「組名_公司_六頁初稿.pptx」）',n===7&&notes===7,{file:dl.suggestedFilename(),n,notes});}
 else console.log('（略過 PPT 下載測試：找不到 pptxgenjs，npm i pptxgenjs@3.12.0）');}
ok('組員 3（推薦 Sage）：看到同一份、講稿是第 1–3 頁',await p3.evaluate(()=>/10／10/.test(document.querySelector('#compare .cmp-total').textContent)&&document.querySelector('#cmp-reason')?.value.includes('長照')&&/第 1 頁/.test(document.querySelector('#compare .cmp-script pre').textContent)));
// Week 9、10 課堂兩題頁
await p.goto(`${BASE}/week.html?week=9#card`);await p.waitForTimeout(1500);
ok('Week 9 課堂兩題：Q1 三把尺、Q2 取代誰',await p.evaluate(()=>!document.querySelector('#week-nine').hidden&&/誰付錢、怎麼收費、取代誰/.test(document.querySelector('#week-nine').innerText)&&/人、軟體、還是平台/.test(document.querySelector('#week-nine').innerText)));
await p.goto(`${BASE}/week.html?week=10#card`);await p.waitForTimeout(1500);
ok('Week 10 課堂兩題：Q1 選了哪一家、Q2 反方',await p.evaluate(()=>!document.querySelector('#week-ten').hidden&&/你們組選了哪一家/.test(document.querySelector('#week-ten').innerText)&&/大廠／客戶／技術/.test(document.querySelector('#week-ten').innerText)));
// 老師頁
const tp=await b.newPage();tp.on('pageerror',e=>errs.push('T:'+String(e)));await tp.addInitScript(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');});await tp.goto(`${BASE}/index.html#teacher`);await tp.waitForTimeout(800);await tp.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await tp.waitForTimeout(3000);
const tv=await tp.evaluate(()=>{const s=document.querySelector('#teacher-compare');const row=s.querySelector('tbody tr');return {order:[...document.querySelectorAll('#teacher-dashboard > section')].map(x=>x.id).slice(0,4),stats:s.querySelector('.tw4-live')?.innerText.replace(/\s+/g,' '),picks:[...s.querySelectorAll('p')].map(x=>x.textContent).find(x=>/^哪家被幾組選/.test(x)),cells:row?[...row.children].map(c=>c.innerText):[],w9:!!document.querySelector('#teacher-week9'),w10:!!document.querySelector('#teacher-week10')};});
ok('老師頁：順序 week12→week11→compare→week10；統計；Sage ×1；該組列選定 Sage（非最高分）＋理由＋★大廠',tv.order.join(',')==='teacher-week12,teacher-week11,teacher-compare,teacher-week10'&&/1 已選定/.test(tv.stats)&&/Sage ×1/.test(tv.picks)&&/Sage（非最高分）/.test(tv.cells[4])&&/長照/.test(tv.cells[5])&&/★ 大廠/.test(tv.cells[6])&&tv.w9&&tv.w10,tv);
// 期中評分表新制：完成度 30＋PDF 20＋上台 50；貼上已交學號勾 PDF
const mt=await tp.evaluate(()=>{const s=document.querySelector('#teacher-week7');return {th:[...s.querySelectorAll('thead th')].map(x=>x.textContent),hasPaste:!!s.querySelector('textarea[aria-label="已交學號"]'),cb:s.querySelectorAll('tbody input[type=checkbox]').length};});
ok('期中評分表：欄位 B/30、P/20、C/50；每列兩個 PDF 勾選；有貼上工具',mt.th.includes('B 完成 /30')&&mt.th.includes('P PDF /20')&&mt.th.includes('C 上台 /50')&&mt.hasPaste&&mt.cb>=2,mt);
await tp.evaluate(()=>{document.querySelectorAll('#teacher-week7 details').forEach(d=>d.open=true);});await tp.fill('#teacher-week7 textarea[aria-label="已交學號"]',`${S[0]} 已繳 xx\n${S[2]}`);await tp.evaluate(()=>{const s=document.querySelector('#teacher-week7');s.querySelector('select').value='1';[...s.querySelectorAll('button')].find(b=>/套用到這一欄/.test(b.textContent)).click();});await tp.waitForTimeout(3000);
const mt2=await tp.evaluate((ids)=>{const s=document.querySelector('#teacher-week7');const rows=[...s.querySelectorAll('tbody tr')];const get=id=>{const r=rows.find(r=>r.children[1]?.textContent.includes(id));return r?[...r.querySelectorAll('input[type=checkbox]')].map(c=>c.checked):null;};return {a:get(ids[0]),b:get(ids[1]),c:get(ids[2]),msg:[...s.querySelectorAll('.w4-hint')].map(x=>x.textContent).find(t=>/已套用/.test(t))};},S);
ok('貼上兩個學號套用到 W5：那兩人 W5 勾了、中間那人沒勾、W4 都沒動',JSON.stringify(mt2.a)==='[false,true]'&&JSON.stringify(mt2.b)==='[false,false]'&&JSON.stringify(mt2.c)==='[false,true]'&&/2 人已交/.test(mt2.msg||''),mt2);
// Week 11 預演講評表（老師）→ 學生 Week 11 頁看到；Week 12 期末評分表
await tp.evaluate(()=>{document.querySelectorAll('#teacher-dashboard details').forEach(d=>d.open=true);});
const rh=await tp.evaluate(()=>{const s=document.querySelector('#teacher-week11');return {order:[...document.querySelectorAll('#teacher-dashboard > section')].map(x=>x.id).slice(0,3),has:!!s,inputs:s?.querySelectorAll('input[type=text]').length,cb:s?.querySelectorAll('input[type=checkbox]').length};});
ok('老師頁最上面是 week12、week11、compare；預演表有 7 個文字格＋1 個勾',rh.order.join(',')==='teacher-week12,teacher-week11,teacher-compare'&&rh.inputs===7&&rh.cb===1,rh);
await tp.fill('#teacher-week11 input[aria-label="比較隊 第 1 頁講評"]','誰付錢講清楚了');await tp.fill('#teacher-week11 input[aria-label="比較隊 第 4 頁講評"]','要比三家，不是各講各的');await tp.waitForTimeout(1200);await tp.evaluate(()=>{const c=document.querySelector('#teacher-week11 input[type=checkbox]');c.click();});await tp.waitForTimeout(2500);
await p.goto(`${BASE}/week.html?week=11`);await p.waitForTimeout(2000);
const rhv=await p.evaluate(()=>({t:document.querySelector('#rehearsal').innerText,hidden:document.querySelector('#week-eleven-materials').hidden}));
ok('學生 Week 11 頁：看到本組講評（第 1、4 頁＋6 分鐘內）',/比較隊：本組講評/.test(rhv.t)&&/誰付錢講清楚了/.test(rhv.t)&&/要比三家/.test(rhv.t)&&/6 分鐘內講完/.test(rhv.t)&&!rhv.hidden,rhv);
const fn=await tp.evaluate(()=>{const s=document.querySelector('#teacher-week12');const row=s.querySelector('tbody tr');return {th:[...s.querySelectorAll('thead th')].map(x=>x.textContent),pick:row?.children[2]?.textContent,btns:row?.querySelectorAll('.trk-tag').length};});
ok('期末評分表：一組一列、選定 Sage、五項×3 顆分數鈕',fn.th.includes('組分 /50')&&/Sage/.test(fn.pick||'')&&fn.btns===15,fn);
await tp.evaluate(()=>{const s=document.querySelector('#teacher-week12');[...s.querySelectorAll('.trk-tag')].filter(b=>b.textContent==='10').slice(0,5).forEach(b=>b.click());});await tp.waitForTimeout(3500);
await tp.evaluate(()=>{const s=document.querySelector('#teacher-week12');s.querySelector('tbody tr button').click();});await tp.waitForTimeout(500);
await tp.fill(`#teacher-week12 input[aria-label="${S[2]} 上台分數（0–30）"]`,'25');await tp.press(`#teacher-week12 input[aria-label="${S[2]} 上台分數（0–30）"]`,'Enter');await tp.waitForTimeout(2500);
const fn2=await tp.evaluate((sid)=>{const s=document.querySelector('#teacher-week12');const g=s.querySelector('tbody tr').children[8].textContent;const rows=[...s.querySelectorAll('.tm-table tbody tr')];const r=rows.find(r=>r.children[0].textContent.includes(sid));return {g,cells:r?[...r.children].map(c=>c.textContent):[]};},S[2]);
ok('組分 50 全 10、S3 上台 25＋完成度（推薦＋理由卡 0，開 1 箱 0，課堂兩題 0）＝5 → 總分 80',/^50/.test(fn2.g)&&fn2.cells[3]?.startsWith('5（')&&fn2.cells[4]==='30'&&fn2.cells[5]==='80',fn2);
// 課堂題數 2–5：老師在 Week 9 區填 Q3 → 學生 Week 9 頁變三題、出席欄變三欄
await tp.fill('#teacher-week9 input[placeholder^="（選填"]','第三題：你們組三家到齊了嗎？');await tp.evaluate(()=>{const s=document.querySelector('#teacher-week9');[...s.querySelectorAll('button')].find(b=>b.textContent==='儲存課堂題').click();});await tp.waitForTimeout(3000);
const nq=await tp.evaluate(()=>{const s=document.querySelector('#teacher-week9');return {h:[...s.querySelectorAll('thead th')].map(x=>x.textContent).join(','),now:[...s.querySelectorAll('p')].map(x=>x.textContent).find(x=>/^學生目前看到/.test(x)),title:s.querySelector('.tw4-q b')?.textContent};});
ok('老師 Week 9：存 Q3 後表頭有 Q3、「學生目前看到」三題、標題「課堂三題」',/Q1,Q2,Q3$/.test(nq.h)&&/Q3「第三題/.test(nq.now)&&/課堂三題/.test(nq.title),nq);
await p.goto(`${BASE}/week.html?week=9#card`);await p.waitForTimeout(1500);
const sq=await p.evaluate(()=>{const s=document.querySelector('#week-nine');return {vis:[...s.querySelectorAll('.w4-q')].filter(x=>!x.hidden).length,t:s.querySelector('h1')?.textContent,q3:[...s.querySelectorAll('.w4-q-title')].map(x=>x.textContent).find(x=>/^Q3/.test(x)),prog:s.querySelector('.w4-prog')?.textContent};});
ok('學生 Week 9：三題可見、標題「今天的課堂三題」、Q3 題目、進度 0/3',sq.vis===3&&sq.t==='今天的課堂三題'&&/到齊了嗎/.test(sq.q3)&&/三題 0\/3/.test(sq.prog),sq);
await p.fill('#week-nine textarea[aria-label="第三題答案"]','到齊了');await p.waitForTimeout(2600);
const sq2=await p.evaluate(()=>({prog:document.querySelector('#week-nine .w4-prog')?.textContent,st:[...document.querySelectorAll('#week-nine .w4-stamp')].map(x=>x.textContent)}));
ok('學生答第 3 題自動存：進度 1/3',/三題 1\/3/.test(sq2.prog)&&/已存/.test(sq2.st[2]),sq2);
ok('沒有 JS 錯誤',errs.length===0,errs);
await b.close();console.log(R.filter(Boolean).length+'/'+R.length);process.exit(R.every(Boolean)?0:1);
