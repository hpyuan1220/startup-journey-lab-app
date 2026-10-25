// Week 5 三個機會比一比：純邏輯，瀏覽器與 Edge Function 共用（不碰 DOM、不碰網路）。
// 內容：五問（題目、0／1／2 的意思、理論出處）、資料正規化、加總與最高分、時間戳、反方 prompt、反方紀錄解析、一頁草稿。
const w5str=v=>typeof v==='string'?v.trim():'';
const w5cut=(v,n)=>w5str(v).slice(0,n);
export const OPP_KEYS=['A','B','C'];

// ---- 五問（docs/THEORY_BASE_V3.md 第二節）----
// levels＝0／1／2 分各是什麼意思；學生每一格要寫一句證據（來自 Week 4 卡 1／卡 2），沒證據只能打 0 或標「估計」。
export const FIVE_QUESTIONS=[
 {key:'pay',n:1,title:'有人正在為它花錢嗎',ask:'誰、為了什麼、現在付錢給誰？不解決會怎樣？',theory:'Blank 的 earlyvangelist（有問題、知道有問題、正在找解法、已經拼湊了臨時解法、有預算）；Hale 的 urgent／mandatory',
  levels:['沒人花錢，只是抱怨','有人花時間自己拼湊臨時解法，但沒付錢','已經有人付錢給某個替代方案（人力、外包、平台）']},
 {key:'freq',n:2,title:'多久一次、一次損失多少',ask:'頻率和金額（或時間）說得出數字嗎？',theory:'Gurley 十因素的「頻率」；Hale 的 frequent／expensive；Maurya 的 must-have 分類',
  levels:['偶爾發生，損失說不出數字','常發生，但損失小或說不清','每週以上，而且一次損失有數字（錢或小時）']},
 {key:'now',n:3,title:'為什麼是現在',ask:'近三年什麼變了（技術、法規、行為、成本），讓以前解不了的現在解得了？',theory:'Sequoia 商業計畫固定一頁「Why now」；Andreessen「市場最重要」',
  levels:['想不出近三年什麼變了','有變化，但跟這個痛的關係弱','近三年有明確的改變，直接讓它變得可解（說得出是哪一個）']},
 {key:'unsolved',n:4,title:'為什麼還沒被解好',ask:'現在的替代方案是什麼、差在哪？是沒人做，還是做不好？',theory:'Christensen 兩個立足點（新市場：沒錢沒技能而不消費；低端：被過度服務、要夠用就好）；Graham 的 schlep blindness',
  levels:['已經有人做得不錯','有人做但做得差，說不出為什麼','沒人做或做不好，而且說得出原因（太麻煩、被過度服務、沒人看見）']},
 {key:'entry',n:5,title:'小團隊進得去嗎',ask:'第一個付錢的人是誰、你接觸得到嗎？大公司為什麼不做？',theory:'Aulet 灘頭市場七問；Moore「大到有意義、小到能領先」',
  levels:['第一個付錢的人接觸不到，或只有大公司','接觸得到，但還不知道怎麼賣、怎麼交付','第一個付錢的人有名字、接觸得到、大公司不會做']},
];
export const MAX_SCORE=FIVE_QUESTIONS.length*2;
export const questionByKey=k=>FIVE_QUESTIONS.find(q=>q.key===k)||null;

