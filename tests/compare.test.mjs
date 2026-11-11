import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness} from './support/week2-harness.mjs';
import {normalizeCompare,totals,topCompany,pickOk,compareProgress,buildFramework,COMPARE_QUESTIONS,MAX_COMPARE} from '../compare-core.mjs';

test('compare-core：normalize 只收允許的公司、分數 0/1/2、反方三格、選定；totals／top／pickOk／progress',()=>{
 const d=normalizeCompare({scores:{OWNER:{q1:{score:'2',evidence:'15,000 家'},q2:{score:9},q3:{score:1},q4:{score:2},q5:{score:0}},sage:{q1:{score:2}},nope:{q1:{score:2}}},counters:{big:'Shopify 做客服 AI',chosen:'big',tech:'x'.repeat(400)},pick:{company:'Owner',reason:'短'}},['owner','sage','arcade']);
 assert.deepEqual(Object.keys(d.scores),['owner','sage']);assert.equal(d.scores.owner.q1.score,2);assert.equal(d.scores.owner.q2.score,null);assert.equal(d.counters.tech.length,300);assert.equal(d.pick.company,'owner');
 const t=totals(d);assert.equal(t.owner.sum,5);assert.equal(t.owner.complete,false);assert.equal(t.sage.n,1);
 assert.equal(topCompany(d),'');// 沒一家打滿五格
 for(const q of COMPARE_QUESTIONS)d.scores.owner[q.key]={score:2,evidence:'e'};d.scores.sage={};for(const q of COMPARE_QUESTIONS)d.scores.sage[q.key]={score:1,evidence:''};
 assert.equal(topCompany(d),'owner');assert.equal(totals(d).owner.sum,MAX_COMPARE);
 assert.equal(pickOk(d),true);d.pick.company='sage';assert.equal(pickOk(d),false);d.pick.reason='我們組有人家裡做長照，接觸得到真人可以訪談';assert.equal(pickOk(d),true);
 const p=compareProgress(d,['owner','sage','arcade']);assert.equal(p.scored,2);assert.ok(p.missing.some(m=>/沒打完/.test(m)));assert.ok(p.missing.some(m=>/反方三格/.test(m)));
});

test('compare-core：buildFramework 六頁、講稿按人分、落選那兩家各一行',()=>{
 const d=normalizeCompare({scores:{owner:{q1:{score:2,evidence:'1,500 家'},q2:{score:2,evidence:'249/499'},q3:{score:2,evidence:'外送抽成漲'},q4:{score:1,evidence:'平台推自有網站'},q5:{score:0,evidence:''}},sage:{q1:{score:1,evidence:''},q2:{score:1,evidence:'估 4 萬'},q3:{score:2,evidence:'缺工'},q4:{score:2,evidence:'大廠不做'},q5:{score:0,evidence:''}},arcade:{q1:{score:1,evidence:''},q2:{score:2,evidence:'官網'},q3:{score:2,evidence:'MCP'},q4:{score:1,evidence:'Okta'},q5:{score:0,evidence:''}}},counters:{big:'Shopify',customer:'旺季',tech:'模型降價',chosen:'big'},pick:{company:'owner',reason:''}},['owner','sage','arcade']);
 const members=[{student_id:'A',reps:{2:'owner'}},{student_id:'B',reps:{1:'arcade'}},{student_id:'C',reps:{3:'sage'}}];
 const f=buildFramework(d,members,{A:'小安',B:'小北',C:'小西'},{A:{owner:{why:'接電話的錢比請人便宜',sources:['https://x','https://y'],url:'https://owner.com',est:'',estOk:false,argue:'業務說不抽成但有實施費'}}},cid=>({name:'Owner',tagline:'不抽成的餐廳網站',card:[['誰付錢','餐廳老闆'],['怎麼收費','月費 249/499'],['以前誰在做','外送平台'],['為什麼是現在','疫情後'],['數字','D 輪 2.4 億'],['風險','平台自有網站'],['台灣同層','〔待查〕']]}));
 assert.equal(f.pages.length,6);assert.equal(f.owner,'A');assert.match(f.pages[0].body,/接電話的錢比請人便宜/);assert.match(f.pages[3].body,/Sage（小西）/);assert.match(f.pages[3].body,/Arcade（小北）/);assert.match(f.pages[4].body,/大廠那一刀/);
 assert.match(f.scripts.A,/第 1 頁/);assert.match(f.scripts.B,/第 4 頁/);assert.match(f.scripts.C,/第 4 頁/);assert.equal(f.pdf.length,3);
 assert.equal(buildFramework(normalizeCompare({},[]),members,{},{},null),null);
});

test('Edge team_compare_save：沒組 409→有組→存比較表（只留推薦的公司）→team_load 帶 compare 與 cards；老師 teacher_load 的 teams 有 compare',async()=>{
 const h=await harness();const a=await h.student('A113270097'),b=await h.student('A113270098');
 assert.equal((await h.call({action:'team_compare_save',token:a,compare:{}})).status,409);
 const t=await h.call({action:'team_create',token:a,name:'比較隊'});await h.call({action:'team_join',token:b,code:t.body.team.code});
 await h.call({action:'team_claim',token:a,directions:[2]});await h.call({action:'team_claim',token:b,directions:[1,3]});
 await h.call({action:'islands_save',token:a,data:{boxes:{owner:{opened:true,passed:3,scores:[10,10,10],url:'https://owner.com',est:'',estOk:null}},cards:{owner:{sources:['https://a','https://b'],why:'便宜'}},dir:2,candidates:['owner']}});
 await h.call({action:'islands_save',token:b,data:{boxes:{arcade:{opened:true,passed:3,scores:[10,7,5]},sage:{opened:true,passed:3,scores:[10,10,10],est:'4 萬–8 萬',estOk:true}},dir:1,candidates:[]}});
 await h.call({action:'team_rep',token:a,direction:2,company:'owner'});await h.call({action:'team_rep',token:b,direction:1,company:'arcade'});await h.call({action:'team_rep',token:b,direction:3,company:'sage'});
 const r=await h.call({action:'team_compare_save',token:b,compare:{scores:{owner:{q1:{score:2,evidence:'1,500 家'}},happyrobot:{q1:{score:2}}},pick:{company:'owner',reason:''},counters:{big:'Shopify',chosen:'big'}}});
 assert.equal(r.status,200);assert.deepEqual(Object.keys(r.body.team.compare.scores),['owner']);assert.equal(r.body.team.compare.pick.company,'owner');assert.ok(r.body.team.compare.pick.at);
 assert.equal(r.body.cards.A113270097.owner.why,'便宜');assert.equal(r.body.cards.A113270098.sage.est,'4 萬–8 萬');assert.equal(r.body.cards.A113270098.arcade.opened,true);
 const tl=await h.call({action:'teacher_load'},'teacher-token');assert.equal(tl.body.teams[0].compare.pick.company,'owner');
 // 一般成員 a 也能存（覆蓋）
 const r2=await h.call({action:'team_compare_save',token:a,compare:{scores:{sage:{q5:{score:1,evidence:'台灣有'}}},pick:{company:'sage',reason:'組裡有人家裡做長照可以訪談真人'}}});assert.equal(r2.body.team.compare.pick.company,'sage');
});
