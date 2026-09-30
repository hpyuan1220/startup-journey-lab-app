import {test} from 'node:test';import assert from 'node:assert/strict';
import {classify,problemGap,suggest,shortFieldCount,duplicateCount,evidenceSummary,
        TEMPLATES,CATEGORY_LABELS,DIMENSIONS,ACTION_PATTERN} from '../teacher-suggestions.mjs';

const fb=s=>({readiness:Object.fromEntries([
 ...DIMENSIONS.map((k,i)=>[k,{score:s[i],reason:'理由'}]),
 ['total_readiness',s.reduce((a,b)=>a+b,0)]])});
const card=(o={})=>({status:'submitted',
 observed_problem:'星期三中午在第二餐廳外排隊十九分鐘。',observed_context:'星期三中午，第二餐廳外。',
 verbatim_complaint:'又要排隊。',affected_user:'午休只有五十分鐘的大二學生。',
 known_fact:'我連續三週到場計時，等了十九分鐘。',unverified_assumption:'我猜是付款流程慢，下週我要問三位同學。',
 expected_learning:'學會用訪談確認別人是否也遇到。',concern:'擔心只有我特別趕。',...o});

test('草稿與沒跑過 AI 各有自己的範本',()=>{
 assert.equal(classify(card({status:'draft'}),null),'not_submitted');
 assert.equal(classify(card(),null),'no_ai');
});

test('依因果順序找第一個弱項，不是找最低分',()=>{
 // 問題具體度 1、事實品質 0：應該先講問題，因為問題講清楚後面才有東西寫
 assert.match(classify(card(),fb([1,3,0,3,2])),/^problem_/);
 assert.equal(classify(card(),fb([3,1,0,3,2])),'affected_user');
 assert.equal(classify(card(),fb([3,3,1,3,2])),'fact_quality');
 assert.equal(classify(card(),fb([3,3,3,1,2])),'separation');
});

test('其他都過關但假設欄沒有行動，歸到只缺下一步',()=>{
 assert.equal(classify(card({unverified_assumption:'我猜是付款流程慢，還需要確認。'}),fb([3,3,3,3,0])),'next_step');
 assert.equal(classify(card(),fb([3,3,3,3,2])),'no_gap');
});

// 班上 17 人落在「問題不夠具體」。若都收到同一句話，學生一對照就會發現。
test('問題不夠具體再依缺時間、缺地點、寫成現象細分',()=>{
 assert.equal(problemGap({observed_problem:'買飲料要排很久',observed_context:'',verbatim_complaint:''}),'problem_time');
 assert.equal(problemGap({observed_problem:'中午買飲料要排很久',observed_context:'',verbatim_complaint:''}),'problem_place');
 assert.equal(problemGap({observed_problem:'星期三中午在第二餐廳排隊',observed_context:'',verbatim_complaint:''}),'problem_event');
});

test('校園簡稱要認得出是地點，不能對寫了地點的學生說缺地點',()=>{
 for(const t of ['禮拜三中午在學餐排隊','星期二在系館門口等','中午在宿舍樓下']){
  assert.notEqual(problemGap({observed_problem:t,observed_context:'',verbatim_complaint:''}),'problem_place',t);
 }
});

test('沒有機械式缺口時留白，不硬塞範本',()=>{
 const r=suggest(card(),fb([3,3,3,3,2]));
 assert.equal(r.category,'no_gap');
 assert.equal(r.text,'');
 assert.equal(r.needsOwnWords,true);
});

test('多欄過短時附加提醒，且與前一句分行',()=>{
 const r=suggest(card({affected_user:'大家',known_fact:'很多人',concern:'不知道',
   unverified_assumption:'我猜是店員少。'}),fb([3,3,3,3,0]));
 assert.equal(shortFieldCount(r.category?card({affected_user:'大家',known_fact:'很多人',concern:'不知道'}):{}),3);
 assert.ok(r.text.includes('\n'),'附加句要換行，不能黏在前一句後面');
 assert.ok(r.text.endsWith(TEMPLATES.short_suffix));
});

test('證據摘要直接讀已存的分數，不生成文字',()=>{
 const e=evidenceSummary(fb([4,3,2,1,0]));
 assert.equal(e.total,10);
 assert.deepEqual(e.rows.map(r=>r.score),[4,3,2,1,0]);
 assert.ok(e.rows.every(r=>r.label&&r.reason==='理由'));
 assert.deepEqual(evidenceSummary(null),{total:null,rows:[]});
});

test('同一句話會送給幾個人',()=>{
 const drafts=['一樣的話','一樣的話','別的話',''];
 assert.equal(duplicateCount(drafts,'一樣的話'),2);
 assert.equal(duplicateCount(drafts,''),0,'空白稿不算重複');
});

// 兩邊若分歧，學生會收到互相矛盾的話：AI 說沒寫行動，老師的建議卻說有。
test('行動動詞判斷與 ai-feedback 的閘門一致',async()=>{
 const v=await import('../supabase/functions/ai-feedback/validate.ts');
 for(const t of ['下週我要問三位同學','到現場計時並訪談五位','我猜是付款流程慢，還需要確認','如果要填問卷才有推薦']){
  assert.equal(ACTION_PATTERN.test(t),v.hasActionVerb({unverified_assumption:t}),t);
 }
});

test('每個分類都有標籤，每個非留白分類都有範本',()=>{
 for(const key of Object.keys(CATEGORY_LABELS)){
  assert.ok(CATEGORY_LABELS[key],`${key} 缺標籤`);
  assert.equal(typeof TEMPLATES[key],'string',`${key} 缺範本`);
  if(key!=='no_gap')assert.ok(TEMPLATES[key].length>10,`${key} 的範本太短`);
 }
});

