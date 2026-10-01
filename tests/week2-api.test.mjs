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
