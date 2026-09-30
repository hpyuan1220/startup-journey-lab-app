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
