import {test} from 'node:test';import assert from 'node:assert/strict';
import {harness,demoCard} from './support/week2-harness.mjs';
test('真實 handler：未交 Week1 阻擋，補交立即開放；偽造身分無效',async()=>{const h=await harness(),token=await h.student('A',false);assert.equal((await h.call({action:'save',token,status:'submitted',card:demoCard()})).status,409);h.tables.week1_submissions[0].status='submitted';const r=await h.call({action:'save',token,status:'submitted',card:demoCard(),student_id:'OTHER',class_id:'class-b'});assert.equal(r.status,200);assert.equal(r.body.row.student_id,'A');assert.equal(r.body.row.class_id,'class-a');});
test('真實 handler：草稿恢復、修改衝突與版本讀取',async()=>{const h=await harness(),token=await h.student();const a=await h.call({action:'save',token,status:'draft',card:demoCard()});assert.equal(a.status,200);assert.equal((await h.call({action:'save',token,status:'submitted',version:0,card:demoCard()})).status,409);const b=await h.call({action:'save',token,status:'submitted',version:1,card:demoCard()});assert.equal(b.body.row.version,2);assert.equal((await h.call({action:'load',token})).body.versions.length,2);});
test('真實 handler：同內容快取、模式限額，核心提交不受 AI 影響',async()=>{const h=await harness(),token=await h.student();let card=demoCard();card.mode='standard';const send=()=>h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true});assert.equal((await send()).status,200);assert.equal((await send()).body.cached,true);assert.equal(h.modelCalls,1);card.reason+='補充訪談對象';assert.equal((await send()).status,200);card.reason+='再補充';assert.equal((await send()).status,429);assert.equal((await h.call({action:'save',token,status:'submitted',card})).status,200);});
test('真實 handler：AI 故障仍能保存與提交',async()=>{const h=await harness({modelFails:true}),token=await h.student(),card=demoCard();assert.equal((await h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true})).status,502);assert.equal((await h.call({action:'save',token,status:'submitted',card})).status,200);});
test('真實 handler：教师班級授權、JWT失效、學生不能送教師指令',async()=>{const h=await harness();await h.student('A');await h.student('B',true,'class-b');assert.equal((await h.call({action:'teacher_load'},'expired')).status,401);const a=await h.call({action:'teacher_load'},'teacher-token');assert.equal(a.body.classes.length,1);assert.equal(a.body.week1.length,1);assert.equal((await h.call({action:'teacher_settings',class_id:'class-b',limit:3},'teacher-token')).status,403);});
test('真實 handler：送模型不含姓名學號受訪者，個資標記阻擋',async()=>{const h=await harness(),token=await h.student('A123'),card=demoCard();card.reason='測試同學 A123 的觀察';card.interviewees[0]='不得傳到模型的資料';await h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true});const sent=JSON.stringify(h.inputs);for(const id of ['測試同學','A123','不得傳到模型的資料'])assert.ok(!sent.includes(id));card.reason='姓名：王先生';assert.equal((await h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true})).status,422);});
test('50 個模擬學生同時存讀不混用資料（記憶體 adapter，非 Supabase 壓測）',async()=>{const h=await harness();const tokens=await Promise.all(Array.from({length:50},(_,i)=>h.student('TEST-'+i)));const saved=await Promise.all(tokens.map(token=>h.call({action:'save',token,status:'submitted',card:demoCard()})));assert.ok(saved.every(r=>r.status===200));const loaded=await Promise.all(tokens.map(token=>h.call({action:'load',token})));assert.equal(new Set(loaded.map(r=>r.body.row.student_id)).size,50);});

test('痛點檢查不顯示模型誤給的替代選題；探索仍保留方向',async()=>{const h=await harness({directions:['待驗證的生活困擾']}),token=await h.student(),card=demoCard();const r=await h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true});assert.deepEqual(r.body.feedback.directions,[]);const e=await h.call({action:'ai',token,kind:'explore',card,privacy_confirmed:true});assert.equal(e.body.feedback.directions.length,1);});

test('AI 次數用完時：訊息不能說「本週」，要說剩 0 次並給老師這條路', async () => {
 const h=await harness(),token=await h.student();const card=demoCard();card.mode='standard'; // standard = 2 次
 const send=c=>h.call({action:'ai',token,kind:'review',card:c,privacy_confirmed:true});
 const a=await send(card);assert.equal(a.status,200);
 assert.equal(a.body.limit,2);assert.equal(a.body.remaining,1,'第一次用完要剩 1 次');
 card.reason+='補充一';const b=await send(card);assert.equal(b.status,200);
 assert.equal(b.body.remaining,0,'第二次用完要剩 0 次');
 card.reason+='補充二';const c=await send(card);
 assert.equal(c.status,429);
 assert.ok(!/本週/.test(c.body.error),'計數沒有時間條件，不可以告訴學生每週會恢復：'+c.body.error);
 assert.match(c.body.error,/已經用完/);
 assert.match(c.body.error,/不會自動恢復/);
 assert.match(c.body.error,/老師/,'用完之後要給學生一條還能走的路');
 assert.match(c.body.error,/提交/,'要講清楚沒有 AI 也能提交');
 assert.equal(c.body.remaining,0);
});

