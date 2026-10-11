import test from 'node:test';import assert from 'node:assert/strict';
import {emptyRecord,normalizeRecord,checkRecord,week3Completion,doneCount} from '../week3-core.mjs';
const full=()=>{const r=emptyRecord();r.interviews.forEach((it,i)=>{it.who=`通勤同學 ${'ABC'[i]}`;it.when_where='10/14 下課後走廊';it.quotes='「上禮拜三我排到快上課，直接不吃了。」';it.cost='等了 20 分鐘';it.fits='yes';});r.judgment='keep';r.statement='午休只有五十分鐘的通勤同學，買餐要等二十分鐘，常常直接不吃。';return r;};
test('normalizeRecord：缺欄位補空、多餘欄位丟掉、非法選項清空、長度截斷',()=>{
 const r=normalizeRecord({interviews:[{who:' A ',quotes:'x'.repeat(3000),fits:'maybe',hack:1}],judgment:'nuke',statement:'  s  '});
 assert.equal(r.interviews.length,3);assert.equal(r.interviews[0].who,'A');assert.equal(r.interviews[0].quotes.length,2000);assert.equal(r.interviews[0].fits,'');assert.equal('hack' in r.interviews[0],false);assert.equal(r.judgment,'');assert.equal(r.statement,'s');
 assert.deepEqual(normalizeRecord(null),emptyRecord());
});
test('checkRecord：三次都要有代稱／時地／原話與是否成立，還要判斷與陳述',()=>{
 const r=emptyRecord();const c=checkRecord(r);assert.equal(c.ok,false);assert.equal(c.errors.length,5);
 const ok=checkRecord(full());assert.equal(ok.ok,true,ok.errors.join(';'));
 const half=full();half.interviews[2].fits='';assert.match(checkRecord(half).errors.join(''),/訪談 3：請選/);
});
test('checkRecord：原話裡有電話／學號／Email 就擋；沒括號、沒代價只是提醒',()=>{
 const r=full();r.interviews[1].quotes='「打 0912345678 找我」';assert.match(checkRecord(r).errors.join(''),/姓名、電話/);
 const r2=full();r2.interviews[0].who='A113270021 同學';assert.match(checkRecord(r2).errors.join(''),/姓名、電話/);
 const r3=full();r3.interviews[0].quotes='上禮拜三我排到快上課直接不吃了';r3.interviews[0].cost='';const c=checkRecord(r3);assert.equal(c.ok,true);assert.equal(c.warnings.length,2);
});
test('week3Completion：0 還沒交 → 1 交了 → 2 三次都記了 → 3 老師 OK；下一步只有一句',()=>{
 const r=emptyRecord();let c=week3Completion(r,null);assert.equal(c.level,0);assert.match(c.next,/還差 3 次/);
 const one=emptyRecord();Object.assign(one.interviews[0],{who:'A',when_where:'x',quotes:'「六個字以上」'});assert.equal(doneCount(one),1);assert.match(week3Completion(one,null).next,/還差 2 次/);
 c=week3Completion(full(),{status:'draft',submitted_at:null});assert.equal(c.level,0);assert.match(c.next,/正式提交/);
 c=week3Completion(full(),{status:'draft',submitted_at:'2026-10-14'});assert.equal(c.level,2);
 const nojudge=full();nojudge.judgment='';c=week3Completion(nojudge,{status:'submitted'});assert.equal(c.level,1);assert.match(c.next,/選一個判斷/);
 c=week3Completion(full(),{status:'submitted',review_status:'approved'});assert.equal(c.level,3);
});