// 學生存草稿時若把 teacher_note 一起送上來，老師寫的回饋會被自己的學生蓋掉。
test('student-api 的可寫欄位白名單不得包含 teacher_note',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../supabase/functions/student-api/index.ts',import.meta.url),'utf8');
 const allowed=(src.match(/const allowed = \[([^\]]+)\]/)||[])[1];
 assert.ok(allowed,'找不到 allowed 白名單');
 assert.ok(!allowed.includes('teacher_note'),'teacher_note 不該出現在學生可寫欄位裡');
 assert.ok(!allowed.includes('needs_follow_up'));
 assert.ok(!allowed.includes('review_status'));
});

// 老師的話曾經只存在一行狀態訊息裡，被另外 19 處覆寫蓋掉。
test('學生端的老師回饋有自己的固定區塊，不依賴狀態訊息',async()=>{
 const fs=await import('node:fs/promises');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(html,/id="teacher-note"/);
 assert.match(html,/id="teacher-note-body"/);
 assert.match(app,/function showTeacherNote/);
 assert.match(app,/showTeacherNote\(loaded\.submission\)/);
 // 不可以寫進 form-message
 assert.ok(!/message\('form-message'[^)]*teacher_note/.test(app));
});

test('死掉的 needs_follow_up 不再是統計與篩選的依據',async()=>{
 const fs=await import('node:fs/promises');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/__sjlNeedsAttention/);
 assert.match(app,/需要你看/);
 // 仍保留作為 fallback，但不能是唯一依據
 assert.ok(!/\['需追問',teacherRows\.filter\(r=>r\.needs_follow_up\)/.test(app));
});

// 老師在教室電腦登入後沒登出，下一個開網頁的人就看得到全班名單與學號。
// 原本存 localStorage 又帶 refresh_token 自動續期，等於永久有效。
test('教師登入狀態不得存在 localStorage',async()=>{
 const fs=await import('node:fs/promises');
 for(const file of ['../app.js','../teacher-ai-feedback.js','../teacher-note.js','../teacher-week2.js']){
  const src=await fs.readFile(new URL(file,import.meta.url),'utf8');
  const bad=src.match(/localStorage\.(get|set)Item\('sjl-teacher-(token|session)'/g)||[];
  assert.deepEqual(bad,[],`${file} 仍在用 localStorage 存取教師權杖：${bad.join('、')}`);
  assert.ok(!/sessionStorage\.getItem\('sjl-student-session'\)/.test(src),`${file} 不該把學生 session 一起改掉`);
 }
});

test('教師端有閒置逾時，學生端不受影響',async()=>{
 const fs=await import('node:fs/promises');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/TEACHER_IDLE_MINUTES/);
 assert.match(app,/touchTeacherActivity/);
 // 活動事件要能重新計時，否則老師改到一半會被踢
 for(const evt of ['click','keydown','scroll','pointerdown'])assert.ok(app.includes(`'${evt}'`),`缺少 ${evt} 活動事件`);
 // 學生的登入仍走 localStorage
 assert.match(app,/localStorage\.getItem\('sjl-student-session'\)|localStorage\.removeItem\('sjl-student-session'\)/);
});

test('升級後會清掉舊版留在 localStorage 的教師權杖',async()=>{
 const fs=await import('node:fs/promises');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/localStorage\.removeItem\('sjl-teacher-session'\)/);
 assert.match(app,/localStorage\.removeItem\('sjl-teacher-token'\)/);
});

// Week 1 原本沒有任何重複提交的處理：學生回來按「正式提交」就再送一次，
// 訊息還和第一次一模一樣，他不知道這是第幾版、也不知道內容有沒有變。
test('Week 1 內容沒變就不重送，有變會講第幾版',async()=>{
 const fs=await import('node:fs/promises');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/snapshotOf\(data\)===savedSnapshot/,'要比對內容才知道有沒有改過');
 assert.match(app,/內容和上次提交的完全相同/);
 assert.match(app,/這是第 \$\{savedVersion\} 版/);
 // 沒變時不可以發出儲存請求
 const guard=app.slice(app.indexOf('snapshotOf(data)===savedSnapshot'),app.indexOf('startAction(button,labels.busy'));
 assert.ok(!guard.includes('studentApi'),'內容沒變時不該發出請求');
});

test('回到已提交的卡片會看到狀態，不必按按鈕試探',async()=>{
 const fs=await import('node:fs/promises');
 const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="submitted-state"/);
 assert.match(app,/function renderSubmittedState/);
 assert.match(app,/renderCard\(\); renderSubmittedState\(\); \}/,'載入卡片時要更新狀態');
 assert.match(app,/可以直接修改後重新提交，先前版本會保留/);
});

// 清除按鈕的說明寫著「原版本會保留」—— 靠的是資料庫觸發器，不是前端。
test('Week 1 的版本快照觸發器仍在',async()=>{
 const fs=await import('node:fs/promises');
 const sql=await fs.readFile(new URL('../supabase/migrations/20260927_week2.sql',import.meta.url),'utf8');
 assert.match(sql,/create trigger week1_version before update on public\.week1_submissions/);
 assert.match(sql,/create trigger week1_snapshot after insert or update on public\.week1_submissions/);
 assert.match(sql,/if old\.submitted_at is not null then new\.submitted_at=old\.submitted_at/,'第一次提交時間不該被後來的提交蓋掉');
});
