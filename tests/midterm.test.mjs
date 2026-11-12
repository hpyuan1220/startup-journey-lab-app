import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseScore,formatScore,completion,RUBRIC,scoreTotal,C_MAX} from '../teacher-midterm.js';
import {normalizeWeek4} from '../week4-core.mjs';
import {normalizeWeek5} from '../week5-core.mjs';
test('期中評分：分數存在 week 7 備註的格式可來回轉；舊的純數字當上台分數；不合法的忽略',()=>{
 assert.equal(RUBRIC.length,7);
 const s=parseScore('MT2|p=1,0|c=42');assert.deepEqual(s,{a:Array(7).fill(null),p:[true,false],c:42});
 assert.equal(formatScore(s),'MT2|p=1,0|c=42');
 assert.equal(C_MAX,50);assert.equal(parseScore('MT2|p=0,1|c=51').c,null,'超過 50 不算');
 assert.deepEqual(parseScore('MT1|a=10,5,,0,5,10,5|c=18'),{a:[10,5,null,0,5,10,5],p:[false,false],c:18},'舊格式還能讀');
 assert.deepEqual(parseScore('85'),{a:Array(7).fill(null),p:[false,false],c:null},'舊的純數字 85 超過 20，不算');
 assert.deepEqual(parseScore('17').c,17);
 assert.deepEqual(parseScore(''),{a:Array(7).fill(null),p:[false,false],c:null});
 assert.equal(scoreTotal({total:10},{p:[true,true],c:50}),100);assert.equal(scoreTotal({total:7},{p:[true,false],c:30}),61);assert.equal(scoreTotal({total:0},{p:[false,false],c:null}),0);
});
test('期中評分：B 完成度 Week 4 五項＋Week 5 五項',()=>{
 const d4=normalizeWeek4({industry:{card:1},card1:{text:'a'},card2:{text:'b'},card3:{opps:['x','y','z']}});
 const st4={card1:'t',card2:'t',card3:'t',q1:'t',q2:'t'};
 const sc={pay:{score:2,evidence:'e'},freq:{score:1,evidence:'e'},now:{score:1,evidence:'e'},unsolved:{score:1,evidence:'e'},entry:{score:1,evidence:'e'}};
 const d5=normalizeWeek5({opps:['甲','',''],scores:{A:sc},choice:{key:'A'},rebuttal:{text:'拒絕 1：貴\n我的回應 1：先免費'},page:['1','2','3','4','5','6']});
 assert.equal(completion(d4,st4,d5,{q1:'t',q2:'t'}).total,10);
 assert.equal(completion(d4,{card1:'t'},null,null).total,2,'產業線＋卡 1');
 assert.equal(completion(null,null,null,null).total,0);
});