// ---- 學生資料 ----
export const FIELDS5=['q1','q2','q1_ai','q2_ai','opps','scores','choice','rebuttal','page'];
export const PAGE_TITLES=['這個機會一句話＋誰在為它花錢','多久一次、一次損失多少','為什麼是現在','為什麼還沒被解好','小團隊怎麼進去：第一個付錢的人','反方說了什麼、我怎麼回'];
export function emptyScores(){const o={};for(const k of OPP_KEYS){o[k]={};for(const q of FIVE_QUESTIONS)o[k][q.key]={score:null,evidence:''};}return o;}
export function emptyWeek5(){return {q1:'',q2:'',q1_ai:'',q2_ai:'',opps:['','',''],scores:emptyScores(),choice:{key:'',reason:''},rebuttal:{text:'',source:''},page:['','','','','','']};}
export const REBUTTAL_SOURCES=['','gemini','gpt','claude','copilot'];
export function normalizeWeek5(input){
 const d=emptyWeek5(),i=input&&typeof input==='object'?input:{};
 d.q1=w5cut(i.q1,600);d.q2=w5cut(i.q2,600);d.q1_ai=w5cut(i.q1_ai,400);d.q2_ai=w5cut(i.q2_ai,400);
 const opps=Array.isArray(i.opps)?i.opps:[];d.opps=[0,1,2].map(n=>w5cut(opps[n],200));
 const sc=i.scores&&typeof i.scores==='object'?i.scores:{};
 for(const k of OPP_KEYS){const col=sc[k]&&typeof sc[k]==='object'?sc[k]:{};for(const q of FIVE_QUESTIONS){const cell=col[q.key]&&typeof col[q.key]==='object'?col[q.key]:{};const s=Number(cell.score);d.scores[k][q.key]={score:[0,1,2].includes(s)&&cell.score!==null&&cell.score!==''?s:null,evidence:w5cut(cell.evidence,240)};}}
 const ch=i.choice&&typeof i.choice==='object'?i.choice:{};d.choice={key:OPP_KEYS.includes(ch.key)?ch.key:'',reason:w5cut(ch.reason,600)};
 const rb=i.rebuttal&&typeof i.rebuttal==='object'?i.rebuttal:{};d.rebuttal={text:w5cut(rb.text,6000),source:REBUTTAL_SOURCES.includes(rb.source)?rb.source:''};
 const pg=Array.isArray(i.page)?i.page:[];d.page=[0,1,2,3,4,5].map(n=>w5cut(pg[n],800));
 return d;
}
/** 每個機會的總分與「估計」格數（證據寫「估計」或空白但打了分）。沒打分的格不算。 */
export function totals(d){
 const out={};
 for(const k of OPP_KEYS){let sum=0,scored=0,estimated=0;for(const q of FIVE_QUESTIONS){const c=d.scores[k][q.key];if(c.score===null)continue;scored++;sum+=c.score;if(!c.evidence||/估計/.test(c.evidence))estimated++;}out[k]={sum,scored,estimated,complete:scored===FIVE_QUESTIONS.length};}
 return out;
}
/** 最高分的機會（只比有打分的；同分取字母序前面的）。全部沒打分回 ''。 */
export function topChoice(d){
 const t=totals(d);let best='',bestSum=-1;
 for(const k of OPP_KEYS){if(!d.opps[OPP_KEYS.indexOf(k)]&&!t[k].scored)continue;if(t[k].scored&&t[k].sum>bestSum){best=k;bestSum=t[k].sum;}}
 return best;
}
/** 選了不是最高分的，要多寫一段理由（≥20 字）。 */
export function choiceNeedsReason(d){const top=topChoice(d);return !!(d.choice.key&&top&&d.choice.key!==top);}
export function choiceOk(d){if(!d.choice.key)return false;return !choiceNeedsReason(d)||d.choice.reason.length>=20;}

const w5filled={
 q1:d=>!!d.q1,q2:d=>!!d.q2,q1_ai:d=>!!d.q1_ai,q2_ai:d=>!!d.q2_ai,
 opps:d=>d.opps.some(Boolean),
 scores:d=>OPP_KEYS.some(k=>FIVE_QUESTIONS.some(q=>d.scores[k][q.key].score!==null)),
 choice:d=>!!d.choice.key,
 rebuttal:d=>!!d.rebuttal.text,
 page:d=>d.page.some(Boolean),
};
/** 每個欄位第一次有內容、或內容改變時蓋章；清空不蓋章、不清章。 */
export function applyStamps5(prevData,nextData,prevStamps,nowIso){
 const stamps={...(prevStamps||{})};
 for(const k of FIELDS5){if(!w5filled[k](nextData))continue;const changed=!prevData||JSON.stringify(prevData[k])!==JSON.stringify(nextData[k]);if(changed||!stamps[k])stamps[k]=nowIso;}
 return stamps;
}
/** 完成＝三個機會都打完五問、選了一個（非最高分有理由）、反方有紀錄、一頁六段都有字。 */
export function week5Progress(d){
 const t=totals(d);const oppsN=d.opps.filter(Boolean).length;
 const scoredAll=OPP_KEYS.filter(k=>d.opps[OPP_KEYS.indexOf(k)]).every(k=>t[k].complete)&&oppsN>0;
 const rounds=parseRebuttal(d.rebuttal.text).rounds.length;
 const pageN=d.page.filter(p=>p.length>=20).length;
 const missing=[];
 if(oppsN<3)missing.push('三個機會（回 Week 4 卡 3 填）');
 if(!scoredAll)missing.push('計分表（每格 0／1／2＋一句證據）');
 if(!d.choice.key)missing.push('選一個');else if(!choiceOk(d))missing.push('選了不是最高分的，要寫理由（至少 20 字）');
 if(!d.rebuttal.text)missing.push('反方三回合');
 if(pageN<6)missing.push(`一頁六段（還差 ${6-pageN} 段）`);
 return {q1:w5filled.q1(d),q2:w5filled.q2(d),oppsN,scoredAll,totals:t,top:topChoice(d),choice:d.choice.key,choiceOk:choiceOk(d),rounds,pageN,missing,done:missing.length===0};
}

