import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/week2-harness.mjs';
import {makeCode,normalizeCode,teamLocked,teamSummary,industryOptions,normalizeDirections,TEAM_LOCK_AT} from '../team-core.mjs';

test('team-core：組碼 4 碼無 I/O/0/1、鎖定時間、摘要缺什麼、產業選項從組員 Week 4 來',()=>{
 for(let i=0;i<50;i++){const c=makeCode();assert.match(c,/^[A-HJ-NP-Z2-9]{4}$/);}
 assert.equal(normalizeCode(' ab-c9 '),'ABC9');
 assert.equal(teamLocked(null,Date.parse('2026-11-20T06:00:00Z')),false);
 assert.equal(TEAM_LOCK_AT,'2026-12-19T00:00:00+08:00','期末後才鎖');assert.equal(teamLocked(null,Date.parse('2026-11-27T06:00:00Z')),false,'11/27 還不鎖');assert.equal(teamLocked(null,Date.parse(TEAM_LOCK_AT)),true);
 assert.equal(teamLocked({locked:true},Date.parse('2026-11-20T06:00:00Z')),true);
 const team={id:'t1',industry:{card:null,custom:''}};
 const ms=[{team_id:'t1',student_id:'S1',directions:[1]},{team_id:'t1',student_id:'S2',directions:[]},{team_id:'t2',student_id:'S9',directions:[2]}];
 const sm=teamSummary(team,ms);assert.equal(sm.count,2);assert.equal(sm.full,false);
 assert.ok(!sm.missing.some(x=>/產業線/.test(x)),'產業線選填，不算缺');assert.ok(sm.missing.some(x=>/方向二/.test(x)&&/方向三/.test(x)));assert.ok(sm.missing.some(x=>/S2/.test(x)));
 const ok=teamSummary({id:'t1',industry:{card:null,custom:''}},[{team_id:'t1',student_id:'S1',directions:[1]},{team_id:'t1',student_id:'S2',directions:[2,3]}]);assert.equal(ok.complete,true);
 const opts=industryOptions(ms.slice(0,2),{S1:{card:1},S2:{card:'custom',custom:'保母'}});assert.deepEqual(opts.map(o=>o.label),['餐飲小店','保母']);
 assert.deepEqual(normalizeDirections([3,'1',3,9]),[1,3]);
});

test('Edge 建組：建組拿組碼→另一人加入→第 4 人被擋→選產業→認方向（重複被擋）→離開→空組刪除→想被分組→老師指定與鎖定',async()=>{
 const h=await harness();const [a,b,c,d]=await Promise.all(['A113270091','A113270092','A113270093','A113270094'].map(id=>h.student(id)));
 const l0=await h.call({action:'team_load',token:a});assert.equal(l0.status,200);assert.equal(l0.body.team,null);assert.equal(l0.body.locked,false);
 assert.equal((await h.call({action:'team_create',token:a,name:'  '})).status,422);
 const cr=await h.call({action:'team_create',token:a,name:'火鍋隊'});assert.equal(cr.status,200);const code=cr.body.team.code;assert.match(code,/^[A-Z2-9]{4}$/);assert.equal(cr.body.members.length,1);
 assert.equal((await h.call({action:'team_create',token:a,name:'再一組'})).status,409,'已有組不能再建');
 assert.equal((await h.call({action:'team_join',token:b,code:'ZZZZ'})).status,404);
 const j=await h.call({action:'team_join',token:b,code:code.toLowerCase()});assert.equal(j.status,200);assert.equal(j.body.members.length,2);
 await h.call({action:'team_join',token:c,code});
 const full=await h.call({action:'team_join',token:d,code});assert.equal(full.status,409);assert.match(full.body.error,/滿 3 人/);
 const ind=await h.call({action:'team_industry',token:b,industry:{card:1}});assert.equal(ind.body.team.industry.card,1);
 assert.equal((await h.call({action:'team_claim',token:a,directions:[1]})).status,200);
 const dup=await h.call({action:'team_claim',token:b,directions:[1,2]});assert.equal(dup.status,409);assert.match(dup.body.error,/方向一/);
 assert.equal((await h.call({action:'team_claim',token:b,directions:[2]})).status,200);
 assert.equal((await h.call({action:'team_claim',token:c,directions:[1,2,3]})).status,422,'最多兩個');
 // 離開：c 離開後剩 2 人；全部離開組就刪掉
 assert.equal((await h.call({action:'team_leave',token:c})).body.team,null);
 assert.equal(h.tables.team_members.find(m=>m.student_id==='A113270093').team_id,null);
 // 想被分組
 const w=await h.call({action:'team_want',token:d,want:true});assert.equal(w.status,200);assert.equal(h.tables.team_members.find(m=>m.student_id==='A113270094').wants_assignment,true);
 // 老師：指定 d 進組、鎖定全部後學生不能改、解鎖後可以
 const t1=await h.call({action:'teacher_team',class_id:'class-a',op:'assign',student_id:'A113270094',team_id:cr.body.team.id},'teacher-token');assert.equal(t1.status,200);assert.equal(t1.body.team_members.filter(m=>m.team_id===cr.body.team.id).length,3);
 await h.call({action:'teacher_team',class_id:'class-a',op:'lock',team_id:'all',locked:true},'teacher-token');
 assert.equal((await h.call({action:'team_claim',token:d,directions:[3]})).status,423);
 assert.equal((await h.call({action:'team_load',token:d})).body.locked,true);
 await h.call({action:'teacher_team',class_id:'class-a',op:'lock',team_id:'all',locked:false},'teacher-token');
 assert.equal((await h.call({action:'team_claim',token:d,directions:[3]})).status,200);
 // 老師建空組、刪空組、有人的不能刪
 const tc=await h.call({action:'teacher_team',class_id:'class-a',op:'create',name:'老師組'},'teacher-token');const empty=tc.body.teams.find(t=>t.name==='老師組');assert.ok(empty);
 assert.equal((await h.call({action:'teacher_team',class_id:'class-a',op:'delete',team_id:cr.body.team.id},'teacher-token')).status,409);
 assert.equal((await h.call({action:'teacher_team',class_id:'class-a',op:'delete',team_id:empty.id},'teacher-token')).status,200);
 // teacher_load 帶 teams／team_members
 const tl=await h.call({action:'teacher_load'},'teacher-token');assert.equal(tl.body.teams.length,1);assert.ok(tl.body.team_members.length>=3);
 // 全部離開 → 組被刪
 for(const t of [a,b,d])await h.call({action:'team_leave',token:t});
 assert.equal(h.tables.teams.length,0);
});
