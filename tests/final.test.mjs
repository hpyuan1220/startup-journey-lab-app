import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGroup,formatGroup,parsePersonal,formatPersonal,groupSum,personalCompletion,finalTotal,parseRehearsal,formatRehearsal,teamKey,GROUP_ITEMS,C_MAX} from '../final-core.mjs';
import {harness} from './support/week2-harness.mjs';

test('final-core：組分／個人分格式來回、完成度、總分',()=>{
 assert.equal(GROUP_ITEMS.length,5);assert.equal(C_MAX,30);
 const g=parseGroup('FG1|g=10,5,,0,10|pdf=1');assert.deepEqual(g,{g:[10,5,null,0,10],pdf:true});assert.equal(formatGroup(g),'FG1|g=10,5,,0,10|pdf=1');assert.equal(groupSum(g),25);
 assert.deepEqual(parseGroup(''),{g:[null,null,null,null,null],pdf:false});assert.deepEqual(parseGroup('MT2|p=1,0|c=42'),{g:[null,null,null,null,null],pdf:false},'期中格式不會被當期末');
 const p=parsePersonal('FG1|c=25');assert.equal(p.c,25);assert.equal(formatPersonal(p),'FG1|c=25');assert.equal(parsePersonal('FG1|c=31').c,null);
 const comp=personalCompletion({prog:{boxes:{owner:{opened:true,url:'https://a'},palona:{opened:true}},cards:{owner:{sources:['https://b','https://c'],why:'便宜'}}},reps:{2:'owner'},classq9:true,classq10:true});
 assert.deepEqual(comp.items,[true,true,true,true]);assert.equal(comp.total,20);
 assert.equal(personalCompletion({prog:{boxes:{owner:{opened:true}}},reps:{},classq9:true,classq10:false}).total,0);
 assert.equal(finalTotal(g,25,20),70);
 assert.equal(teamKey('fvku'),'TEAMFVKU');
});
test('final-core：預演講評格式（分號、直線跳脫）',()=>{
 const o={onTime:false,notes:['誰付錢講清楚了','數字；要來源','','第4頁沒有比|各講各的','','學到什麼補一句'],general:'整體超時 40 秒'};
 const s=formatRehearsal(o);const b=parseRehearsal(s);assert.equal(b.onTime,false);assert.equal(b.notes[1],'數字；要來源');assert.equal(b.notes[3],'第4頁沒有比|各講各的');assert.equal(b.notes[2],'');assert.equal(b.general,'整體超時 40 秒');
 assert.deepEqual(parseRehearsal('').notes.length,6);assert.equal(parseRehearsal('').onTime,null);
});
test('Edge：老師寫預演講評（TEAM+組碼、week 11）→ 學生 team_load 看到 rehearsal；其他備註不外流',async()=>{
 const h=await harness();const a=await h.student('A113270099');const t=await h.call({action:'team_create',token:a,name:'預演隊'});
 const r=await h.call({action:'teacher_remark',class_id:'class-a',student_id:teamKey(t.body.team.code),week:11,tag:'',note:formatRehearsal({onTime:true,notes:['好','','','','',''],general:'讚'})},'teacher-token');assert.equal(r.status,200);
 await h.call({action:'teacher_remark',class_id:'class-a',student_id:'A113270099',week:11,tag:'passive',note:'私下備註'},'teacher-token');
 const l=await h.call({action:'team_load',token:a});assert.equal(l.body.rehearsal.onTime,true);assert.equal(l.body.rehearsal.notes[0],'好');assert.equal(l.body.rehearsal.general,'讚');assert.ok(!JSON.stringify(l.body).includes('私下備註'));
 const l0=await h.call({action:'team_load',token:await h.student('A113270100')});assert.equal(l0.body.rehearsal,null);
});
