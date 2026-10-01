import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyCard,normalize,check,fields,aiInput,readiness,priority,challengeFields} from '../week2-core.mjs';
import {demoCard} from './support/week2-harness.mjs';
const complete=()=>{const d=emptyCard();d.candidates.forEach((c,i)=>fields.forEach(([k])=>c[k]=`候選 ${i+1} 的具體觀察`));d.reason='較容易接觸使用者';d.reconsider='多數人沒有遇到此問題';d.statement='午休很短的學生排隊後來不及用餐';d.interviewees=['角色甲、課後詢問','角色乙、社團詢問','角色丙、午休詢問'];d.questions=['上一次何時發生？','當時怎麼處理？'];d.contact_confirmed=true;d.questions_checked=true;return d;};
test('空卡列出缺項，完整卡可交',()=>{assert.equal(check(emptyCard()).ok,false);assert.equal(check(complete()).ok,true);});
test('三種路徑同一最低成果',()=>{for(const mode of ['guided','standard','challenge']){const d=complete();d.mode=mode;assert.equal(check(normalize(d)).ok,true);}});
test('關鍵字只提示，不錯誤擋下',()=>{const d=complete();d.candidates[0].problem='我想做 App';const c=check(d);assert.equal(c.ok,true);assert.ok(c.warnings.length);});
test('拒絕不合法索引及超長輸入',()=>{let d=complete();d.selected=20;assert.throws(()=>normalize(d));d=complete();d.reason='a'.repeat(601);assert.throws(()=>normalize(d));});
test('忽略偽造教師欄位',()=>{const d=normalize({...complete(),review_status:'approved',class_id:'foreign'});assert.equal(d.review_status,undefined);assert.equal(d.class_id,undefined);});
test('AI 移除身分欄位與已知識別資訊',()=>{const d=complete();d.candidates[0].evidence='王小明 B123 irene@example.com 0912345678';d.interviewees[0]='不能外傳';const s=aiInput(d,'review',['王小明','B123']);for(const v of ['王小明','B123','irene@example.com','0912345678','不能外傳'])assert.ok(!s.includes(v));});
test('待教師抽查可準備訪談，教師 hold 阻擋',()=>{assert.match(readiness({status:'submitted',review_status:'pending'}),/可準備/);assert.match(readiness({status:'submitted',review_status:'hold'}),/先與老師/);});
test('重複受訪者不能通過',()=>{const d=complete();d.interviewees=['同學','同學','同學'];assert.equal(check(d).ok,false);});
test('教師優先看到 hold',()=>assert.ok(priority({review_status:'hold'})<priority({status:'submitted',review_status:'pending'})));

test('來源勾選與外部 AI 保存，保留舊文字且排除未知選項',()=>{const c=complete();Object.assign(c,{source:'舊的觀察說明',source_types:['observation','reference','unknown'],source_reference:'文章名稱',external_ai:'ChatGPT 協助整理'});const n=normalize(c);assert.equal(n.source,c.source);assert.deepEqual(n.source_types,['observation','reference']);assert.equal(n.source_reference,c.source_reference);assert.equal(n.external_ai,c.external_ai);assert.equal(check(n).ok,true);assert.ok(!aiInput(n,'review').includes('ChatGPT'));});

test('進階探索與填答節奏已分開：提醒看填答狀況，不看 mode',()=>{
 const base=demoCard();
 // 節奏設為 challenge（舊值）但一題進階都沒填 —— 不應再出現進階提醒
 const legacy=structuredClone(base);legacy.mode='challenge';
 assert.equal(check(normalize(legacy)).warnings.some(w=>w.includes('進階')),false);
 // 一般節奏但填了一部分進階題 —— 應該提醒
 const partial=structuredClone(base);partial.mode='standard';partial.challenge[challengeFields[0][0]]='有些人完全沒這個困擾';
 assert.equal(check(normalize(partial)).warnings.some(w=>w.includes('進階')),true);
 // 全部填完 —— 不提醒
 const full=structuredClone(base);full.mode='guided';challengeFields.forEach(([k],i)=>{full.challenge[k]='進階答案 '+i;});
 assert.equal(check(normalize(full)).warnings.some(w=>w.includes('進階')),false);
});

test('進階答案只要有填就送模型，與填答節奏無關',()=>{
 const empty=structuredClone(demoCard());empty.mode='challenge';
 assert.equal(JSON.parse(aiInput(normalize(empty),'review')).challenge&&Object.values(JSON.parse(aiInput(normalize(empty),'review')).challenge).some(Boolean),false);
 const filled=structuredClone(demoCard());filled.mode='guided';filled.challenge[challengeFields[0][0]]='最大的反例是住宿生';
 const sent=JSON.parse(aiInput(normalize(filled),'review'));
 assert.equal(sent.challenge[challengeFields[0][0]],'最大的反例是住宿生');
});