test('兩個請求同時搶名額：不可以謊稱已達上限', async () => {
 const h=await harness({reserveNull:true}),token=await h.student();
 const r=await h.call({action:'ai',token,kind:'review',card:demoCard(),privacy_confirmed:true});
 assert.equal(r.status,429);
 assert.ok(!/用完/.test(r.body.error),'一次都還沒用，不能說用完了：'+r.body.error);
 assert.match(r.body.error,/同時送出/);
 assert.match(r.body.error,/不會算你的次數/);
 assert.ok(r.body.remaining>0,'剩餘次數要照實回報');
});

test('同一份內容還在處理中：要說會等多久，且不多算次數', async () => {
 const h=await harness(),token=await h.student();const card=demoCard();
 await h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true});
 h.tables.week2_ai_requests[0].state='pending';delete h.tables.week2_ai_requests[0].feedback;
 const r=await h.call({action:'ai',token,kind:'review',card,privacy_confirmed:true});
 assert.equal(r.status,409);
 assert.match(r.body.error,/還在處理/);
 assert.match(r.body.error,/不會多算次數/);
 assert.ok(!/請稍後查看/.test(r.body.error),'不要只叫學生「稍後查看」卻不說看哪裡');
});

test('老師端名單：加人會正規化學號、改名用同一個動作；teacher_load 帶回名單；別班 403', async () => {
 const h=await harness();
 const bad=await h.call({action:'teacher_roster',class_id:'class-a',op:'add',student_id:'a113 270021',student_name:'王'},'teacher-token');
 assert.equal(bad.status,422);
 const a=await h.call({action:'teacher_roster',class_id:'class-a',op:'add',student_id:' a113270021 ',student_name:'王小明'},'teacher-token');
 assert.equal(a.status,200);assert.deepEqual(a.body.roster.map(r=>[r.student_id,r.student_name]),[['A113270021','王小明']]);
 const b=await h.call({action:'teacher_roster',class_id:'class-a',op:'add',student_id:'A113270021',student_name:'王大明'},'teacher-token');
 assert.equal(b.body.roster.length,1);assert.equal(b.body.roster[0].student_name,'王大明');
 assert.equal((await h.call({action:'teacher_roster',class_id:'class-b',op:'add',student_id:'A113270021'},'teacher-token')).status,403);
 assert.equal((await h.call({action:'teacher_roster',class_id:'class-a',op:'add',student_id:'A113270021'},'expired')).status,401);
 const load=await h.call({action:'teacher_load'},'teacher-token');
 assert.deepEqual(load.body.roster.map(r=>r.student_id),['A113270021']);
});
test('老師端名單：移除只能移除還沒有作業資料的人', async () => {
 const h=await harness();await h.student('A113270021');
 await h.call({action:'teacher_roster',class_id:'class-a',op:'add',student_id:'A113270021',student_name:'有作業'},'teacher-token');
 await h.call({action:'teacher_roster',class_id:'class-a',op:'add',student_id:'A113270099',student_name:'還沒來'},'teacher-token');
 const blocked=await h.call({action:'teacher_roster',class_id:'class-a',op:'remove',student_id:'A113270021'},'teacher-token');
 assert.equal(blocked.status,422);assert.match(blocked.body.error,/已經有作業資料/);
 const ok=await h.call({action:'teacher_roster',class_id:'class-a',op:'remove',student_id:'A113270099'},'teacher-token');
 assert.equal(ok.status,200);assert.deepEqual(ok.body.roster.map(r=>r.student_id),['A113270021']);
 assert.equal(h.tables.week1_submissions.length,1,'移除名單不會動到作業');
 assert.equal((await h.call({action:'teacher_roster',class_id:'class-a',op:'nuke',student_id:'A113270021'},'teacher-token')).status,400);
});

