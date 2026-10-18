import test from 'node:test';
import assert from 'node:assert/strict';
import {INDUSTRY_CARDS,recommendCards,stampLabel,attendance,normalizeWeek4,applyStamps,buildPrompt,resolveQuestions,toolUrl,classDate} from '../week4-core.mjs';
import {harness} from './support/week2-harness.mjs';

test('產業板九張、推薦依普查題號排序', () => {
 assert.equal(INDUSTRY_CARDS.length,9);
 const r=recommendCards([4,21,9]);
 assert.equal(r[0].card.id,1,'餐飲小店命中 #4 #21');assert.equal(r[0].hits,2);
 assert.equal(r[1].card.id,2,'零工命中 #9');
 assert.equal(recommendCards([])[0].card.id,1,'沒命中就原順序');
});

test('課中判定：台北 13:30–18:00；出席要兩題都課中', () => {
 assert.equal(classDate(4),'2026-10-23');
 assert.deepEqual(stampLabel('2026-10-23T05:30:00Z'),{kind:'in',week:4},'13:30 台北剛好開始');
 assert.deepEqual(stampLabel('2026-10-23T09:59:00Z'),{kind:'in',week:4});
 assert.deepEqual(stampLabel('2026-10-23T10:01:00Z'),{kind:'after'},'18:01 台北就是課後');
 assert.deepEqual(stampLabel('2026-10-24T06:00:00Z'),{kind:'after'},'隔天不是上課日');
 assert.deepEqual(stampLabel('2026-10-30T06:00:00Z'),{kind:'in',week:5});
 assert.equal(stampLabel('nope'),null);
 assert.equal(attendance({q1:'2026-10-23T06:00:00Z',q2:'2026-10-23T06:05:00Z'},4),true);
 assert.equal(attendance({q1:'2026-10-23T06:00:00Z',q2:'2026-10-23T13:05:00Z'},4),false,'Q2 課後就不算出席');
 assert.equal(attendance({q1:'2026-10-30T06:00:00Z',q2:'2026-10-30T06:05:00Z'},4),false,'下週課中不算這週');
});

test('正規化：來源白名單、產業卡 id、自填、長度', () => {
 const d=normalizeWeek4({pain:' 午休排隊 ',industry:{card:'3'},card1:{text:'x',source:'bing'},card3:{opps:['a']}});
 assert.equal(d.pain,'午休排隊');assert.equal(d.industry.card,3);assert.equal(d.card1.source,'');assert.deepEqual(d.card3.opps,['a','','']);
 assert.equal(normalizeWeek4({industry:{card:'custom',custom:'寵物美容'}}).industry.custom,'寵物美容');
 assert.equal(normalizeWeek4({industry:{card:'42'}}).industry.card,null,'不存在的卡');
 assert.equal(normalizeWeek4({industry:{card:2,custom:'x'}}).industry.custom,'','選了卡就不留自填字');
});

test('時間戳：第一次有內容蓋章、改了再蓋、沒改不動、清空不蓋', () => {
 const t1='2026-10-23T06:00:00Z',t2='2026-10-23T07:00:00Z',t3='2026-10-23T08:00:00Z';
 const a=normalizeWeek4({q1:'答'}),s1=applyStamps(null,a,{},t1);
 assert.equal(s1.q1,t1);assert.equal(s1.q2,undefined);
 const s2=applyStamps(a,normalizeWeek4({q1:'答'}),s1,t2);assert.equal(s2.q1,t1,'沒改不動');
 const b=normalizeWeek4({q1:'改了'}),s3=applyStamps(a,b,s2,t3);assert.equal(s3.q1,t3,'改了再蓋');
 const s4=applyStamps(b,normalizeWeek4({q1:''}),s3,'2026-10-23T09:00:00Z');assert.equal(s4.q1,t3,'清空不蓋也不清');
});