// B：欄位問法改成學生看得懂的問句，並保留短標籤給清單與訊息使用
test('證據欄位改用問句呈現，短標籤仍保留給清單與提示訊息', () => {
  const evidence = fields.find(([key]) => key === 'evidence');
  assert.equal(evidence[1], '已有觀察與來源', '短標籤不可改，清單與訊息依賴它');
  assert.equal(evidence[2], '你什麼時候、在哪裡，親眼看到這件事？');
  const names = Object.fromEntries(fields);
  assert.equal(names.evidence, '已有觀察與來源', '第三個元素不得污染 names 對照表');
  // 2026-09-30：acceptance（現在的方法為什麼還不夠）從選填的進階區移進必填的深入欄位，
  // 所以是 10 不是 9。這個數字刻意寫死，欄位再被改動時要有人回來看一眼。
  assert.equal(fields.length, 10, '欄位數量不得意外改變');
});

// 防漂移：week2-core.mjs 改了但沒重新產生 Dashboard 單檔，正式服務會繼續用舊規則
test('week2-api 單檔版本與 week2-core.mjs 同步', async () => {
  const fsp = await import('node:fs/promises');
  const core = await fsp.readFile(new URL('../week2-core.mjs', import.meta.url), 'utf8');
  const bundled = await fsp.readFile(new URL('../supabase/functions/week2-api/index.bundled.ts', import.meta.url), 'utf8');
  for (const line of core.split('\n')) {
    const body = line.replace(/^export /, '').trim();
    if (!body.startsWith('const fields=') && !body.startsWith('const challengeFields=') && !body.startsWith('const RULES_VERSION=')) continue;
    assert.ok(bundled.includes(body), `單檔版本落後：請執行 node scripts/build-week2-function.mjs\n缺少：${body.slice(0, 60)}`);
  }
});

// 外部 AI 揭露原本埋在「來源確認」那個選用步驟裡，幾乎沒人看得到。
// 移到提交前會被問到，但不擋提交 —— 用了外部 AI 不是作弊，重點是誠實揭露。
test('提交前會問外部 AI，但不影響提交資格',async()=>{
 const fs=await import('node:fs/promises');
 const src=await fs.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/這張卡有用到系統以外的 AI 嗎/);
 assert.match(src,/ai-disclosure/);
 const {check,normalize}=await import('../week2-core.mjs');
 const {demoCard}=await import('./support/week2-harness.mjs');
 const withAi=normalize({...demoCard(),external_ai:'ChatGPT 協助整理訪談題'});
 const withoutAi=normalize({...demoCard(),external_ai:''});
 assert.equal(check(withAi).ok,true,'揭露了外部 AI 不該擋住提交');
 assert.equal(check(withoutAi).ok,true,'沒有揭露也不該擋住提交');
 assert.equal(withAi.external_ai,'ChatGPT 協助整理訪談題','揭露內容要保存下來');
});

// YC 的選題及格線：既然已經有現在的做法，為什麼還是有人不滿意？
// 學生最常見的失敗是挑一個「有點煩但現在做法其實還行」的題目，
// 到第五週訪談完才發現沒人在乎。這一題原本是選填，藏在進階區。
test('現在的方法為什麼還不夠：必填，且只問選中的那一個候選',async()=>{
 const {triageFields,depthFields,challengeFields,fields,check,normalize}=await import('../week2-core.mjs');
 assert.ok(depthFields.some(([k])=>k==='acceptance'),'要在深入欄位裡');
 assert.ok(!challengeFields.some(([k])=>k==='acceptance'),'不該還留在選填的進階區');
 assert.ok(!triageFields.some(([k])=>k==='acceptance'),'篩選階段不問這題：還沒選題之前問了沒有意義');
 assert.equal(fields.length,triageFields.length+depthFields.length);
 const {demoCard}=await import('./support/week2-harness.mjs');
 const card=normalize(demoCard());
 card.candidates[card.selected].acceptance='';
 const result=check(card);
 assert.equal(result.ok,false,'選中的候選沒填這一題不該通過');
 assert.ok(result.errors.some(e=>/現在的方法為什麼還不夠/.test(e)),result.errors.join('；'));
 // 沒被選中的那個不必答
 const other=normalize(demoCard());
 other.candidates[1-other.selected].acceptance='';
 assert.equal(check(other).ok,true,'沒被選中的候選不必回答深入題');
});

