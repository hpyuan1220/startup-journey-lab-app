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
