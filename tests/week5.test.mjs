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

import {rebuttalNext,appendRebuttal,buildRebuttalTurn,REBUTTAL_AI_LIMIT} from '../week5-core.mjs';
test('反方 app 內：下一步判斷、追加格式能被 parseRebuttal 讀回、prompt 帶機會與紀錄',()=>{
 assert.deepEqual(rebuttalNext(''),{step:'reject',n:1});
 let t=appendRebuttal('',{step:'reject',n:1},'我用 LINE 就好。');assert.equal(t,'拒絕 1：我用 LINE 就好。');
 assert.deepEqual(rebuttalNext(t),{step:'reply',n:1});
 t+='\n我的回應 1：你上個月漏單 12 筆。';assert.deepEqual(rebuttalNext(t),{step:'reject',n:2});
 t=appendRebuttal(t,{step:'reject',n:2},'學生做的我不信。')+'\n我的回應 2：免費試兩週。';
 t=appendRebuttal(t,{step:'reject',n:3},'抽成我付過了。')+'\n我的回應 3：這一題我沒證據。';
 assert.deepEqual(rebuttalNext(t),{step:'summary'});
 t=appendRebuttal(t,{step:'summary'},'第一回合有說服我；最該補現在付給誰多少。');
 assert.deepEqual(rebuttalNext(t),{step:'done'});
 const p=parseRebuttal(t);assert.equal(p.rounds.length,3);assert.equal(p.rounds[1].reply,'免費試兩週。');assert.match(p.summary,/最該補/);
 const d=normalizeWeek5({opps:['包租業者配對室友','b','c'],choice:{key:'A'},rebuttal:{text:'拒絕 1：x\n我的回應 1：y'}});
 const u=buildRebuttalTurn(d,{step:'reject',n:2});assert.match(u,/包租業者配對室友/);assert.match(u,/我的回應 1：y/);assert.match(u,/第 2 個拒絕/);
 assert.match(buildRebuttalTurn(d,{step:'summary'}),/總結/);
 assert.equal(REBUTTAL_AI_LIMIT,8);
});

import {buildNoteDraftV2} from '../note-v2.mjs';
test('研究筆記 v2 草稿：Week 4＋Week 5 排進九段＋AI 使用紀錄；空的也不會壞',()=>{
 const w4={pain:'開學前找室友碰運氣',industry:{card:4},card1:{text:'房東付仲介費一個月租金',source:'gemini'},card2:{text:'空置率高（來源：經濟日報）',source:'notebooklm'},card3:{text:'',opps:['甲','乙','丙']}};
 const sc=v=>({pay:{score:v,evidence:'有人付錢（來源：卡 2）'},freq:{score:v,evidence:'估計'},now:{score:v,evidence:'法規'},unsolved:{score:v,evidence:'沒人做'},entry:{score:v,evidence:'認識房東'}});
 const w5={opps:['機會甲','機會乙',''],scores:{A:sc(2),B:sc(1)},choice:{key:'B',reason:'接觸得到第一個付錢的人'},rebuttal:{text:'拒絕 1：太貴\n我的回應 1：先免費\n總結：要補房東訪談',source:'claude'},page:['一','二','三','四','五','六']};
 const t=buildNoteDraftV2(w4,w5,'A1130309125');
 for(const h of ['0　我的痛','1　產業一句話','2　錢流','3　三個挑戰','4　三個機會','5　我還不確定的事','6　五問計分表','7　為什麼這是好的商業痛點','8　反方紀錄','AI 使用紀錄'])assert.ok(t.includes(h),h);
 assert.match(t,/A1130309125/);assert.match(t,/開學前找室友碰運氣/);assert.match(t,/房東付仲介費/);assert.match(t,/NotebookLM 查到/);
 assert.match(t,/機會 A：機會甲/);assert.match(t,/機會 C：丙/,'Week 5 沒填就用 Week 4 卡 3');
 assert.match(t,/機會 A（總分 10／10/);assert.match(t,/機會 B（總分 5／10/);assert.match(t,/最高分是機會 A）；理由：接觸得到/);
 assert.match(t,/拒絕 1：太貴\n我的回應 1：先免費\n總結：要補房東訪談/);assert.match(t,/反方總結：要補房東訪談/);assert.match(t,/反方：Claude/);
 assert.equal(t.split('\n\n').length,11,'標頭＋十段，Word 會把每段第一行當小標');
 const e=buildNoteDraftV2({},{},'');assert.match(e,/還沒選產業線/);assert.match(e,/我選的是機會 ＿/);assert.equal(e.split('\n\n').length,11);
});
import {buildTalkScript,talkChars} from '../note-v2.mjs';
test('2 分鐘講稿：四段、帶產業線、選的機會與最強一問、反方最後一回合；空的也不會壞',()=>{
 const w4={pain:'開學前找室友碰運氣。後面還有很多',industry:{card:4},card1:{text:'房東付仲介費一個月租金。其他',source:'gemini'},card2:{text:'我研究的是台灣旅宿這一行裡、跟這個痛有關的那一段：\n1. 空置率高造成成本壓力（來源：經濟日報）\n2. 其他',source:'notebooklm'},card3:{opps:['甲','乙','丙']}};
 const sc=v=>({pay:{score:v,evidence:'房東已經付仲介'},freq:{score:1,evidence:'估計'},now:{score:0,evidence:''},unsolved:{score:1,evidence:'x'},entry:{score:1,evidence:'y'}});
 const w5={opps:['機會甲','機會乙',''],scores:{A:sc(2),B:sc(0)},choice:{key:'A',reason:''},rebuttal:{text:'拒絕 1：太貴\n我的回應 1：先免費\n拒絕 2：學生不可信\n我的回應 2：有兩家說要試\n總結：補訪談'},page:[]};
 const t=buildTalkScript(w4,w5,'A1');
 assert.equal((t.match(/【/g)||[]).length,4);assert.match(t,/旅宿與空間出租/);assert.match(t,/開學前找室友碰運氣。這個痛/,'只取第一句');
 assert.match(t,/房東付仲介費一個月租金。業者/);assert.match(t,/挑戰是：〔＿＿＿〕（從卡 2 挑一個/,'挑戰留給學生自己從卡 2 挑');assert.doesNotMatch(t.split('\n\n').slice(1).join(''),/來源/);
 assert.match(t,/機會 A：機會甲。五問總分 5／10，最強的是第 1 問「有人正在為它花錢嗎」：房東已經付仲介/);
 assert.match(t,/老闆說：「學生不可信」我的回應是：有兩家說要試/,'用最後一回合');assert.match(t,/補訪談/);
 assert.ok(talkChars(t)>50&&talkChars(t)<450);
 const e=buildTalkScript({},{},'');assert.equal((e.match(/【/g)||[]).length,4);assert.match(e,/比較頁還沒選/);
});