test('Week 3：載入帶 Week 2 摘要；沒有 Week 2 不能存；草稿可存、提交要通過檢查；版本衝突 409；teacher_load 帶 week3', async () => {
 const h=await harness(),token=await h.student('A113270021');
 const empty=await h.call({action:'week3_load',token});assert.equal(empty.status,200);assert.equal(empty.body.week2,null);assert.equal(empty.body.row,null);
 const rec={interviews:[{who:'通勤同學 A',when_where:'10/14 走廊',quotes:'「排到快上課就不吃了」',fits:'yes'}],judgment:'',learned:'',statement:''};
 assert.equal((await h.call({action:'week3_save',token,status:'draft',record:rec})).status,409,'沒有 Week 2 卡就不能存');
 await h.call({action:'save',token,status:'submitted',card:demoCard()});
 const load=await h.call({action:'week3_load',token});assert.equal(load.body.week2.status,'submitted');assert.equal(load.body.week2.card.interviewees.length,3);
 const d=await h.call({action:'week3_save',token,status:'draft',record:rec});assert.equal(d.status,200);assert.equal(d.body.row.version,1);assert.equal(d.body.row.record.interviews.length,3);
 const bad=await h.call({action:'week3_save',token,status:'submitted',version:1,record:rec});assert.equal(bad.status,422);assert.match(bad.body.error,/訪談 2/);
 const fullRec={interviews:[0,1,2].map(i=>({who:`通勤同學 ${'ABC'[i]}`,when_where:'10/14 走廊',quotes:'「排到快上課就不吃了」',cost:'20 分鐘',fits:'yes'})),judgment:'keep',learned:'',statement:'午休五十分鐘的通勤同學買餐要等二十分鐘，常常不吃。'};
 assert.equal((await h.call({action:'week3_save',token,status:'submitted',version:0,record:fullRec})).status,409,'版本不對要擋');
 const ok=await h.call({action:'week3_save',token,status:'submitted',version:1,record:fullRec});assert.equal(ok.status,200);assert.equal(ok.body.row.status,'submitted');assert.ok(ok.body.row.submitted_at);
 const t=await h.call({action:'teacher_load'},'teacher-token');assert.equal(t.body.week3.length,1);assert.equal(t.body.week3[0].student_id,'A113270021');
 assert.equal((await h.call({action:'week3_load',token:'not-a-real-token-xxxxxxxx'})).status,401);
});

test('普查：老師設題目（整份覆寫、沒送的關掉）；學生載入／作答／改答；彙總只給代稱；沒題目不能答；別班 403', async () => {
 const h=await harness(),token=await h.student('A113270021'),token2=await h.student('A113270022');
 assert.equal((await h.call({action:'survey_save',token,survey:{answers:[{topic_id:1,experienced:true}]}})).status,409,'老師還沒設題目');
 const t=await h.call({action:'teacher_survey_topics',class_id:'class-a',topics:[{topic_id:1,label:'午餐排隊',hint:'h'},{topic_id:2,label:'早八'},{topic_id:3,label:'穿搭'}]},'teacher-token');
 assert.equal(t.status,200);assert.equal(t.body.topics.length,3);
 assert.equal((await h.call({action:'teacher_survey_topics',class_id:'class-b',topics:[{topic_id:1,label:'x'}]},'teacher-token')).status,403);
 const l=await h.call({action:'survey_load',token});assert.equal(l.body.topics.length,3);assert.equal(l.body.answered,0);assert.deepEqual(l.body.mine,[]);
 const a=await h.call({action:'survey_save',token,survey:{alias:'座號 3',answers:[{topic_id:1,experienced:true,last_time:'上週三',cost:'20 分鐘',willing:true},{topic_id:2,experienced:false},{topic_id:3,experienced:true,willing:false}]}});
 assert.equal(a.status,200);assert.equal(a.body.answered,1);assert.deepEqual(a.body.summary.map(s=>[s.topic_id,s.experienced,s.willing]),[[1,1,['座號 3']],[2,0,[]],[3,1,[]]]);
 const b=await h.call({action:'survey_save',token:token2,survey:{alias:'小魚',answers:[{topic_id:1,experienced:true,willing:true},{topic_id:2,experienced:true,willing:true}]}});
 assert.deepEqual(b.body.summary.map(s=>[s.experienced,s.willing]),[[2,['座號 3','小魚']],[1,['小魚']],[1,[]]]);
 // 改答：同一人改成沒遇過，列數不變、彙總更新
 const c=await h.call({action:'survey_save',token,survey:{alias:'座號 3',answers:[{topic_id:1,experienced:false}]}});
 assert.equal(c.body.summary[0].experienced,1);assert.equal(h.tables.week3_survey_responses.length,5);
 // 老師關掉第 3 題：回答還在，學生看不到該題
 const t2=await h.call({action:'teacher_survey_topics',class_id:'class-a',topics:[{topic_id:1,label:'午餐排隊'},{topic_id:2,label:'早八'}]},'teacher-token');
 assert.equal(t2.body.topics.find(x=>x.topic_id===3).active,false);
 const l2=await h.call({action:'survey_load',token});assert.equal(l2.body.topics.length,2);
 const tl=await h.call({action:'teacher_load'},'teacher-token');assert.equal(tl.body.survey_topics.length,3);assert.equal(tl.body.survey_responses.length,5);
 assert.equal((await h.call({action:'survey_save',token,survey:{alias:'A113270021',answers:[{topic_id:1,experienced:true}]}})).status,422,'代稱不能是學號');
});
