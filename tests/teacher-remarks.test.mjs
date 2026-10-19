import test from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/week2-harness.mjs';
import {remarkText,tagLabel,findRemark,suggestTag} from '../teacher-remarks.mjs';

test('老師備註：存、改、清除；teacher_load 帶回；學生端拿不到', async () => {
 const h=await harness();const token=await h.student('A113270021');
 const bad=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:4,tag:'great',note:''},'teacher-token');assert.equal(bad.status,422,'標記只能四選一');
 const bad2=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:13,tag:'active',note:''},'teacher-token');assert.equal(bad2.status,422,'週數 1–12');
 const r1=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:4,tag:'active',note:'  上台講得清楚\n'},'teacher-token');
 assert.equal(r1.status,200);assert.equal(r1.body.remarks.length,1);assert.equal(r1.body.remarks[0].tag,'active');assert.equal(r1.body.remarks[0].note,'上台講得清楚');
 const r2=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:1,tag:'',note:'第一週沒來'},'teacher-token');assert.equal(r2.body.remarks.length,2,'不同週各一格');
 const r3=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:4,tag:'passive',note:'上台講得清楚'},'teacher-token');
 assert.equal(r3.body.remarks.find(r=>r.week===4).tag,'passive','同週覆蓋不是新增');assert.equal(r3.body.remarks.length,2);
 const load=await h.call({action:'teacher_load'},'teacher-token');assert.equal(load.body.remarks.length,2,'teacher_load 帶回 remarks');
 const gone=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:1,tag:'',note:''},'teacher-token');assert.equal(gone.body.remarks.length,1,'兩者都空＝刪掉');
 const other=await h.call({action:'teacher_remark',class_id:'class-b',student_id:'A113270021',week:4,tag:'active',note:''},'teacher-token');assert.equal(other.status,403,'沒授權的班級');
 const asStudent=await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270021',week:4,tag:'active',note:''},'not-a-teacher');assert.equal(asStudent.status,401);
 for(const action of ['load','week3_load','week4_load']){const s=await h.call({action,token});assert.equal(JSON.stringify(s.body).includes('上台講得清楚'),false,`${action} 不會回傳老師備註`);assert.equal('remarks' in (s.body||{}),false);}
});

test('remarkText／tagLabel／findRemark', () => {
 assert.equal(tagLabel('absent'),'缺席');assert.equal(tagLabel('x'),'');
 assert.equal(remarkText({tag:'active',note:'問了好問題'}),'積極：問了好問題');
 assert.equal(remarkText({tag:'',note:'只打字'}),'只打字');assert.equal(remarkText({tag:'normal',note:''}),'普通');assert.equal(remarkText({tag:'',note:' '}),'');
 const rs=[{class_id:'c',student_id:'s',week:2,tag:'normal',note:''}];
 assert.equal(findRemark(rs,'c','s',2).tag,'normal');assert.equal(findRemark(rs,'c','s',3),null);
});

test('suggestTag：Week 1–3 依作業推算（老師沒點就只是建議）', () => {
 const sub={status:'submitted'},draft={status:'draft'};
 assert.equal(suggestTag(1,{}).tag,'absent');assert.equal(suggestTag(1,{w1:sub}).tag,'normal');assert.equal(suggestTag(1,{w1:draft}).tag,'passive');
 assert.equal(suggestTag(2,{}).tag,'absent');assert.equal(suggestTag(2,{w2:{status:'submitted',review_status:'approved'}}).tag,'active');assert.equal(suggestTag(2,{w2:{status:'submitted',review_status:'pending'}}).tag,'normal');assert.equal(suggestTag(2,{w2:{status:'draft',submitted_at:'2026-10-01'}}).tag,'normal','交過再改草稿仍算已交');assert.equal(suggestTag(2,{w2:draft}).tag,'passive');
 assert.equal(suggestTag(3,{}).tag,'absent');assert.equal(suggestTag(3,{w3:sub,interviews:3}).tag,'active');assert.equal(suggestTag(3,{w3:draft,interviews:3}).tag,'normal','三次記完沒按提交＝普通');assert.equal(suggestTag(3,{w3:draft,interviews:1}).tag,'normal');assert.equal(suggestTag(3,{w3:draft,interviews:0}).tag,'passive');
 assert.equal(suggestTag(4,{}),null,'Week 4 起看課堂兩題，不推算');
});
