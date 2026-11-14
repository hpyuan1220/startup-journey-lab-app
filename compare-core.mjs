// Week 10 比較頁的規則（前端 compare.js、teacher-compare.js 與 Edge week2-api 共用）。
// 一組一份 teams.compare：{scores:{[company]:{q1..q5:{score:0|1|2|null,evidence}}}, counters:{big,customer,tech,chosen}, pick:{company,reason,at}, notes}
import {COMPANY_NAME,companyDir} from './islands-core.mjs';

export const COMPARE_QUESTIONS=[
 {key:'q1',title:'有人正在為它付錢嗎',hint:'誰付錢、付多少、客戶數（七格卡第 1＋5 格）',rubric:'0：只有免費用戶或 demo｜1：有付費客戶但說不出數字｜2：有客戶數或營收數字'},
 {key:'q2',title:'多久一次、一次多少',hint:'收費方式與單價；一個客戶一年付多少（第 2 格＋估價）',rubric:'0：不知道怎麼收費｜1：知道方式，金額不公開也沒估｜2：有數字或有估價'},
 {key:'q3',title:'為什麼是現在',hint:'近三年哪一個改變讓它可做（第 4 格）',rubric:'0：「AI 很強」｜1：有變化但關係弱｜2：說得出具體的那一個改變'},
 {key:'q4',title:'為什麼還沒被解好',hint:'取代誰、大廠為什麼不做（第 3＋6 格）',rubric:'0：大廠已經做得不錯｜1：取代了人或軟體，但大廠一加功能就沒了｜2：取代對象清楚＋說得出大廠為什麼不做'},
 {key:'q5',title:'台灣做得到嗎',hint:'台灣同層有沒有人、差在哪（第 7 格，你們查的）',rubric:'0：查不到也想不出為什麼｜1：有人做，說不出差在哪｜2：查到 1–2 家、比得出差在哪（或說得出台灣為什麼沒人做）'},
];
export const COUNTER_KINDS=[['big','大廠那一刀','「我加一個功能就把你做掉了」——平台／既有軟體商'],['customer','客戶那一刀','「旺季變貴」「我的人就會了」「出錯誰負責」'],['tech','技術那一刀','「模型降價，你的毛利沒了」「模型公司直接做」']];
export const MAX_COMPARE=COMPARE_QUESTIONS.length*2;
export const PAGES=[
 ['這家公司一句話','誰付錢、買什麼、怎麼收（理由卡第 1、2 格＋一句話）。開場 10 秒內讓台下知道它賣什麼給誰。'],
 ['錢流與收費、以前誰在做','收費方式＋數字（公開的引官網；不公開的講估價與怎麼估）；取代誰、省多少。'],
 ['為什麼是現在','近三年那一個改變＋募資／客戶數當「有人押注」的證據（募資不等於賺錢）。'],
 ['為什麼不是另外兩家','比較表（五問 0／1／2 三家並排）；研究那兩家的人各講 30 秒「我這家輸在哪一問」。'],
 ['風險與反方最狠的一刀','三種反方選一刀＋你們的回法（或老實說沒證據、下一步查什麼）。'],
 ['台灣同層／我們學到什麼','台灣有沒有同一層的業者、收費差在哪（第 7 格）；一句「這家公司教我們的一件事」。'],
];
const cut=(v,n)=>String(v??'').replace(/\r/g,'').slice(0,n);
const sc=v=>(v===0||v===1||v===2)?v:(v==='0'||v==='1'||v==='2')?Number(v):null;
export function emptyCompare(){return {scores:{},counters:{big:'',customer:'',tech:'',chosen:''},pick:{company:'',reason:'',at:''},notes:''};}
// allowed：這組三個人推薦的公司 id；不在裡面的分數直接丟掉
export function normalizeCompare(input,allowed){
 const i=input&&typeof input==='object'&&!Array.isArray(input)?input:{};const d=emptyCompare();const ok=new Set((allowed||[]).map(x=>String(x).toLowerCase()));
 const scores=i.scores&&typeof i.scores==='object'?i.scores:{};
 for(const [cid,qs] of Object.entries(scores)){const id=String(cid).toLowerCase();if(!ok.has(id)||!qs||typeof qs!=='object')continue;d.scores[id]={};for(const q of COMPARE_QUESTIONS){const c=qs[q.key]&&typeof qs[q.key]==='object'?qs[q.key]:{};d.scores[id][q.key]={score:sc(c.score),evidence:cut(c.evidence,300)};}}
 const c=i.counters&&typeof i.counters==='object'?i.counters:{};for(const [k] of COUNTER_KINDS)d.counters[k]=cut(c[k],300);d.counters.chosen=COUNTER_KINDS.some(([k])=>k===c.chosen)?c.chosen:'';
 const p=i.pick&&typeof i.pick==='object'?i.pick:{};const pc=String(p.company||'').toLowerCase();d.pick={company:ok.has(pc)?pc:'',reason:cut(p.reason,600),at:pc&&ok.has(pc)?cut(p.at,40):''};
 d.notes=cut(i.notes,1000);return d;
}
export function compareTotals(d){const out={};for(const [cid,qs] of Object.entries(d.scores||{})){let sum=0,n=0,withEv=0;for(const q of COMPARE_QUESTIONS){const c=qs[q.key]||{};if(c.score!=null){sum+=c.score;n++;if(c.evidence)withEv++;}}out[cid]={sum,n,withEv,complete:n===COMPARE_QUESTIONS.length};}return out;}
export function topCompany(d){const t=compareTotals(d);let best='',bs=-1;for(const [cid,x] of Object.entries(t)){if(x.complete&&x.sum>bs){bs=x.sum;best=cid;}}return best;}
export function pickNeedsReason(d){const top=topCompany(d);return !!(d.pick.company&&top&&d.pick.company!==top);}
export function pickOk(d){if(!d.pick.company)return false;return !pickNeedsReason(d)||d.pick.reason.length>=20;}
export function compareProgress(d,allowed){
 const t=compareTotals(d);const ids=(allowed||[]).map(x=>String(x).toLowerCase());const scored=ids.filter(id=>t[id]?.complete).length;
 const missing=[];
 if(ids.length<3)missing.push(`三家還沒到齊（${ids.length}／3）`);
 if(scored<ids.length)missing.push(`比較表還有 ${ids.length-scored} 家沒打完五格`);
 if(!d.pick.company)missing.push('還沒選定一家');else if(!pickOk(d))missing.push('選了不是最高分的，要寫理由（至少 20 字）');
 const cn=COUNTER_KINDS.filter(([k])=>d.counters[k]).length;if(cn<3)missing.push(`反方三格還有 ${3-cn} 格空的`);
 if(!d.counters.chosen)missing.push('還沒選最狠的一刀');
 return {scored,ids,compareTotals:t,top:topCompany(d),pick:d.pick.company,pickOk:pickOk(d),counters:cn,missing,done:missing.length===0};
}
// 期末框架：六頁＋每人講稿草稿。members：[{student_id,directions,reps}]；cards：{[student_id]:{[company]:{why,sources,url,est,estOk,insight,argue}}}；names：{[student_id]:name}
// companyInfo(cid)：{name,tagline,card:[[k,v]...]}（前端用 islands-data；Edge 不產框架，所以可以不給）
export function buildFramework(d,members,names,cards,companyInfo){
 const pick=d.pick.company;if(!pick)return null;
 const owner=(members||[]).find(m=>Object.values(m.reps||{}).includes(pick));
 const others=(members||[]).filter(m=>m.student_id!==owner?.student_id);
 const nm=id=>names?.[id]||id;const info=companyInfo?companyInfo(pick):null;const name=info?.name||COMPANY_NAME[pick]||pick;
 const grid=k=>info?.card?.find(([kk])=>kk===k)?.[1]||'';
 const myCard=owner?cards?.[owner.student_id]?.[pick]||{}:{};
 const t=compareTotals(d);const losers=Object.keys(d.scores).filter(c=>c!==pick);
 const loseLine=c=>{const qs=d.scores[c]||{};const weakest=COMPARE_QUESTIONS.map(q=>[q,qs[q.key]?.score]).filter(([,s])=>s!=null).sort((a,b)=>a[1]-b[1])[0];const who=(members||[]).find(m=>Object.values(m.reps||{}).includes(c));return `${COMPANY_NAME[c]||c}（${nm(who?.student_id||'')}）：總分 ${t[c]?.sum??'—'}／${MAX_COMPARE}${weakest?`，最弱在「${weakest[0].title}」${weakest[1]} 分：${qs[weakest[0].key]?.evidence||'（證據待補）'}`:''}`;};
 const chosenKind=COUNTER_KINDS.find(([k])=>k===d.counters.chosen);
 const pages=[
  {n:1,title:PAGES[0][0],speaker:owner?.student_id||'',body:[`${name}：${info?.tagline||''}`,myCard.why?`為什麼是好新創：${myCard.why}`:'為什麼是好新創：（理由卡還沒寫一句話）',`誰付錢：${grid('誰付錢')}`,`怎麼收費：${grid('怎麼收費')}${myCard.est?`｜我們的估價：${myCard.est}`:''}`].filter(Boolean).join('\n')},
  {n:2,title:PAGES[1][0],speaker:owner?.student_id||'',body:[`怎麼收費：${grid('怎麼收費')}`,`以前誰在做：${grid('以前誰在做')}`,`五問第 2 題證據：${d.scores[pick]?.q2?.evidence||'（待補）'}`].join('\n')},
  {n:3,title:PAGES[2][0],speaker:owner?.student_id||others[0]?.student_id||'',body:[`為什麼是現在：${grid('為什麼是現在')}`,`數字（有人押注的證據，不等於賺錢）：${grid('數字')}`,`五問第 3 題證據：${d.scores[pick]?.q3?.evidence||'（待補）'}`].join('\n')},
  {n:4,title:PAGES[3][0],speaker:others.map(m=>m.student_id).join('、'),body:[`比較表總分：${Object.entries(t).map(([c,x])=>`${COMPANY_NAME[c]||c} ${x.sum}／${MAX_COMPARE}`).join('、')}`,...losers.map(loseLine),pickNeedsReason(d)?`選非最高分的理由：${d.pick.reason}`:''].filter(Boolean).join('\n')},
  {n:5,title:PAGES[4][0],speaker:others[0]?.student_id||owner?.student_id||'',body:[chosenKind?`最狠的一刀（${chosenKind[1]}）：${d.counters[chosenKind[0]]}`:'最狠的一刀：（還沒選）',`七格卡的風險：${grid('風險')}`,myCard.argue?`找碴紀錄：${myCard.argue}`:'',`我們的回法：（用證據回，或老實說沒證據、下一步查什麼）`].filter(Boolean).join('\n')},
  {n:6,title:PAGES[5][0],speaker:others[1]?.student_id||others[0]?.student_id||owner?.student_id||'',body:[`台灣同層：${grid('台灣同層')}`,`五問第 5 題證據：${d.scores[pick]?.q5?.evidence||'（待查）'}`,'我們學到的一件事：（一句）'].join('\n')},
 ];
 const scripts={};for(const m of members||[]){const mine=pages.filter(p=>String(p.speaker).split('、').includes(m.student_id));scripts[m.student_id]=mine.map(p=>`【第 ${p.n} 頁 ${p.title}｜約 90 秒】\n${p.body}`).join('\n\n')||'（還沒分到頁：到比較表下面的分工改）';}
 const pdf=[`一、三張理由卡（個人分）：${(members||[]).map(m=>`${nm(m.student_id)}＝${Object.values(m.reps||{}).map(c=>COMPANY_NAME[c]||c).join('、')||'（未推薦）'}`).join('；')}`,`二、比較表：${Object.entries(t).map(([c,x])=>`${COMPANY_NAME[c]||c} ${x.sum}／${MAX_COMPARE}`).join('、')}`,`三、選定 ${name} 為什麼是好新創（組分）：用六頁的講稿改。`];
 return {company:pick,name,pages,scripts,pdf,owner:owner?.student_id||''};
}
