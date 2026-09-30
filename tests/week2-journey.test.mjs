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
// 門檻 21 與 week2.js 的 STUCK_THRESHOLD 一致；邊界是學生自己寫了四欄還是五欄。
test('卡住門檻的邊界：自己填四欄仍算卡住，填五欄就不算',()=>{
 const STUCK=21;
 const missingTotal=card=>steps.slice(0,4)
  .reduce((n,[key])=>n+stepState(card,null)[key].missing.length,0);
 assert.equal(missingTotal(emptyCard()),25,'全空卡的缺項總數若改變，門檻要跟著重算');
 assert.equal(missingTotal(demoCard()),0,'完整卡不該有缺項');
 const fill=n=>{const c=emptyCard();
  ['people','context','job','problem','frequency'].slice(0,n).forEach(k=>{c.candidates[0][k]='已填';});
  return c;};
 assert.ok(missingTotal(fill(4))>=STUCK,`填四欄應仍算卡住，實得 ${missingTotal(fill(4))}`);
 assert.ok(missingTotal(fill(5))<STUCK,`填五欄不該算卡住，實得 ${missingTotal(fill(5))}`);
});

// 這次改動的重點：決定點從第 19 格移到第 11 格。
test('兩個候選只問篩選五欄，深入四欄只屬於選中的那一個',()=>{
 const c=emptyCard();
 const st=stepState(c,null);
 assert.equal(st['0'].missing.length,5,'痛點 1 應只問篩選五欄');
 assert.equal(st['1'].missing.length,5,'痛點 2 應只問篩選五欄');
 assert.equal(st.choice.missing.length,8,'選題三題＋深入五題');
 assert.ok(st.choice.missing.some(m=>/選中的痛點/.test(m)),'深入的缺項要標明是選中的那一題');
 // 決定點：走到「選題與深入」之前只需填 10 格
 assert.equal(st['0'].missing.length+st['1'].missing.length,10);
});

test('換選另一個候選，深入四欄跟著換人',()=>{
 const c=emptyCard();
 depthKeys().forEach(k=>{c.candidates[0][k]='第一個候選的深入答案';});
 assert.equal(stepState(c,null).choice.missing.filter(m=>/選中的痛點/.test(m)).length,0,
  '選中候選 1 時，它的深入四欄已填齊');
 c.selected=1;
 assert.equal(stepState(c,null).choice.missing.filter(m=>/選中的痛點/.test(m)).length,5,
  '改選候選 2 後，應改問候選 2 的深入四欄');
 assert.equal(c.candidates[0].cost,'第一個候選的深入答案','換選不該清掉原本的答案');
});

function depthKeys(){return ['cost','workaround','acceptance','evidence','assumption'];}

// 修改區原本五顆按鈕分屬兩層，其中兩顆和卡片上方的按鈕是同一個函式。
test('修改區不再有和卡片上方重複的按鈕',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.ok(!src.includes("button('儲存修改後的草稿'"),'儲存修改後的草稿與「儲存草稿」同為 saveWithAuto()');
 assert.ok(!src.includes("button('檢查修改後的完整度'"),'檢查修改後的完整度與「查看整張卡還缺什麼」同為 checks(true)');
});

// 學生可能已經在預覽的文字框裡改過字，再按一次草擬會把他改的內容沖掉。
test('草稿開著時「幫我草擬修改」要隱藏，套用或取消後放回來',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/draftButton\.hidden=true/,'草擬後要把按鈕藏起來');
 const restored=(src.match(/draftButton\.hidden=false/g)||[]).length;
 assert.ok(restored>=3,`套用、取消、復原三條路都要把按鈕放回來，目前只有 ${restored} 處`);
});

test('預覽有自己的容器，兩顆按鈕畫在框內',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 const css=await fs.readFile(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(src,/revisionPreview\.className='revision-preview'/);
 assert.match(css,/\.revision-preview\{/);
 // 兩顆按鈕的 parent 必須是 revisionPreview
 assert.match(src,/button\('確認套用已勾選欄位'[\s\S]*?\}\),revisionPreview\)/);
 assert.match(src,/button\('取消，保留原答案'[\s\S]*?,revisionPreview\)/);
});

