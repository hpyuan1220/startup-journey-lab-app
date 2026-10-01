// Local drafting reuses existing answers and feedback; no model/network call.
export const revisionFields=[['statement','痛點陳述',600],['question0','訪談問題 1',300],['question1','訪談問題 2',300]];
export const revisionValue=(card,key)=>key==='statement'?card.statement:card.questions[Number(key.slice(-1))];
export function draftRevision(card,feedback,keys){
 const c=card.candidates[card.selected];
 const value=(key)=>c[key]?.trim()||'待驗證';
 const statement=`目前的觀察：在「${value('context')}」的情境中，「${value('people')}」想要「${value('job')}」，但遇到「${value('problem')}」，目前以「${value('workaround')}」處理。仍待驗證：${value('assumption')}。`;
 return revisionFields.filter(([key])=>keys.includes(key)).map(([key,label,max])=>{
 const after=key==='statement'?statement:feedback?.questions?.[Number(key.slice(-1))];
 if(typeof after!=='string'||!after.trim())throw Error('尚無可用的 AI 訪談追問，請先取得 AI 建議，或只選痛點陳述。');
 const before=revisionValue(card,key)||'';
 // 訪談題的建議是直接沿用 AI 的追問，學生上次套用過就會產生一模一樣的文字。
 // 標出來讓介面不要把「沒有差異」的欄位當成待決定的選項列給學生看。
 return {key,label,max,before,after,changed:before.trim()!==after.trim(),source:key==='statement'?'依目前選中痛點的原填答整理；缺少內容標為待驗證，未新增事實。':'沿用已取得的 AI 追問；請確認符合目前選題，這不是訪談結果。'};
 });
}
export function applyRevision(card,patches,undo=false){
 if(!patches.length)throw Error('請至少勾選一個欄位。');
 // structuredClone 在 iOS 15.3 以前的 Safari 不存在；卡片是純 JSON，用 JSON 複製一樣正確。
 const next=JSON.parse(JSON.stringify(card)),seen=new Set();
 for(const p of patches){
 const field=revisionFields.find(([key])=>key===p.key);
 if(!field||seen.has(p.key))throw Error('修改欄位格式不正確。');seen.add(p.key);
 const expected=undo?p.after:p.before,value=undo?p.before:p.after;
 if(revisionValue(card,p.key)!==expected)throw Error('原欄位已被修改，為避免覆蓋新答案，請重新預覽；復原時請先保留後續修改。');
 if(typeof value!=='string'||value.length>field[2]||(!undo&&!value.trim()))throw Error(`${field[1]}請填寫 1–${field[2]} 字。`);
 if(p.key==='statement')next.statement=value;else next.questions[Number(p.key.slice(-1))]=value;
 }
 return next;
}