// ---- 反方 prompt 與紀錄 ----
export const TOOLS5=[['claude','Claude','https://claude.ai/new?q=',true],['gpt','ChatGPT','https://chatgpt.com/?q=',true],['gemini','Gemini','https://gemini.google.com/app',false],['copilot','Copilot','https://copilot.microsoft.com/',false]];
export function toolUrl5(tool,prompt){const t=TOOLS5.find(x=>x[0]===tool)||TOOLS5[0];return t[3]?t[2]+encodeURIComponent(prompt):t[2];}
/** 把一個機會的五格證據排成給 AI 看的清單。 */
export function evidenceLines(d,key){
 return FIVE_QUESTIONS.map(q=>{const c=d.scores[key][q.key];return `${q.n}. ${q.title}：${c.score===null?'（沒打分）':c.score+' 分'}${c.evidence?'｜證據：'+c.evidence:'｜（沒寫證據）'}`;}).join('\n');
}
export function buildPrompt5(kind,d,q){
 if(kind==='rebuttal'){
  const key=d.choice.key||topChoice(d)||'A';const opp=d.opps[OPP_KEYS.indexOf(key)]||'〔機會一句話〕';
  return `（這是大學創業課的作業：練習用證據回應反對意見。）你現在扮演一位在台灣做這一行撐了十年的老闆，生意還過得去、不想多花一毛錢、對學生的點子很懷疑。我是學生，我選的機會是：${opp}\n我對它的五問評分和證據：\n${evidenceLines(d,key)}\n\n規則：我們來三回合。每一回合你只用「【拒絕 n】」開頭給我一個具體的拒絕理由（像老闆真的會說的話，兩三句，針對我證據最弱的地方），然後停下來等我回應，不要替我回答。我回應後，你判斷我有沒有用證據說服你，再給下一個拒絕理由。三回合結束後，用「【反方紀錄】」開頭，照這個格式整理：\n拒絕 1：…\n我的回應 1：…（原文照抄）\n拒絕 2：…\n我的回應 2：…\n拒絕 3：…\n我的回應 3：…\n總結：哪一回合我有說服你、哪一回合沒有、我最該去補的一個證據是什麼。\n繁體中文。現在請給【拒絕 1】。`;
 }
 if(kind==='q1'||kind==='q2'){
  const question=q?.[kind]||'',answer=d[kind]||'',points=q?.points||'';
  const task=points?`用繁體中文、兩句以內告訴學生：他答對了講義裡的哪一點、漏了什麼或哪裡講得不精確。不要打分數，不要重寫他的答案。`:`用繁體中文、兩句以內判斷：這個回答有沒有具體提到一個今天課堂講的例子或觀念。不要打分數，不要重寫他的答案。`;
  return `你是一門大學創業課的助教。下面是老師的問題${points?'、講義重點':''}、學生的回答。${task}\n【老師的問題】${question}\n${points?`【講義重點】${points}\n`:''}【學生的回答】${answer}`;
 }
 return '';
}
/** 從貼回的【反方紀錄】抓三回合與總結；抓不到回合就回空陣列（老師端看得出學生只貼了一段話）。 */
export function parseRebuttal(text){
 const t=String(text||'');const rounds=[];
 for(let n=1;n<=3;n++){
  const rej=t.match(new RegExp(`拒絕\\s*${n}\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*我的回應\\s*${n}|\\n\\s*拒絕\\s*${n+1}|\\n\\s*總結|$)`));
  const me=t.match(new RegExp(`我的回應\\s*${n}\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*拒絕\\s*${n+1}|\\n\\s*總結|$)`));
  if(rej||me)rounds.push({n,reject:w5cut(rej?.[1],800),reply:w5cut(me?.[1],800)});
 }
 const sum=t.match(/總結\s*[：:]\s*([\s\S]*)$/);
 return {rounds,summary:w5cut(sum?.[1],800)};
}
/** 一頁六段的草稿：用計分表的證據先填（學生再改成完整句子）。只填空的段。 */
export function draftPage(d){
 const key=d.choice.key||topChoice(d);if(!key)return d.page.slice();
 const opp=d.opps[OPP_KEYS.indexOf(key)]||'';const sc=d.scores[key];const rb=parseRebuttal(d.rebuttal.text);
 const ev=k=>sc[k].evidence||'（這一格還沒有證據：回 Week 4 卡 2 找，或寫「估計」）';
 const drafts=[
  `我選的是機會 ${key}：${opp}。有人正在為它花錢：${ev('pay')}`,
  `頻率與金額：${ev('freq')}`,
  `為什麼是現在：${ev('now')}`,
  `為什麼還沒被解好：${ev('unsolved')}`,
  `小團隊怎麼進去、第一個付錢的人是誰：${ev('entry')}`,
  rb.rounds.length?rb.rounds.map(r=>`反方第 ${r.n} 回合說：${r.reject}${r.reply?'　我的回應：'+r.reply:''}`).join('\n')+(rb.summary?'\n總結：'+rb.summary:''):'（反方三回合還沒做）',
 ];
 return d.page.map((p,i)=>p||w5cut(drafts[i],800));
}
