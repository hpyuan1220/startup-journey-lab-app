import test from 'node:test';import assert from 'node:assert/strict';
import {studentProgress,progressWeek2,progressWeek3,progressWeek4,progressWeek5} from '../progress-core.mjs';
test('沒有任何紀錄：五週都「還沒開始」，下一步是 Week 1',()=>{const p=studentProgress({});assert.equal(p.doneCount,0);assert.deepEqual(p.weeks.map(w=>w.state),['none','none','none','none','none']);assert.match(p.next,/^Week 1：/);});
test('Week 2 審核狀態對到四種字',()=>{
 assert.equal(progressWeek2({status:'draft'}).label,'草稿');
 assert.equal(progressWeek2({status:'submitted',review_status:'pending'}).label,'已提交');
 assert.equal(progressWeek2({status:'submitted',review_status:'approved'}).label,'老師已確認');
 assert.equal(progressWeek2({status:'submitted',review_status:'revision'}).state,'revise');
 assert.equal(progressWeek2({status:'submitted',review_status:'hold'}).label,'請先討論');});
test('Week 3：記了幾次、只差提交、已提交',()=>{
 const it=(q)=>({who:'店員 A',when_where:'10/20 店裡',quotes:q});
 assert.equal(progressWeek3({status:'draft',record:{interviews:[it('每次排隊都要二十分鐘'),{},{}]}}).label,'訪談 1/3');
 assert.equal(progressWeek3({status:'draft',record:{interviews:[it('每次排隊都要二十分鐘'),it('上個月漏了十二筆單'),it('每天中午都遇到這件事')]}}).label,'3 次都記了');
 assert.equal(progressWeek3({status:'submitted',record:{interviews:[it('每次排隊都要二十分鐘'),it('上個月漏了十二筆單'),it('每天中午都遇到這件事')]}}).state,'done');});
test('Week 4：三張卡幾張、差什麼',()=>{
 const p=progressWeek4({data:{pain:'午休排隊',industry:{card:1},card1:{text:'x',source:'gemini'}}});assert.equal(p.label,'三張卡 1/3');assert.match(p.detail,/卡 2、卡 3/);
 assert.equal(progressWeek4({data:{pain:'p',industry:{card:1},card1:{text:'a',source:'gemini'},card2:{text:'b',source:'notebooklm'},card3:{text:'c',source:'gpt',opps:['1','2','3']}}}).state,'done');});
test('Week 5：沒開始、做了一部分',()=>{assert.equal(progressWeek5(null).state,'none');const p=progressWeek5({data:{q1:'x'}});assert.equal(p.state,'partial');assert.match(p.detail,/還差/);});
test('有做完的週不算進下一步；全做完有收尾句',()=>{
 const full={week1:{status:'submitted'},week2:{status:'submitted',review_status:'approved'},week3:{status:'submitted',record:{interviews:[]}},week4:{data:{pain:'p',industry:{card:1},card1:{text:'a',source:'gemini'},card2:{text:'b',source:'notebooklm'},card3:{text:'c',source:'gpt',opps:['1','2','3']}}},week5:null};
 const p=studentProgress(full);assert.equal(p.doneCount,4);assert.match(p.next,/^Week 5：/);});
