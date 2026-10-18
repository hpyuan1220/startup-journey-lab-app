// 學生回看自己前幾週的卡（唯讀）。
// 起因（2026-10-16 正式站實查）：已交、老師也確認過的 Week 2 卡，學生打開時只看到「第 1/5 步：痛點 1」，
// 標題寫「延續 Week 1 的困擾」、旁邊一句「已帶入可用的 Week 1 內容」，其餘 24 格收在後面四步裡，
// 學生以為 Week 2 不見了、只剩 Week 1。Week 3 頁更是完全看不到前兩週。
// 這裡只負責「看」：不改資料、不碰表單。
// 2026-10-18 起 Week 1–3 都改成「回顧卡」：已交的人進頁只看摘要＋一顆「修改這張卡」，表單收起來。
import {triageFields,depthFields,selectedIndex} from './week2-core.mjs?v=20260930-lean';
import {fitsOptions,judgmentOptions} from './week3-core.mjs?v=20261013-preclass';

const REVIEW={approved:'老師已確認',revision:'老師請你小幅修訂',hold:'請先與老師討論',pending:'老師還沒看'};
const WEEK3=[['who','受訪者'],['when_where','時間地點'],['quotes','原話'],['cost','代價'],['workaround','目前做法'],['surprise','意外發現']];
const WEEK1=[['observed_problem','觀察到的問題'],['affected_user','誰受影響'],['observed_context','現場'],['verbatim_complaint','聽到的原話'],['known_fact','已知事實'],['unverified_assumption','待驗證假設'],['interview_next_question','下週最想問']];

const add=(parent,tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const line=(parent,label,value)=>{if(!String(value||'').trim())return null;const p=add(parent,'p','','prior-line');add(p,'b',label+'：');p.append(String(value));return p;};

/** Week 2 卡的狀態字：「已交 · 老師已確認」。 */
export function week2StatusText(row){
 if(!row)return '還沒開始';
 const sent=row.status==='submitted'||!!row.submitted_at;
 return `${sent?(row.status==='submitted'?'已交':'交過，之後改成草稿'):'草稿'} · ${REVIEW[row.review_status]||REVIEW.pending} · 版本 ${row.version}`;
}

/** 整張 Week 2 卡的摘要。選中的那一題放最前面，另一題只放五格；老師的話放最上面。 */
export function renderWeek2Summary(parent,row){
 const card=row?.card;if(!card)return null;
 const box=add(parent,'div','','prior-body');
 if(row.teacher_note)line(box,'老師的話',row.teacher_note);
 line(box,'我的痛點陳述',card.statement);
 const pick=selectedIndex(card);
 (card.candidates||[]).forEach((c,i)=>{
  const sec=add(box,'section','','prior-candidate'+(i===pick?' prior-picked':''));
  add(sec,'h4',`痛點 ${i+1}${i===pick?' · 我選這一題':''}`);
  for(const [k,t] of (i===pick?[...triageFields,...depthFields]:triageFields))line(sec,t,c[k]);
 });
 line(box,'選題理由',card.reason);
 line(box,'什麼證據會讓我換題',card.reconsider);
 const who=(card.interviewees||[]).filter(Boolean);
 if(who.length){add(box,'h4','三位受訪者');const ul=add(box,'ul');for(const w of who)add(ul,'li',w);}
 const qs=(card.questions||[]).filter(Boolean);
 if(qs.length){add(box,'h4','兩題訪談問題');const ol=add(box,'ol');for(const q of qs)add(ol,'li',q);}
 return box;
}

/** Week 1 起點卡的摘要。 */
export function renderWeek1Summary(parent,w1){
 if(!w1)return null;
 const box=add(parent,'div','','prior-body');
 for(const [k,t] of WEEK1)line(box,t,w1[k]);
 if(w1.teacher_note)line(box,'老師的話',w1.teacher_note);
 return box;
}

/** Week 3 訪談卡的摘要：三次訪談各一小段、最後的判斷與修正後的陳述。 */
export function renderWeek3Summary(parent,record,row){
 if(!record)return null;
 const box=add(parent,'div','','prior-body');
 if(row?.teacher_note)line(box,'老師的話',row.teacher_note);
 const fits=Object.fromEntries(fitsOptions),judg=Object.fromEntries(judgmentOptions);
 (record.interviews||[]).forEach((it,n)=>{
  if(!Object.values(it).some(v=>String(v||'').trim()))return;
  const sec=add(box,'section','','prior-candidate');
  add(sec,'h4',`訪談 ${n+1}`);
  for(const [k,t] of WEEK3)line(sec,t,it[k]);
  line(sec,'痛點成立嗎',fits[it.fits]);
 });
 line(box,'我的判斷',judg[record.judgment]);
 line(box,'理解改變了什麼',record.learned);
 line(box,'修正後的痛點陳述',record.statement);
 return box;
}

/** 一個可展開的回看區塊。 */
export function priorDetails(parent,title,open=false){
 const d=add(parent,'details','','prior-week');d.open=open;add(d,'summary',title);return d;
}
