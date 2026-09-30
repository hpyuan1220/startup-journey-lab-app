import {test} from 'node:test';import assert from 'node:assert/strict';
import {steps,stepState,sameCard,sameAnswers,progressKey,cardDifferences,stateLabels} from '../week2-journey.mjs';
import {emptyCard} from '../week2-core.mjs';import {demoCard} from './support/week2-harness.mjs';
test('七步固定，空卡、半完成與完成狀態依答案計算',()=>{assert.equal(steps.length,7);const c=emptyCard();assert.equal(stepState(c,null)['0'].state,'empty');c.candidates[0].people='同學';assert.equal(stepState(c,null)['0'].state,'incomplete');const d=demoCard();assert.equal(stepState(d,null)['0'].state,'complete');d.candidates[0].people='';assert.equal(stepState(d,null)['0'].state,'incomplete');});
test('AI 可略過，提交以伺服器版本及目前內容一致為準',()=>{const d=demoCard();assert.equal(stepState(d,null,{skipped:true}).ai.state,'skipped');assert.equal(stepState(d,null).submit.state,'ready');const row={card:structuredClone(d),status:'submitted'};assert.equal(stepState(d,row).submit.state,'submitted');d.reason+='修改';assert.equal(stepState(d,row).submit.state,'ready');});
test('不同班級學生的續作 key 隔離，舊卡 normalize 後可比較',()=>{assert.notEqual(progressKey({class_id:'a',student_id:'1'}),progressKey({class_id:'b',student_id:'1'}));assert.notEqual(progressKey({class_id:'a',student_id:'1'}),progressKey({class_id:'a',student_id:'2'}));assert.ok(sameCard(demoCard(),structuredClone(demoCard())));assert.equal(sameCard(null,demoCard()),false);});

test('來源預設值不冒充確認，衝突差異包含舊來源與第三題',()=>{const a=demoCard(),b=structuredClone(a);assert.equal(stepState(emptyCard(),null).source.state,'optional');a.candidates[1].workaround='群組';a.source='舊來源';assert.deepEqual(cardDifferences(a,b).map(x=>x.label),['痛點 2：目前處理方法','原來源說明']);});

test('只有填答模式不同不算答案衝突，也不使已提交答案變未提交',()=>{const cloud=demoCard(),local=structuredClone(cloud);local.mode='challenge';assert.equal(sameAnswers(local,cloud),true);assert.equal(stepState(local,{card:cloud,status:'submitted'}).submit.state,'submitted');local.candidates[0].job+='改變';assert.equal(sameAnswers(local,cloud),false);});

test('每個實際出現的狀態都有專屬符號與文字，不依賴顏色',()=>{
 const produced=new Set(),empty=emptyCard(),demo=demoCard();
 const collect=(data)=>{for(const s of Object.values(data))produced.add(s.state);};
 collect(stepState(empty,null));
 collect(stepState(demo,null));
 collect(stepState(demo,null,{skipped:true}));
 collect(stepState(demo,null,{ai:true}));
 collect(stepState(demo,{card:structuredClone(demo),status:'submitted'}));
 for(const state of produced)assert.ok(stateLabels[state],'缺少狀態標籤：'+state);
 for(const key of Object.keys(stateLabels))assert.ok(produced.has(key),'標籤沒有對應狀態：'+key);
 const labels=Object.values(stateLabels);
 assert.equal(new Set(labels).size,labels.length,'狀態標籤不可重複');
 for(const label of labels)assert.match(label,/^[^\p{L}\p{N}\s]/u,'標籤需以符號開頭：'+label);
});

// 空卡的學生需要的是一條路，不是「繼續下一步」。
// 門檻 24 與 week2.js 的 STUCK_THRESHOLD 一致；邊界就是學生自己寫了四欄還是五欄。
test('卡住門檻的邊界：自己填四欄仍算卡住，填五欄就不算',()=>{
 const STUCK=24;
 const missingTotal=card=>steps.slice(0,4)
  .reduce((n,[key])=>n+stepState(card,null)[key].missing.length,0);
 assert.equal(missingTotal(emptyCard()),28,'全空卡的缺項總數若改變，門檻要跟著重算');
 assert.equal(missingTotal(demoCard()),0,'完整卡不該有缺項');
 const fill=n=>{const c=emptyCard();
  ['people','context','job','problem','frequency'].slice(0,n).forEach(k=>{c.candidates[0][k]='已填';});
  return c;};
 assert.ok(missingTotal(fill(4))>=STUCK,`填四欄應仍算卡住，實得 ${missingTotal(fill(4))}`);
 assert.ok(missingTotal(fill(5))<STUCK,`填五欄不該算卡住，實得 ${missingTotal(fill(5))}`);
 assert.ok(missingTotal(demoCard())<STUCK);
});
