import {test} from 'node:test';import assert from 'node:assert/strict';
import {assess,completion,questionIndex,chips,ITEMS} from '../week2-quality.mjs';
import {emptyCard,triageFields,depthFields} from '../week2-core.mjs';
const cand=(o={})=>({people:'',context:'',job:'',problem:'',frequency:'',cost:'',workaround:'',acceptance:'',evidence:'',assumption:'',...o});
const strong=()=>({...emptyCard(),candidates:[cand({people:'剛入職不到一個月、沒有業務經驗的新進保險業務',context:'星期二中午 12 點，四號公園，準備第一次街頭陌生開發',job:'在開口前判斷誰比較不會立刻拒絕',problem:'站了 30 分鐘沒有人敢開口對第一位路人說話',frequency:'每週 2 次',cost:'時間與試錯成本，20 位路人 18 位立刻拒絕',workaround:'亂槍打鳥',acceptance:'效率太低',evidence:'下午實際嘗試向 20 位路人遞名片，18 位擺手拒絕',assumption:'若以生活消費調查開場，停下來的機率會提高'}),cand({people:'另一題',context:'x',job:'y',problem:'z',frequency:'w'})],selected:0,statement:'在街頭陌生開發情境中，新進保險業務想要精準鎖定願意交談的對象，但單憑外表無法分辨',reason:'痛點1解決了也能解決痛點2',interviewees:['新人同事A，早會後','尚未入職的受訓者，早會後','直屬主管，早會後'],questions:['上次陌生開發時發生什麼？','那次你怎麼處理？']});
const weak=()=>({...emptyCard(),candidates:[cand({people:'我',context:'我，騎車路上',job:'知道前方路況',problem:'飲料品項太多不知道喝什麼',frequency:'基本每天',cost:'時間',workaround:'提早查菜單',acceptance:'現場沒辦法顯示',evidence:'品項確實繁多',assumption:'口味重複'}),cand({people:'b'})],selected:0,statement:'我想要知道路況但飲料太多',reason:'等等上班會遇到',interviewees:['陳同學','呂同學','老師'],questions:['上次？','怎麼決定？']});

test('完整的卡：8 項接近滿分，三個關卡過關', () => {
 const a=assess(strong());
 assert.equal(a.items.length,8);
 assert.ok(a.total>=13,'總分 '+a.total+'：'+JSON.stringify(a.items.map(x=>[x.key,x.score,x.reason])));
 for(const k of ['people','cost','evidence'])assert.equal(a.items.find(x=>x.key===k).score,2,k);
});
test('「人」是「我」、證據是推論：對應項目 0 分，並說明怎麼補', () => {
 const a=assess(weak());
 const people=a.items.find(x=>x.key==='people');
 assert.equal(people.score,0);assert.match(people.reason,/太籠統/);assert.match(people.fix,/哪種人/);
 assert.ok(a.items.find(x=>x.key==='evidence').score<=1);
 assert.ok(a.items.find(x=>x.key==='cost').score<=1,'「時間」兩個字沒有數字');
});
test('問題裡藏解法：「是問題不是解法」0 分並指出那個字', () => {
 const c=strong();c.candidates[0].job='只要看好行程後能自動一鍵幫我購票';
 const s=assess(c).items.find(x=>x.key==='solution');
 assert.equal(s.score,0);assert.match(s.reason,/一鍵/);assert.equal(s.field.key,'job');
});
test('三階完成度：沒交 0、交了但關卡沒過 1、關卡過 2、老師確認 3', () => {
 assert.equal(completion(strong(),null).level,0);
 assert.equal(completion(weak(),{status:'submitted',review_status:'pending'}).level,1);
 const c2=completion(strong(),{status:'submitted',review_status:'pending'});
 assert.equal(c2.level,2);assert.match(c2.next,/訪談回來後|等老師確認/);
 assert.equal(completion(strong(),{status:'submitted',review_status:'approved'}).level,3);
 const c1=completion(weak(),{status:'submitted',review_status:'pending'});
 assert.match(c1.next,/差 \d 件事/);assert.match(c1.next,/這是誰的痛/);
});
test('懶人版的「下一步」永遠只講一件事', () => {
 const c1=completion(weak(),{status:'submitted',review_status:'pending'});
 assert.ok(c1.todo.length>=1);assert.equal((c1.next.match(/——/g)||[]).length,1,'只給一個 fix');
});
test('questionIndex 和 missingTargets 用同一套序號', () => {
 const c=strong();const n=c.candidates.length,base=n*triageFields.length;
 assert.equal(questionIndex(c,{cand:0,key:'people'}),0);
 assert.equal(questionIndex(c,{cand:1,key:'frequency'}),triageFields.length+4);
 assert.equal(questionIndex(c,{depth:'cost'}),base+3);
 assert.equal(questionIndex(c,{depth:'evidence'}),base+3+depthFields.findIndex(([k])=>k==='evidence'));
 assert.equal(questionIndex(c,{key:'statement'}),base+2);
 assert.equal(questionIndex(c,{interviewee:1}),base+3+depthFields.length+1);
 assert.equal(questionIndex(c,{question:0}),base+3+depthFields.length+3);
});
test('可點選項：依題目給三個「誰」，代價給填空模板，解法給一鍵刪除', () => {
 const c=weak();c.candidates[0].context='週三中午學校餐廳排隊';
 const who=chips(ITEMS[0],c);assert.equal(who.length,3);assert.ok(who.every(x=>x.mode==='set'&&x.text.length>6));
 const cost=chips(ITEMS[1],c);assert.ok(cost.some(x=>/分鐘/.test(x.text)&&x.mode==='append'));
 const sol=chips(ITEMS.find(x=>x.key==='solution'),c);assert.equal(sol[0].mode,'strip');
});

