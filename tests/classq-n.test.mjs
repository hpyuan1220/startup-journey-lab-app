import test from 'node:test';
import assert from 'node:assert/strict';
import {QKEYS,questionKeys,resolveQuestions,normalizeQuestions,normalizeClassQ,emptyClassQ,attendance,DEFAULT_QUESTIONS} from '../week4-core.mjs';
import {buildPrompt5} from '../week5-core.mjs';
import {harness} from './support/week2-harness.mjs';

test('課堂題數 2–5：預設兩題；extra 加題；留白不算題；normalizeQuestions 只在有第 3 題時帶 extra',()=>{
 assert.deepEqual(QKEYS,['q1','q2','q3','q4','q5']);
 const q2=resolveQuestions(9,null);assert.deepEqual(questionKeys(q2),['q1','q2']);assert.equal(q2.q3,undefined);
 const q3=resolveQuestions(9,{q1:'',q2:'',points:'',extra:['第三題','',' ']});assert.deepEqual(questionKeys(q3),['q1','q2','q3']);assert.equal(q3.q3,'第三題');assert.match(q3.q1,/誰付錢/,'Q1 仍用預設');
 const q5=resolveQuestions(9,{extra:['三','四','五','六']});assert.deepEqual(questionKeys(q5),['q1','q2','q3','q4','q5']);
 assert.deepEqual(normalizeQuestions({q1:'a',q2:'',points:'',q3:'',q4:''}),{q1:'a',q2:'',points:''});
 assert.deepEqual(normalizeQuestions({q1:'a',q3:'c',q5:'e'}),{q1:'a',q2:'',points:'',extra:['c','','e']});
 const e=emptyClassQ();assert.equal(Object.keys(e).length,10);assert.equal(normalizeClassQ({q3:'x',q3_ai:'y',zz:1}).q3,'x');
 assert.match(buildPrompt5('q3',{q3:'我的答案'},{q3:'第三題？',points:''}),/第三題？[\s\S]*我的答案/);
 assert.equal(buildPrompt5('q6',{},{}),'');
});

test('出席：題數多就要全答在課中',()=>{
 const inWin='2026-11-27T05:30:00Z',late='2026-11-27T12:00:00Z';
 assert.equal(attendance({q1:inWin,q2:inWin},9),true);
 assert.equal(attendance({q1:inWin,q2:inWin},9,['q1','q2','q3']),false,'第 3 題沒答');
 assert.equal(attendance({q1:inWin,q2:inWin,q3:inWin},9,['q1','q2','q3']),true);
 assert.equal(attendance({q1:inWin,q2:inWin,q3:late},9,['q1','q2','q3']),false);
 assert.equal(attendance({q1:inWin,q2:inWin},9,[]),false);
});

test('Edge：老師存第 3 題 → 學生 classq_load 看到三題；class_q_ai 收 q3、擋 q4；沒加題時 q3 被擋',async()=>{
 const h=await harness();const token=await h.student('A113990001');
 assert.equal((await h.call({action:'class_q_ai',token,week:9,q:'q3'})).status,400,'沒加題 q3 是未知題目');
 const t=await h.call({action:'teacher_week_questions',class_id:'class-a',week:9,questions:{q1:'',q2:'',q3:'第三題：你組的三家到齊了嗎？',points:''}},'teacher-token');
 assert.equal(t.status,200);assert.deepEqual(t.body.resolved.q3,'第三題：你組的三家到齊了嗎？');assert.deepEqual(h.tables.week_questions[0].extra,['第三題：你組的三家到齊了嗎？']);
 const l=await h.call({action:'classq_load',token,week:9});assert.deepEqual(questionKeys(l.body.questions),['q1','q2','q3']);
 const s=await h.call({action:'classq_save',token,week:9,version:null,data:{q1:'a',q2:'b',q3:'到齊了'}});assert.equal(s.status,200);assert.ok(s.body.row.stamps.q3);assert.equal(s.body.row.data.q3,'到齊了');
 const ai=await h.call({action:'class_q_ai',token,week:9,q:'q3'});assert.equal(ai.status,200);assert.match(JSON.stringify(h.inputs.at(-1)),/到齊了/);
 assert.equal((await h.call({action:'class_q_ai',token,week:9,q:'q4'})).status,400);
 assert.equal((await h.call({action:'class_q_ai',token,week:9,q:'q9'})).status,400);
 // 清掉第 3 題 → 回兩題
 const t2=await h.call({action:'teacher_week_questions',class_id:'class-a',week:9,questions:{q1:'新一',q2:'',q3:'',points:''}},'teacher-token');assert.equal(t2.status,200);assert.deepEqual(questionKeys(t2.body.resolved),['q1','q2']);
 // 全清 → 刪列
 await h.call({action:'teacher_week_questions',class_id:'class-a',week:9,questions:{}},'teacher-token');assert.equal(h.tables.week_questions.length,0);
});