// 實際發生過：學生按「我卡住了，給我探索方向」，確認面板被插在整張卡最上面，
// 距離按鈕約 5000px（手機六個螢幕）；按鈕同時因為 await 變灰，狀態列沒有任何提示。
// 學生看到的是「按了沒反應」。以下四項各對應一個當時缺的東西。
test('送出前的確認面板：出現在按鈕旁邊，而且會留下線索',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/confirmAnonymous\(content,true,autoStatus\)/,
  '自動 AI 的確認面板要插在 autoStatus 旁邊');
 assert.match(src,/confirmAnonymous\(anonymous,false,aiControls,trigger\)/,
  '手動兩顆按鈕的確認面板要插在 aiControls 旁邊，並把按鈕本身傳進去');
 assert.match(src,/after\.parentNode\.insertBefore\(panel,after\.nextSibling\)/,
  '面板要插在傳進來的位置之後，不是整張卡最上面');
 assert.match(src,/msg\.textContent='有一段內容在等你確認/,
  '狀態列要說有東西在等確認，否則變灰的按鈕沒有任何解釋');
 assert.match(src,/trigger\.textContent='↑ 請到上方確認送出內容'/,
  '變灰的那顆按鈕要自己說明為什麼變灰');
 assert.match(src,/if\(confirmOpen\)throw Error/,
  '面板開著時再按另一顆，要給訊息而不是開第二個面板');
});

// 同一家族的第二批：按了有反應，但反應發生在螢幕外，或按鈕是死的。
// 量測方式：手機尺寸（390×844）逐顆按，比對新增內容是否落在當下的視窗內。
test('換步驟之後要捲到「這一步要做的事」，死按鈕要隱藏，下載要有回饋',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.ok(src.includes("const target=key==='submit'?liveCheck:key==='ai'?aiStep:form.querySelector"),
  "表單步驟要捲到題目本身，提交步驟要捲到自動檢查——捲到步驟標題不夠");
 assert.match(src,/r\.top>innerHeight-140\|\|r\.bottom<0/,
  '只有在內容確實看不到時才捲，不要每次都跳');
 assert.match(src,/previousStep\.hidden=index<=0/,
  '第一步的「上一步」要隱藏，不是灰掉——灰掉沒有任何說明');
 assert.match(src,/若沒看到檔案，請查看瀏覽器的下載項目/,
  '下載按鈕在手機上可能靜默失敗，要留一句話');
});

// 今天把 acceptance 從選填移進 depthFields，深入區從四題變五題，
// 但畫面上那句說明還寫著「接下來四題」——改了 A 沒去檢查誰依賴 A，又一次。
// 這類數字一律從資料推導，不要寫死。
test('深入區的題數說明必須跟著 depthFields 走，不可寫死',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/接下來\$\{depthFields\.length\}題只問這一個困擾/,'題數要由 depthFields.length 推導');
 assert.ok(!/接下來(一|二|三|四|五|六|七|八|九|十|\d)+題/.test(src),'不可再有寫死的題數');
 const {depthFields}=await import('../week2-core.mjs');
 assert.equal(depthFields.length,5,'目前是五題；改動時這個測試會提醒你連說明一起看');
});

// 使用者連問四次「那一格在哪裡」。實際情況：
// 1) 引導模式一次只顯示一題，缺的那一題根本不在畫面上；
// 2)「歡迎回來」明確說出缺的是哪一題，卻沒有任何按鈕帶她過去；
// 3)「檢查目前進度」在引導模式下只列出「剛好等於目前這一題」的缺項 ——
//    缺的不是目前這一題時清單是空的，要再按一次「查看整張卡還缺什麼」才會出現。
// 系統知道答案、也說出來了，就是不給路。
test('缺的那一題一定要有一顆按鈕可以直接過去',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../week2.js',import.meta.url),'utf8');

 assert.match(src,/function missingTargets\(\)/,'缺項的計算要抽出來，歡迎區塊與檢查共用同一份答案');
 assert.match(src,/function gotoTarget\(t\)/,'跳題要有單一入口，不要在兩個地方各寫一次');
 assert.match(src,/直接去補：\$\{first\.label\}/,'歡迎回來要有一顆直達缺項的按鈕');
 assert.match(src,/const first=missingTargets\(\)\[0\]/,'那顆按鈕要用真正的缺項，不是猜的');

 // 引導模式下，清單不可以是空的
 assert.match(src,/here\.length\?here:targets\.slice\(0,3\)/,
  '缺項不是目前這一題時，也要列出可以按的項目，不能讓畫面沒有任何出口');
 // 這裡刻意不寫負向字串比對：上一版寫了一個會打到合法變數的 regex，
 // 測試紅了但程式是對的。改用正向比對三選一的那一行就夠。
});