test('提交過之後改成草稿：第一格不熄，但提醒要重新提交', () => {
 const c=completion(strong(),{status:'draft',submitted_at:'2026-10-02T05:00:00Z',review_status:'pending'});
 assert.equal(c.level,2);assert.ok(c.unsentEdits);assert.match(c.next,/重新提交/);
 const c0=completion(strong(),{status:'draft',submitted_at:null,review_status:'pending'});
 assert.equal(c0.level,0);
});

// 2026-10-12：解法判斷改版（老師審 36 張卡後發現的誤判與漏判）
test('「陌生開發」是業務用語，不算解法；「社交平台上找不到代購」是在描述現況，也不算', () => {
 const c=strong();c.candidates[0].context='星期二中午 12 點，四號公園，準備第一次街頭陌生開發';c.statement='在街頭陌生開發時，新進業務不知道誰願意停下來';
 assert.equal(assess(c).items.find(x=>x.key==='solution').score,2);
 const d=strong();d.candidates[0].problem='在社交平台上很難找到合適的代購，資訊分散';
 assert.equal(assess(d).items.find(x=>x.key==='solution').score,2);
});
test('整張卡在設計「場所」或「做一個 __」：0 分並指出那個字', () => {
 const c=strong();c.candidates[0].job='發想抽煙場所這件事，能不能同時有吸引人前往的服務';
 const s=assess(c).items.find(x=>x.key==='solution');
 assert.equal(s.score,0);assert.match(s.reason,/場所/);assert.equal(s.field.key,'job');
 const d=strong();d.candidates[0].problem='想做一個能幫我自動排班的東西';
 assert.equal(assess(d).items.find(x=>x.key==='solution').score,0);
});
test('訪談題是「如果有 __ 你會不會」：0 分並指到那一題', () => {
 const c=strong();c.questions=['如果有一鍵購買，會提高你出遊的意願嗎？','上次你怎麼買票的？'];
 const s=assess(c).items.find(x=>x.key==='solution');
 assert.equal(s.score,0);assert.match(s.reason,/假設題/);assert.equal(s.field.question,0);
});
test('只有假設在想解法 1 分；假設＋選題理由都在想解法 0 分', () => {
 const c=strong();c.candidates[0].assumption='如果有一個工具可以依預算縮小選擇，大家會更快決定';
 assert.equal(assess(c).items.find(x=>x.key==='solution').score,1);
 c.reason='因為我想做一個 app 解決這件事';
 const s=assess(c).items.find(x=>x.key==='solution');
 assert.equal(s.score,0);assert.match(s.reason,/假設、選題理由/);
});