import {paySentence} from '../note-v2.mjs';
test('錢流那一句：跳過「第一步」判斷段，抓有付錢＋數字的句子；去掉標頭與 markdown',()=>{
 assert.equal(paySentence('## 第一步：痛點判斷 這個痛點落在餐飲小店。\n## 第二步：\n* (1) 金流與頻次：寵物主每次美容付錢 800–1500 元給美容店（估計）。'),'寵物主每次美容付錢 800–1500 元給美容店（估計）');
 assert.equal(paySentence('1.誰付錢給誰：終端消費者以每單 NT$1,200～2,500（估計）付給電商賣家。2.業者最大的一個困難：廣告貴。'),'終端消費者以每單 NT$1,200～2,500（估計）付給電商賣家');
 assert.equal(paySentence('第一行：消費者向業者購買商品，業者則向供應商進貨，並依平台規則支付交易相關費用。'),'消費者向業者購買商品，業者則向供應商進貨，並依平台規則支付交易相關費用');
 assert.equal(paySentence('這個痛點跟產業關係不大。比較像社群工具。'),'','找不到付錢的句子就留空');
 assert.equal(paySentence(''),'');
});

import {fitSentence} from '../note-v2.mjs';
test('講稿第一段：用卡 1「第一步」那句說明痛落在這一行哪一段（Week 1–3 的痛接到 Week 4）',()=>{
 assert.equal(fitSentence('## 第一步：痛點歸屬判斷\n這個痛點落在「餐飲小店」的**現場點餐與出餐環節**。關係很大。'),'這個痛點落在「餐飲小店」的現場點餐與出餐環節');
 assert.match(fitSentence('第一步：判斷——關係不大。 你描述的是找組員的社交媒合，比較像教育科技。'),/關係不大|比較像/);
 assert.equal(fitSentence('第一步：落在哪一段\n'),'','只有標題不算');
 const t=buildTalkScript({pain:'午休排隊',industry:{card:1},card1:{text:'這個痛點落在「餐飲小店」的現場點餐與出餐環節。\n學生每餐付 80 元給小店。'}},{},'');
 assert.match(t,/Week 4 我發現：這個痛點落在「餐飲小店」的現場點餐與出餐環節。/);assert.match(t,/錢是這樣流的：學生每餐付 80 元給小店。/);
});
