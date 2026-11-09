import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/week2-harness.mjs';

test('Edge 群島進度：islands_load 空→save 存整包→load 回來帶組裡認的方向→格式錯 422→teacher_load 帶 islands；沒 token 擋',async()=>{
 const h=await harness();const a=await h.student('A113270095');
 const l0=await h.call({action:'islands_load',token:a});assert.equal(l0.status,200);assert.equal(l0.body.row,null);assert.deepEqual(l0.body.directions,[]);
 const data={boxes:{owner:{found:true,passed:3,scores:[10,7,10],opened:true,url:'https://owner.com',est:'',estOk:null}},dir:2,candidates:['owner','palona'],updated_at:'2026-11-27T05:00:00.000Z'};
 const sv=await h.call({action:'islands_save',token:a,data});assert.equal(sv.status,200);assert.equal(sv.body.row.data.boxes.owner.opened,true);assert.ok(sv.body.row.data.saved_at);
 // 再存一次會更新同一列（不是新增）
 const sv2=await h.call({action:'islands_save',token:a,data:{...data,candidates:['owner']}});assert.equal(sv2.status,200);assert.equal(h.tables.islands_progress.length,1);assert.deepEqual(sv2.body.row.data.candidates,['owner']);
 assert.equal((await h.call({action:'islands_save',token:a,data:'oops'})).status,422);
 assert.equal((await h.call({action:'islands_save',token:a,data:{boxes:[1]}})).status,422);
 // 建組認方向二 → islands_load 帶 directions
 await h.call({action:'team_create',token:a,name:'島隊'});await h.call({action:'team_claim',token:a,directions:[2]});
 const l1=await h.call({action:'islands_load',token:a});assert.deepEqual(l1.body.directions,[2]);assert.ok(l1.body.team_id);
 const tl=await h.call({action:'teacher_load'},'teacher-token');assert.equal(tl.body.islands.length,1);assert.equal(tl.body.islands[0].student_id,'A113270095');
 assert.equal((await h.call({action:'islands_load'})).status,401);
});
