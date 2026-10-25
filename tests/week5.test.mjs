import test from 'node:test';import assert from 'node:assert/strict';
import {FIVE_QUESTIONS,MAX_SCORE,emptyWeek5,normalizeWeek5,totals,topChoice,choiceNeedsReason,choiceOk,week5Progress,applyStamps5,buildPrompt5,parseRebuttal,draftPage,OPP_KEYS} from '../week5-core.mjs';

const filled=(scoreA=2,scoreB=1,scoreC=0)=>{const d=emptyWeek5();d.opps=['a','b','c'];for(const [k,v] of [['A',scoreA],['B',scoreB],['C',scoreC]])for(const q of FIVE_QUESTIONS)d.scores[k][q.key]={score:v,evidence:k==='C'?'估計':'外送抽成 30%（來源：聯合報）'};return normalizeWeek5(d);};

test('五問固定五題、滿分 10；normalize 把亂值清掉', () => {
 assert.equal(FIVE_QUESTIONS.length,5);assert.equal(MAX_SCORE,10);
 const d=normalizeWeek5({opps:['x'],scores:{A:{pay:{score:'2',evidence:'e'},freq:{score:7,evidence:''}},Z:{pay:{score:2}}},choice:{key:'Q',reason:'r'},rebuttal:{text:'t',source:'bing'},page:['p']});
 assert.equal(d.scores.A.pay.score,2);assert.equal(d.scores.A.freq.score,null,'超出 0–2 視為沒打');assert.equal(d.choice.key,'');assert.equal(d.rebuttal.source,'');assert.equal(d.page.length,6);
});
test('totals／topChoice：A 10、B 5、C 0；估計格數；同分取前面的', () => {
 const d=filled();const t=totals(d);
 assert.equal(t.A.sum,10);assert.equal(t.B.sum,5);assert.equal(t.C.sum,0);assert.equal(t.C.estimated,5);assert.equal(t.A.complete,true);assert.equal(topChoice(d),'A');
 const e=filled(1,1,1);assert.equal(topChoice(e),'A');
 assert.equal(topChoice(emptyWeek5()),'');
});
test('選非最高分要理由（≥20 字）', () => {
 const d=filled();d.choice={key:'B',reason:''};assert.equal(choiceNeedsReason(d),true);assert.equal(choiceOk(d),false);
 d.choice.reason='因為我接觸得到第一個付錢的人，而且已經有兩家店答應試用';assert.equal(choiceOk(d),true);
 d.choice={key:'A',reason:''};assert.equal(choiceNeedsReason(d),false);assert.equal(choiceOk(d),true);
});
test('parseRebuttal：抓三回合與總結；亂貼回空', () => {
 const r=parseRebuttal('【反方紀錄】\n拒絕 1：不花錢。\n我的回應 1：你漏單 12 筆。\n拒絕 2：不信學生。\n我的回應 2：免費兩週。\n拒絕 3：抽成都付了。\n我的回應 3：沒證據。\n總結：第一回合說服了我。');
 assert.equal(r.rounds.length,3);assert.equal(r.rounds[0].reject,'不花錢。');assert.equal(r.rounds[2].reply,'沒證據。');assert.match(r.summary,/第一回合/);
 assert.deepEqual(parseRebuttal('老闆說不要').rounds,[]);
 assert.equal(parseRebuttal('拒絕1:a\n我的回應1:b').rounds.length,1,'沒空格、半形冒號也收');
});
test('week5Progress：缺什麼說清楚；全做完 done', () => {
 const d=filled();let p=week5Progress(d);assert.deepEqual(p.missing,['選一個','反方三回合','一頁六段（還差 6 段）']);
 d.choice={key:'A',reason:''};d.rebuttal.text='拒絕 1：x\n我的回應 1：y';d.page=Array(6).fill('這一段有超過二十個字的主張與證據與理論名稱');
 p=week5Progress(normalizeWeek5(d));assert.equal(p.done,true);assert.equal(p.rounds,1);
});
test('applyStamps5：第一次有內容蓋章、沒變不蓋、清空不清章', () => {
 const a=emptyWeek5();const b=filled();const s1=applyStamps5(a,b,{},'2026-10-30T06:00:00Z');assert.equal(s1.scores,'2026-10-30T06:00:00Z');assert.equal(s1.opps,'2026-10-30T06:00:00Z');assert.equal(s1.choice,undefined);
 const s2=applyStamps5(b,b,s1,'2026-10-30T07:00:00Z');assert.equal(s2.scores,'2026-10-30T06:00:00Z');
 const c=normalizeWeek5({...b,opps:['','','']});const s3=applyStamps5(b,c,s2,'2026-10-30T08:00:00Z');assert.equal(s3.opps,'2026-10-30T06:00:00Z');
});
test('反方 prompt 帶機會與五格證據、三回合與【反方紀錄】；草稿用證據填、第六段帶反方', () => {
 const d=filled();d.choice={key:'B',reason:'理由理由理由理由理由理由理由理由理由理由'};d.rebuttal.text='拒絕 1：不花錢。\n我的回應 1：漏單 12 筆。';
 const p=buildPrompt5('rebuttal',d);assert.match(p,/我選的機會是：b/);assert.match(p,/1\. 有人正在為它花錢嗎：1 分｜證據：外送抽成/);assert.match(p,/【拒絕 n】/);assert.match(p,/【反方紀錄】/);
 const pg=draftPage(d);assert.match(pg[0],/機會 B：b/);assert.match(pg[1],/外送抽成 30%/);assert.match(pg[5],/反方第 1 回合說：不花錢/);
 const e=filled();e.choice={key:'C',reason:''};assert.match(draftPage(e)[2],/估計/,'C 的證據是估計，草稿照抄讓學生看到');
});
