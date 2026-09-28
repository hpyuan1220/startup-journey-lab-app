import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyCard} from '../week2-core.mjs';
import {draftRevision,applyRevision} from '../week2-revision.mjs';
test('草稿只整理目前選題，保留未知、不修改原卡',()=>{const c=emptyCard();c.selected=1;c.candidates[1].people='租屋學生';const before=JSON.stringify(c);const [p]=draftRevision(c,null,['statement']);assert.match(p.after,/租屋學生/);assert.match(p.after,/待驗證/);assert.equal(JSON.stringify(c),before);});
test('只套用選中欄位，可復原，其他答案不變',()=>{const c=emptyCard();c.statement='原答案';c.questions=['原問題一','原問題二'];c.ai_response='自己的判斷';const p=draftRevision(c,{questions:['追問一','追問二']},['question1']);const next=applyRevision(c,p);assert.deepEqual(next.questions,['原問題一','追問二']);assert.equal(next.ai_response,c.ai_response);assert.deepEqual(applyRevision(next,p,true),c);});
test('欄位已變動時拒絕套用與復原，不覆寫後續作答',()=>{const c=emptyCard();const p=draftRevision(c,null,['statement']);c.statement='新答案';assert.throws(()=>applyRevision(c,p),/已被修改/);const next=emptyCard();next.statement='後續修改';assert.throws(()=>applyRevision(next,p,true),/已被修改/);});
test('空選擇、無追問、空字串、超長及任意欄位不可套用',()=>{const c=emptyCard();assert.throws(()=>applyRevision(c,[]));assert.throws(()=>draftRevision(c,null,['question0']));for(const p of [{key:'statement',before:'',after:''},{key:'statement',before:'',after:'a'.repeat(601)},{key:'question0',before:'',after:'a'.repeat(301)},{key:'evidence',before:'',after:'編造'}])assert.throws(()=>applyRevision(c,[p]));});