// 套用之後的訊息原本寫著「請檢查並儲存草稿」，但那兩顆按鈕已因重複而移除，
// 學生得自己捲回卡片上方找。訊息叫他做的事，按鈕就要在旁邊。
test('套用與復原之後都有對應的儲存按鈕，訊息不指向不存在的按鈕',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/saveAfterApply=button\('儲存草稿到雲端'/,'這一區要有自己的儲存按鈕');
 assert.match(src,/saveAfterApply\.className='primary-action'/,'存檔是套用後最該做的事，要是主按鈕');
 // 套用後與復原後都要顯示；只有初始狀態隱藏
 const shown=(src.match(/saveAfterApply\.hidden=false/g)||[]).length;
 assert.equal(shown,2,`套用與復原兩條路都要顯示儲存按鈕，目前 ${shown} 處`);
 // 訊息不可以再提到已經移除的按鈕名稱
 // 只看實際指派給 revisionStatus 的訊息，不看註解
 const messages=(src.match(/revisionStatus\.textContent=[^;]+;/g)||[]).join('\n');
 assert.ok(!messages.includes('請檢查並儲存草稿'),'訊息仍指向已移除的按鈕');
 assert.ok(messages.includes('儲存草稿到雲端'),'訊息要指名這一區真的有的按鈕');
 assert.match(src,/下一步：按下面的「儲存草稿到雲端」/);
});

// 訪談題的建議是直接沿用 AI 的追問。學生上次套用過，再草擬一次就會產生一模一樣的
// 文字，而介面照樣把「原答案」和「建議修改」並排要他決定 —— 兩段字完全相同。
test('草稿標出哪些欄位其實沒有差異',async()=>{
 const {draftRevision}=await import('../week2-revision.mjs');
 const {demoCard}=await import('./support/week2-harness.mjs');
 const card=demoCard();
 const feedback={questions:[card.questions[0],'一個不一樣的追問']};
 const patches=draftRevision(card,feedback,['question0','question1']);
 const q0=patches.find(p=>p.key==='question0'),q1=patches.find(p=>p.key==='question1');
 assert.equal(q0.changed,false,'建議和現況相同時要標成沒有差異');
 assert.equal(q1.changed,true);
 assert.equal(q0.before,q0.after,'前提：這個案例的前後確實相同');
});

test('全部都沒有差異時不開預覽，直接說清楚',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/all\.filter\(p=>p\.changed\)/,'要濾掉沒有差異的欄位');
 assert.match(src,/建議內容和你現在寫的完全一樣，沒有東西需要套用/);
 assert.match(src,/的建議和你現在寫的一樣，沒有列出來/,'有差異時也要交代被略過的欄位');
});

// 實測：改動前每一步畫面上有 16 顆按鈕，卻只有 1 題要答。
// 這條釘住「常駐按鈕」的清單，之後再加東西要有人回來想一下值不值得。
test('常駐按鈕維持在六顆以內，其餘收進可展開區',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 // 步驟列與卡片動作都要在 details 裡
 assert.match(src,/journeyBox=el\('details'/,'步驟列要收進可展開區');
 assert.match(src,/el\('summary','跳到其他步驟'/);
 assert.match(src,/moreBox=el\('details'/,'檢查進度與下載要收進可展開區');
 assert.match(src,/button\('檢查目前進度',\(\)=>checks\(false\),moreBox\)/);
 assert.match(src,/button\('下載目前內容'[\s\S]{0,400}?,moreBox\)/);
 // 儲存草稿留在外面：套用修改或填完一題之後最常按的就是它
 assert.match(src,/button\('儲存草稿',\(\)=>saveWithAuto\(\)\);/);
 // 第三個候選要等痛點 2 填完
 assert.match(src,/card\.candidates\.length<3&&secondReady/,'第三個候選題應等痛點 2 的篩選欄填完才出現');
 assert.match(src,/const secondReady=.*triageFields\.every/,'判斷依據要是痛點 2 的篩選五欄');
});

test('訪談兩題各有自己的範例，且說明屬於問題本身',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 const hints=(src.match(/const questionHints=\[([\s\S]*?)\];/)||[])[1]||'';
 assert.ok(hints,'找不到訪談問題的範例');
 const items=(hints.match(/'[^']+'/g)||[]);
 assert.equal(items.length,2,'兩題要有各自的範例');
 assert.notEqual(items[0],items[1],'兩題不可共用同一個範例');
 assert.match(src,/問最近一次真實經驗，不要問「你會不會用」/,'問題欄位要有屬於自己的說明');
 // 選題理由不再是唯一沒有範例的必填題
 assert.match(src,/為什麼先選這一題[\s\S]{0,140}例如：這件事我每週都遇到/);
});
