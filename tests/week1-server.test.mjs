import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,fullCard,blankCard,FIELDS} from './support/week1-harness.mjs';

// 真實可達的兩次點擊：已提交的學生按「儲存草稿」→ 再按「清除內容」。
// 修正前：第一次把 status 寫回 draft，第二次把 11 個必填欄位全部覆蓋成空字串。
// 前端本來有守門（savedStatus==='submitted'），但守門用的是前端狀態，
// 狀態一被退回草稿就失效 —— 這個不變量只能由伺服器守。
test('已提交的卡：按「儲存草稿」不會退回草稿狀態',async()=>{
 const h=await harness(),token=await h.student();
 assert.equal((await h.call({action:'save',token,submission:{...fullCard(),status:'submitted'}})).status,200);
 assert.equal(h.tables.week1_submissions[0].status,'submitted');

 const r=await h.call({action:'save',token,submission:{...fullCard(),status:'draft'}});
 assert.equal(r.status,200,'內容完整的儲存不該被擋');
 assert.equal(h.tables.week1_submissions[0].status,'submitted','已提交的卡不可退回草稿');
 assert.equal(r.body.submission.status,'submitted','回傳的狀態也要是 submitted，否則前端會把提交區塊藏起來');
});

test('已提交的卡：空白內容會被擋下，資料庫維持原狀',async()=>{
 const h=await harness(),token=await h.student();
 await h.call({action:'save',token,submission:{...fullCard(),status:'submitted'}});
 const before=structuredClone(h.tables.week1_submissions[0]);

 const r=await h.call({action:'save',token,submission:{...blankCard(),status:'draft'}});
 assert.equal(r.status,422,'空白覆蓋必須被拒絕');
 assert.match(r.body.error,/已經提交/);
 for(const k of FIELDS)assert.equal(h.tables.week1_submissions[0][k],before[k],`${k} 不該被清空`);
 assert.equal(h.tables.week1_submissions[0].status,'submitted');
});

test('還沒提交的學生仍然可以存空白草稿（不要為了修 bug 把正常用法擋掉）',async()=>{
 const h=await harness(),token=await h.student();
 const r=await h.call({action:'save',token,submission:{...blankCard(),status:'draft'}});
 assert.equal(r.status,200);
 assert.equal(h.tables.week1_submissions[0].status,'draft');
});

test('已提交的學生仍然可以修改後重新提交',async()=>{
 const h=await harness(),token=await h.student();
 await h.call({action:'save',token,submission:{...fullCard(),status:'submitted'}});
 const edited={...fullCard(),observed_problem:'改過的觀察',status:'submitted'};
 const r=await h.call({action:'save',token,submission:edited});
 assert.equal(r.status,200);
 assert.equal(h.tables.week1_submissions[0].observed_problem,'改過的觀察');
 assert.equal(h.tables.week1_submissions[0].status,'submitted');
});

test('前端：提交之後不再顯示「儲存草稿」與「清除內容」',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(src,/draftBtn\)draftBtn\.hidden=submitted/,'提交後要藏起「儲存草稿」');
 assert.match(src,/clearBtn\)clearBtn\.hidden=submitted/,'提交後要藏起「清除內容」');
 // 伺服器端的守門是真正的防線，前端只是不要把人帶到那條路上。
 const api=await fsp.readFile(new URL('../supabase/functions/student-api/index.ts',import.meta.url),'utf8');
 assert.match(api,/const locked = current\?\.status === 'submitted'/,'伺服器要先讀目前狀態');
 assert.match(api,/fields\.status = locked \? 'submitted' : input\.status/,'伺服器不可接受降級');
});

// 正式班實查：44 個學號登入過，只有 37 筆作答。
// A111270229 與 a111270229 是同一個人的兩種寫法，各自一張卡；
// A1130309125 / A30309125 / A11309125 是同一人的三種寫法。
// 學號打錯或大小寫不同 → 靜默進到一張全新的空白卡 → 學生以為作業不見了。
test('學號一律轉大寫去空白：大小寫不同的同一人不會變成兩張卡',async()=>{
 const h=await harness();
 // 先用大寫建立一份已提交的卡
 const upper=await h.student('A111270229');
 await h.call({action:'save',token:upper,submission:{...fullCard(),status:'submitted'}});

 // 再用小寫登入，應該被視為同一個人（而且不必確認，因為紀錄已存在）
 const r=await h.call({action:'login',student_id:' a111270229 ',invite_code:'whatever'});
 assert.equal(r.status,200,r.body?.error);
 assert.equal(r.body.student_id,'A111270229','學號要正規化成大寫並去掉空白');

 const rows=h.tables.week1_submissions.filter(x=>x.student_id.toUpperCase()==='A111270229');
 assert.equal(rows.length,1,'不可以變成兩張卡');
});

test('本班沒有這個學號時，先回 409 問一次，而且不建立任何資料',async()=>{
 const h=await harness();
 const before=h.tables.student_sessions.length;
 const r=await h.call({action:'login',student_id:'A11309125',invite_code:'whatever'});
 assert.equal(r.status,409);
 assert.equal(r.body.unknown_student,true,'前端要靠這個旗標才知道該問，不是靠訊息字串');
 assert.equal(r.body.student_id,'A11309125','要把正規化後的學號回傳，讓學生看到自己打的是什麼');
 assert.equal(h.tables.student_sessions.length,before,'被擋下時不可以建立 session');
});

test('真的第一次進入的人按「是」就能進去，不會被擋住',async()=>{
 const h=await harness();
 const r=await h.call({action:'login',student_id:'A113270099',invite_code:'whatever',confirm_new:true});
 assert.equal(r.status,200,r.body?.error);
 assert.ok(r.body.token,'要拿到權杖');
 assert.equal(r.body.student_id,'A113270099');
});

test('已經有作答紀錄的人照常登入，不會被多問一次',async()=>{
 const h=await harness();
 const t=await h.student('A113270003');
 await h.call({action:'save',token:t,submission:{...fullCard(),status:'submitted'}});
 const r=await h.call({action:'login',student_id:'A113270003',invite_code:'whatever'});
 assert.equal(r.status,200,'有紀錄的人不該被攔');
});

test('前端：409 要走確認流程，不是直接把錯誤訊息丟出來',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.match(src,/error\.body=body/,'api\(\) 要把回應內容帶出來，否則前端讀不到旗標');
 assert.match(src,/e\.status===409&&e\.body&&e\.body\.unknown_student/,'要用旗標判斷，不要比對訊息字串');
 assert.match(src,/function askFirstTime\(typedId\)/,'要有確認流程');
 assert.match(src,/是，我第一次進入/,'第一次進入的人要有一條路');
 assert.match(src,/我要改學號/,'打錯的人也要有一條路');
 assert.match(src,/enterStudent\(true\)/,'按「是」之後要帶 confirm_new 重送');
});
