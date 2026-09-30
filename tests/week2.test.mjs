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
