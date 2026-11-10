import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/week2-harness.mjs';
import {companyDir,normalizeReps,teamReps,COMPANY_ISLAND,COMPANY_NAME} from '../islands-core.mjs';
import {COMPANIES,ISLANDS} from '../islands-data.mjs';

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

test('islands-core 與 islands-data 一致：公司→島、島→方向、名字；normalizeReps／teamReps',()=>{
 assert.deepEqual(Object.keys(COMPANY_ISLAND).sort(),COMPANIES.map(c=>c.id).sort());
 for(const c of COMPANIES){assert.equal(COMPANY_ISLAND[c.id],c.island,c.id);assert.equal(COMPANY_NAME[c.id],c.name);assert.equal(companyDir(c.id),ISLANDS.find(i=>i.id===c.island).dir,c.id);}
 assert.deepEqual(normalizeReps({'2':'OWNER','1':'owner','9':'sage','3':'nope'}),{2:'owner'});
 assert.deepEqual(teamReps([{student_id:'A',reps:{2:'owner'}},{student_id:'B',reps:{1:'arcade',3:'sage'}},{student_id:'C',reps:{2:'palona'}}]),{1:{student_id:'B',company:'arcade'},2:{student_id:'A',company:'owner'},3:{student_id:'B',company:'sage'}});
});

test('Edge team_rep：沒組 409→認方向二→公司不在方向 422→沒開箱 422→開箱後設 Owner 200→換 Palona→清掉；team_load 帶 reps；islands_load 帶 reps',async()=>{
 const h=await harness();const a=await h.student('A113270096');
 assert.equal((await h.call({action:'team_rep',token:a,direction:2,company:'owner'})).status,409,'沒組');
 await h.call({action:'team_create',token:a,name:'代表隊'});
 assert.match((await h.call({action:'team_rep',token:a,direction:2,company:'owner'})).body.error,/先在組卡認/);
 await h.call({action:'team_claim',token:a,directions:[2]});
 assert.match((await h.call({action:'team_rep',token:a,direction:2,company:'sage'})).body.error,/不在你認的方向/);
 assert.match((await h.call({action:'team_rep',token:a,direction:2,company:'owner'})).body.error,/先開完/);
 await h.call({action:'islands_save',token:a,data:{boxes:{owner:{opened:true,passed:3,scores:[10,10,10]},palona:{opened:true,passed:3,scores:[7,7,7]}},dir:2,candidates:['owner','palona']}});
 const r1=await h.call({action:'team_rep',token:a,direction:2,company:'owner'});assert.equal(r1.status,200);assert.deepEqual(r1.body.members.find(m=>m.student_id==='A113270096').reps,{2:'owner'});
 const r2=await h.call({action:'team_rep',token:a,direction:2,company:'Palona'});assert.deepEqual(r2.body.members[0].reps,{2:'palona'});
 const l=await h.call({action:'islands_load',token:a});assert.deepEqual(l.body.reps,{2:'palona'});
 const r3=await h.call({action:'team_rep',token:a,direction:2,company:null});assert.deepEqual(r3.body.members[0].reps,{});
 const tl=await h.call({action:'team_load',token:a});assert.ok('reps' in tl.body.members[0]);
});