test('prompt 帶入產業與痛；兩題有重點與無重點兩種；工具網址', () => {
 const d=normalizeWeek4({pain:'午休排隊 20 分鐘',industry:{card:1},q1:'七成來自工作經驗',card2:{text:'外送抽成 30%（來源：聯合報）'}});
 assert.match(buildPrompt('card1',d),/餐飲小店/);assert.match(buildPrompt('card1',d),/午休排隊 20 分鐘/);
 assert.match(buildPrompt('card3',d),/外送抽成 30%/);
 const q=resolveQuestions(4,null);assert.match(q.q1,/Bhidé/);
 assert.match(buildPrompt('q1',d,q),/【講義重點】/);
 assert.doesNotMatch(buildPrompt('q1',d,{q1:'x',q2:'y',points:''}),/講義重點/);
 assert.equal(resolveQuestions(7,null).q1,resolveQuestions(99,null).q1,'沒預設的週用通用題');
 assert.equal(resolveQuestions(4,{q1:'老師自己出的'}).q1,'老師自己出的');
 assert.match(toolUrl('gpt','你好'),/^https:\/\/chatgpt\.com\/\?q=%E4%BD%A0%E5%A5%BD$/);
 assert.equal(toolUrl('gemini','x'),'https://gemini.google.com/app');
});

test('Edge：week4_load 帶 Week 3 一句話與推薦；save 蓋章、版本衝突 409；teacher_load 帶 week4；老師改兩題', async () => {
 const h=await harness();const token=await h.student('A113270021');
 h.tables.week3_submissions.push({class_id:'class-a',student_id:'A113270021',status:'submitted',version:3,record:{statement:'午休 50 分鐘的學生每週兩次排 20 分鐘'}});
 h.tables.week3_survey_responses.push({class_id:'class-a',student_id:'A113270021',topic_id:4,experienced:true},{class_id:'class-a',student_id:'A113270021',topic_id:9,experienced:false});
 const l=await h.call({action:'week4_load',token});assert.equal(l.status,200);assert.equal(l.body.row,null);assert.equal(l.body.week3_statement,'午休 50 分鐘的學生每週兩次排 20 分鐘');
 assert.equal(l.body.recommended[0].id,1);assert.equal(l.body.recommended[0].hits,1);assert.match(l.body.questions.q1,/Bhidé/);
 const s1=await h.call({action:'week4_save',token,data:{pain:'一句話',industry:{card:1},q1:'答一'}});
 assert.equal(s1.status,200);assert.equal(s1.body.row.version,1);assert.ok(s1.body.row.stamps.q1);assert.equal(s1.body.row.stamps.q2,undefined);assert.equal(s1.body.row.data.industry.card,1);
 const bad=await h.call({action:'week4_save',token,version:0,data:{q1:'答一',q2:'答二'}});assert.equal(bad.status,409);
 const s2=await h.call({action:'week4_save',token,version:1,data:{pain:'一句話',industry:{card:1},q1:'答一',q2:'答二',card1:{text:'錢流',source:'gemini'}}});
 assert.equal(s2.status,200);assert.equal(s2.body.row.stamps.q1,s1.body.row.stamps.q1,'Q1 沒改章不動');assert.ok(s2.body.row.stamps.q2);assert.ok(s2.body.row.stamps.card1);
 const t=await h.call({action:'teacher_load'},'teacher-token');assert.equal(t.body.week4.length,1);assert.deepEqual(t.body.week_questions,[]);
 const q=await h.call({action:'teacher_week_questions',class_id:'class-a',week:4,questions:{q1:'新題一',q2:'',points:''}},'teacher-token');
 assert.equal(q.status,200);assert.equal(q.body.resolved.q1,'新題一');assert.match(q.body.resolved.q2,/六條路徑/,'留白的那題用預設');
 const l2=await h.call({action:'week4_load',token});assert.equal(l2.body.questions.q1,'新題一');
 const clear=await h.call({action:'teacher_week_questions',class_id:'class-a',week:4,questions:{}},'teacher-token');assert.equal(clear.body.week_questions.length,0);
 assert.equal((await h.call({action:'teacher_week_questions',class_id:'class-b',week:4,questions:{q1:'x'}},'teacher-token')).status,403);
});