// 載入失敗時，卡片整張不會出現，畫面看起來就跟資料不見一樣。
// 原本只留一句「你仍可閱讀本週藍圖與下載教材」——沒有重試、沒有說可以重新整理、
// 也沒有講「你的內容沒有遺失」。使用者實際遇到的就是這一句。
test('載入失敗要給重試按鈕，並說清楚內容沒有遺失',async()=>{
 const fsp=await import('node:fs/promises');
 const src=await fsp.readFile(new URL('../week2.js',import.meta.url),'utf8');
 assert.match(src,/你的內容沒有遺失/,'先講清楚資料還在，再講怎麼辦');
 assert.match(src,/el\('button','重新載入'/,'要有一顆重試按鈕，不能只留一句話');
 assert.match(src,/retry\.onclick=\(\)=>location\.reload\(\)/,'按下去要真的重載');
 assert.match(src,/Failed to fetch\|NetworkError\|Load failed/,'網路層失敗要用學生看得懂的話說，不要直接丟英文');
 assert.ok(!/你仍可閱讀本週藍圖與下載教材/.test(src),'舊的那句沒有出路，不該留著');
});

// 明天上課會發生的情境：還沒提交 Week 1 的學生打開 Week 2。
// 原本只在整張卡最下面放一行純文字連結，實測在 y=1415px —— 手機要捲 1.7 個螢幕。
// 學生看到「你還沒提交 Week 1」，畫面上卻沒有任何可以點的東西。
test('還沒提交 Week 1 的學生，要看得到補交的入口', async () => {
 const fsp = await import('node:fs/promises');
 const src = await fsp.readFile(new URL('../week2.js', import.meta.url), 'utf8');
 assert.match(src, /你還沒提交 Week 1，所以 Week 2 還不能開始。你填過的內容都還在。/,
  '先講清楚資料還在，再講怎麼辦');
 assert.match(src, /el\('a','前往補交 Week 1 起點卡',box\)/, '入口要在說明旁邊，不是卡片最下面');
 assert.match(src, /go\.className='primary-link'/, '要有按鈕外觀，17px 的純文字連結找不到');
 assert.match(src, /box\.scrollIntoView\(\{block:'center'\}\);go\.focus\(\)/, '要捲進畫面並取得焦點');
 assert.ok(!/const a=el\('a','補交 Week 1'\)/.test(src), '舊的那行沒有出路，不該留著');
});

// 兩台裝置或兩個分頁同時編輯時，伺服器回 409
// 「另一個視窗已更新這張卡，請先下載目前內容再重新載入。」
// 訊息叫學生做兩件事，但下載鈕收在「更多」的收合區裡、重新載入根本沒有按鈕。
// 明天學生用手機＋筆電兩邊開就會遇到。
test('存檔撞到版本衝突時，要給真的能按的按鈕', async () => {
 const fsp = await import('node:fs/promises');
 const src = await fsp.readFile(new URL('../week2.js', import.meta.url), 'utf8');
 assert.match(src, /e\.status=r\.status;/, 'api\\(\\) 要把 HTTP 狀態帶出來，不要比對訊息字串');
 assert.match(src, /if\(e&&e\.status===409\)/, '用狀態碼判斷衝突');
 assert.match(src, /你現在打的內容還在畫面上/, '先講清楚內容沒丟');
 assert.match(src, /下載目前內容（備份）/, '叫他下載就要有下載鈕');
 assert.match(src, /重新載入最新版本/, '叫他重新載入就要有重新載入鈕');
 assert.match(src, /rl\.className='primary-action'/, '重新載入是主要動作');
 assert.match(src, /box\.scrollIntoView\(\{block:'center'\}\);dl\.focus\(\)/, '要捲進畫面');
});

// 使用者實際卡住的地方：第 3/5 步、本步驟第 8/8 題，「下一題」變灰。
// 要繼續得去按另一顆「繼續下一步」，而它貼在畫面底部 773px（視窗 861px）很容易錯過。
// 學生按到一半發現按鈕按不下去，會以為卡住了。
test('每一步的最後一題，「下一題」不可以是死按鈕', async () => {
 const fsp = await import('node:fs/promises');
 const src = await fsp.readFile(new URL('../week2.js', import.meta.url), 'utf8');
 assert.match(src, /const last=at===inStage\.length-1;/);
 assert.match(src, /button\(last\?'這一步填完了，繼續下一步':'下一題'/,
  '最後一題要改成帶他往前的按鈕，不是變灰');
 assert.match(src, /if\(last\)moveStage\(1\);else jump/, '按下去要真的進入下一步');
 assert.ok(!/nextBtn\.disabled=at===inStage\.length-1/.test(src),
  '舊的「最後一題就變灰」寫法不該留著');
});
