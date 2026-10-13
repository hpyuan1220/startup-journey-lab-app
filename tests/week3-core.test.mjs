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
import {DEFAULT_SURVEY_TOPICS,normalizeTopics,normalizeSurvey,checkSurvey,surveySummary} from '../week3-core.mjs';
test('普查：預設題目沒有姓名學號；normalizeTopics 去重、截短、空標題丟掉',()=>{
 assert.equal(DEFAULT_SURVEY_TOPICS.length,22);
 for(const t of DEFAULT_SURVEY_TOPICS)assert.doesNotMatch(t.label+t.hint,/[A-Z]\d{9}|同學 ?[A-Z]/);
 const t=normalizeTopics([{topic_id:1,label:' 午餐 ',hint:'x'},{topic_id:1,label:'重複'},{topic_id:2,label:''},{topic_id:'3',label:'y'.repeat(80),active:false},{topic_id:100,label:'超過'}]);
 assert.deepEqual(t.map(x=>[x.topic_id,x.label.length,x.active]),[[1,2,true],[3,40,false]]);
});
test('普查：回答只留題目表裡的題、沒遇過不留細節；勾願意要有代稱；代稱不能是學號電話',()=>{
 const topics=DEFAULT_SURVEY_TOPICS.slice(0,3);
 const s=normalizeSurvey({alias:' 小魚 ',answers:[{topic_id:1,experienced:true,last_time:'上週',cost:'3 天',workaround:'硬約',willing:true},{topic_id:2,experienced:false,last_time:'不該留',willing:true},{topic_id:9,experienced:true},{topic_id:1,experienced:false}]},topics);
 assert.equal(s.alias,'小魚');assert.deepEqual(s.answers.map(a=>[a.topic_id,a.experienced,a.last_time,a.willing]),[[1,true,'上週',true],[2,false,'',false]]);
 assert.equal(checkSurvey(s).ok,true);
 const noAlias=normalizeSurvey({answers:[{topic_id:1,experienced:true,willing:true}]},topics);assert.match(checkSurvey(noAlias).errors[0],/代稱/);
 const bad=normalizeSurvey({alias:'0912345678',answers:[{topic_id:1,experienced:true}]},topics);assert.match(checkSurvey(bad).errors[0],/學號、電話/);
});
test('普查：彙總每題幾人遇過、願意的代稱；關掉的題不出現',()=>{
 const topics=[{topic_id:1,label:'a',hint:'',active:true,sort:2},{topic_id:2,label:'b',hint:'',active:false,sort:1},{topic_id:3,label:'c',hint:'',active:true,sort:1}];
 const rs=[{topic_id:1,student_id:'x',experienced:true,willing:true,alias:'甲'},{topic_id:1,student_id:'y',experienced:true,willing:false,alias:'乙'},{topic_id:1,student_id:'z',experienced:false},{topic_id:2,student_id:'x',experienced:true,willing:true,alias:'甲'}];
 const sum=surveySummary(topics,rs);assert.deepEqual(sum.map(s=>[s.topic_id,s.answered,s.experienced,s.willing]),[[3,0,0,[]],[1,3,2,['甲']]]);
});

// 2026-10-13 課前預習：三題的選擇＋第一個問題存在 record.preclass
import {normalizePreclass,preclassDone,PRECLASS_QUIZ} from '../week3-core.mjs';
test('preclass：正規化只留 a–d 的選擇、問題截到 300 字；沒有 preclass 的舊卡也有空值',()=>{
 const p=normalizePreclass({question:'  上次你排隊最久那次，後來怎麼辦？ ',answers:['a','zz','d',3],done_at:'2026-10-13T01:00:00Z'});
 assert.deepEqual(p.answers,['a','','d']);assert.equal(p.question,'上次你排隊最久那次，後來怎麼辦？');assert.equal(p.done_at,'2026-10-13T01:00:00Z');
 const r=normalizeRecord({interviews:[]});assert.deepEqual(r.preclass,{question:'',answers:['','',''],done_at:''});
 assert.equal(preclassDone(r),false);r.preclass.question='上次發生什麼？';assert.equal(preclassDone(r),true);
});
test('preclass：三題資料 Week 2、3 各三題，每題正好一個正解且在四個選項內',()=>{
 for(const w of [2,3]){const q=PRECLASS_QUIZ[w];assert.equal(q.items.length,3);const keys=q.options.map(([k])=>k);for(const it of q.items){assert.ok(keys.includes(it.answer),w+':'+it.q);assert.ok(it.why.length>10);}}
});
test('preclass：提交規則不管課前預習（沒寫也能提交，寫了也不會多擋）',()=>{
 const r=normalizeRecord({interviews:[]});r.preclass.question='';const c1=checkRecord(r);
 r.preclass.question='上次你怎麼找到組的？';const c2=checkRecord(r);
 assert.deepEqual(c1.errors,c2.errors);
});
