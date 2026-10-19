// 老師備註（學生看不到）瀏覽器測試：Week 4 表格一欄＋Week 2 卡 Week 1–3 各一格；一點就存、重開頁還在；收合列有備註字；CSV 有欄位。
// 先啟動：PORT=4251 node tests/serve-acceptance.mjs
import pw from '/home/claude/node_modules/playwright/index.js';const {chromium}=pw;
const BASE=process.env.BASE||'http://127.0.0.1:4251';const SID='A1132703'+String(Date.now()%100).padStart(2,'0');
const F=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
const post=(path,body,jwt)=>fetch(`${BASE}/functions/v1/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}).then(r=>r.json());
const {token}=await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true});
await post('Student-api',{action:'save',token,submission:{...Object.fromEntries(F.map(k=>[k,'x'])),student_name:'備註生',team_preference:'訪談／研究',observed_problem:'排隊太久',status:'submitted'}});
await post('week2-api',{action:'week4_save',token,version:null,data:{pain:'午休排隊 20 分鐘',q1:'七成',q2:'買方鏈'}});
const R=[];const ok=(n,c,d)=>R.push((c?'✅ ':'❌ ')+n+(d?' '+JSON.stringify(d).slice(0,220):''));
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1200,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
async function openTeacher(){await p.goto(`${BASE}/index.html#teacher`);await p.waitForTimeout(600);await p.evaluate(()=>{sessionStorage.setItem('sjl-teacher-token','teacher-token');document.getElementById('teacher-dashboard').hidden=false;});await p.waitForTimeout(1800);}
await openTeacher();
const row=p.locator('#teacher-week4 tbody tr',{hasText:SID}).first();
ok('Week 4 表格有「老師備註」欄與四個標記',await p.evaluate(()=>[...document.querySelectorAll('#teacher-week4 th')].some(t=>/老師備註/.test(t.textContent)))&&await row.locator('.trk-tag').count()===4);
await row.locator('.trk-tag-active').click();await p.waitForTimeout(600);
ok('點「積極」立刻存（狀態顯示已存）',/已存/.test(await row.locator('.trk-status').textContent())&&await row.locator('.trk-tag-active').getAttribute('aria-pressed')==='true');
await row.locator('.trk input').fill('上台講得清楚');await row.locator('.trk input').press('Enter');await p.waitForTimeout(600);
ok('打一句備註按 Enter 就存',/已存/.test(await row.locator('.trk-status').textContent()));
const api=await post('week2-api',{action:'teacher_load'},'teacher-token');
const mine=(api.remarks||[]).filter(r=>r.student_id===SID);
ok('後端存了 week 4 的標記與備註',mine.length===1&&mine[0].tag==='active'&&mine[0].note==='上台講得清楚'&&mine[0].week===4,mine);
// Week 2 區：Week 1–3 各一格
await p.click('#teacher-week2 button:has-text("載入／更新 Week 2")');await p.waitForTimeout(1500);
const card=p.locator('.tw2-student',{hasText:SID}).first();
ok('收合列就看得到 W4 的備註字',/W4 積極：上台講得清楚/.test((await card.locator('> summary').textContent()).replace(/\s+/g,' ')));
await card.locator('> summary').click();await p.waitForTimeout(300);
ok('展開後有 Week 1、2、3 三格備註',await card.locator('.tw2-remark-row').count()===3);
const sug=await card.locator('.tw2-remark-row').evaluateAll(rows=>rows.map(r=>[...r.querySelectorAll('.trk-tag.trk-suggest')].map(b=>b.textContent).join('')));
ok('Week 1–3 沒點之前有系統推算（W1 已交＝普通、W2 沒開始＝缺席、W3 沒開始＝缺席）',sug.join('|')==='普通|缺席|缺席',sug);
ok('收合列有「推算」一行',/推算 W1 普通/.test((await card.locator('> summary').textContent()).replace(/\s+/g,' ')));
const w1row=card.locator('.tw2-remark-row').nth(0);await w1row.locator('.trk-tag-absent').click();await p.waitForTimeout(600);
ok('Week 1 點「缺席」存成功',/已存/.test(await w1row.locator('.trk-status').textContent()));
await row.locator('button.quiet',{hasText:SID}).click();await p.waitForTimeout(300);
ok('不重開頁：Week 4 區展開列就看得到 Week 2 區剛存的 W1 備註',/前幾週備註：W1 缺席/.test(await p.locator('#teacher-week4 .tw4-detail').first().textContent()));
await row.locator('button.quiet',{hasText:SID}).click();await p.waitForTimeout(200);
// 重開頁都在（真的重新載入，不是只換 hash）
await p.reload();await p.waitForTimeout(600);await p.evaluate(()=>{document.getElementById('teacher-dashboard').hidden=false;});await p.waitForTimeout(1800);
const row2=p.locator('#teacher-week4 tbody tr',{hasText:SID}).first();
ok('重開頁：Week 4 的標記與備註都在',await row2.locator('.trk-tag-active').getAttribute('aria-pressed')==='true'&&await row2.locator('.trk input').inputValue()==='上台講得清楚');
await row2.locator('button.quiet',{hasText:SID}).click();await p.waitForTimeout(300);
ok('展開一列看得到「前幾週備註：W1 缺席」',/前幾週備註：W1 缺席/.test(await p.locator('#teacher-week4 .tw4-detail').first().textContent()));
// 把推算存成標記：Week 2 區（W1–3）與 Week 4 區（本週）各一顆；只填還沒點的
await p.click('#teacher-week2 button:has-text("載入／更新 Week 2")');await p.waitForTimeout(1500);
const beforeTags=(await post('week2-api',{action:'teacher_load'},'teacher-token')).remarks.filter(r=>r.student_id===SID).map(r=>[r.week,r.tag]).sort();
await p.click('#teacher-week2 .tw2-freeze summary');await p.click('#teacher-week2 .tw2-freeze button');await p.waitForTimeout(4000);
const afterTags=(await post('week2-api',{action:'teacher_load'},'teacher-token')).remarks.filter(r=>r.student_id===SID).map(r=>[r.week,r.tag]).sort();
ok('Week 1–3 推算存成標記：W1 老師點的「缺席」不動、W2／W3 補成推算值、W4 原樣',JSON.stringify(afterTags)===JSON.stringify([[1,'absent'],[2,'absent'],[3,'absent'],[4,'active']]),{beforeTags,afterTags});
const w4c=p.locator('#teacher-week4 .tw4-freeze');
ok('Week 4 區有「把本週推算存成標記」與說明',await w4c.count()===1&&/積極/.test(await w4c.textContent()));
// 學生端拿不到
const s4=await post('week2-api',{action:'week4_load',token});
ok('學生端 week4_load 沒有備註',!JSON.stringify(s4).includes('上台講得清楚')&&!('remarks' in s4));
// CSV
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#teacher-week4 button:has-text("匯出評分參考 CSV")')]);
const csv=await (await import('node:fs/promises')).readFile(await dl.path(),'utf8');
const line=csv.split('\n').find(l=>l.includes(SID))||'';
ok('CSV：表頭有 W1–W4 系統推算與評分參考；這列 W4 評分參考＝老師的積極、W1＝老師的缺席',/W4 系統推算,W1 評分參考,W2 評分參考,W3 評分參考,W4 評分參考/.test(csv)&&/積極,上台講得清楚,普通,缺席,缺席,沒參與,缺席,缺席,缺席,積極$/.test(line.trim()),line.slice(-120));
ok('沒有 JS 錯誤',errs.length===0,errs);
console.log(R.join('\n'));await b.close();process.exit(R.some(x=>x.startsWith('❌'))?1:0);
