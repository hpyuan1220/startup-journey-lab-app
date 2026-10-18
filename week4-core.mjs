// Week 4 第一輪研究：純邏輯，瀏覽器與 Edge Function 共用（不碰 DOM、不碰網路）。
// 內容：產業板九張卡、課表與課中判定、課堂兩題預設、資料正規化、時間戳、prompt 組裝、產業推薦。
const w4str=v=>typeof v==='string'?v.trim():'';
const w4cut=(v,n)=>w4str(v).slice(0,n);

// ---- 產業板第四版（docs/INDUSTRY_CARDS_V4.md）----
// topics＝對到的全班普查題號（week3-core DEFAULT_SURVEY_TOPICS 的 topic_id）。
export const INDUSTRY_CARDS=[
 {id:1,name:'餐飲小店',sub:'早餐、便當、小吃、飲料',topics:[4,5,13,21],payers:'顧客付餐費；老闆付點餐系統月費、外送抽成約三成、人力',sources:'經濟部統計處 餐飲業營業額；「外送平台 抽成 店家」近一年新聞；Dcard／PTT 店家抱怨文',redline:''},
 {id:2,name:'零工與臨時人力',sub:'排班、代班、3 小時短班；學生與 55 歲以上都是供給端',topics:[9,1,17],payers:'連鎖總部與店長付缺工代價；政府五五就業獎勵',sources:'小雞上工 2026 開學打工調查；勞動部 五五就業獎勵；聯合報 65+ 勞參率',redline:''},
 {id:3,name:'網拍與小品牌電商',sub:'客服、退貨、信任',topics:[8,10,12,15,6],payers:'買家付商品與運費；賣家付平台手續費、廣告費、退貨成本',sources:'數位時代 2025 消費趨勢；蝦皮／momo 賣家費率公告；「網拍 退貨率」報導',redline:''},
 {id:4,name:'旅宿與空間出租',sub:'民宿、包棟、自習室、場地、停車',topics:[11,14,19,18],payers:'旅客付房費；民宿付 OTA 佣金 15–25%；自習室離峰空位賣不掉',sources:'Smart Order OTA 佣金指南；旅報；交通部觀光署 民宿統計',redline:''},
 {id:5,name:'健身與運動服務',sub:'小型場館、個人工作室、自費治療所的非醫療端',topics:[],payers:'會員自費；場館付場地、排課系統、行銷',sources:'數位時代 2025 消費趨勢；經理人 2026 生生優動；瓦奇維 物理治療費用行情',redline:'一律不碰診斷、建議、療效；只研究提醒、排課、續約、衛教的非醫療段'},
 {id:6,name:'在地小型服務業',sub:'美業、咖啡店、個人工作室：獲客→私訊→預約→到店→回流',topics:[12,5,22],payers:'店主付廣告或代操、預約系統月費、平台抽成',sources:'客立樂 2026 美業系統比較；經理人 2026 生生優動；中央社 2024-05-30 LINE 台灣大 AI 預約',redline:''},
 {id:7,name:'長照與銀髮服務（家屬端）',sub:'家屬輪班、用藥回診提醒、與看護的交辦',topics:[],payers:'家屬自費；長照 2.0 給付；照護機構',sources:'衛福部 長照 2.0 統計；數位時代 2025 消費趨勢；工商時報 長照專題',redline:'不碰醫療判斷'},
 {id:8,name:'寵物服務',sub:'美容、住宿、日托、用品；獸醫只看非醫療的預約與提醒段',topics:[],payers:'飼主自費；業者付預約系統、平台抽成、人力',sources:'農業部 寵物登記管理資訊網；「寵物產業 產值」近一年報導；「寵物美容 預約 爽約」論壇文',redline:'不碰獸醫診斷與用藥'},
 {id:9,name:'二手與租借',sub:'二手衣、二手書、器材與服裝租借；循環經濟',topics:[10,6,15],payers:'買家付手續費；賣家付上架與廣告；租借收租金與押金',sources:'「二手交易 市場規模 台灣」；蝦皮／旋轉拍賣 二手統計；環境部 循環經濟',redline:''},
];
export const UNUSABLE_TOPICS=[7,16,20,17]; // 早八、記帳、抽菸場所、個人搶票：直接改選
export const cardById=id=>INDUSTRY_CARDS.find(c=>c.id===Number(id))||null;
/** 依學生普查勾「遇過」的題號排卡：命中多的排前；全沒命中就原順序。回傳 [{card,hits}] */
export function recommendCards(experiencedTopicIds){
 const set=new Set((experiencedTopicIds||[]).map(Number));
 return INDUSTRY_CARDS.map(card=>({card,hits:card.topics.filter(t=>set.has(t)).length})).sort((a,b)=>b.hits-a.hits||a.card.id-b.card.id);
}

// ---- 課表與課中判定 ----
// 上課日 13:30–18:00（台北，UTC+8）。存檔時間落在任何一個上課日的時段內＝課中。
export const CLASS_SCHEDULE={
 tz:'+08:00',start:'13:30',end:'18:00',
 days:[[4,'2026-10-23'],[5,'2026-10-30'],[6,'2026-11-06'],[7,'2026-11-13'],[8,'2026-11-20'],[9,'2026-11-27'],[10,'2026-12-04'],[11,'2026-12-11'],[12,'2026-12-18']],
};
export const classDate=week=>(CLASS_SCHEDULE.days.find(([w])=>w===Number(week))||[])[1]||null;
export function classWindow(date){const s=CLASS_SCHEDULE;return [Date.parse(`${date}T${s.start}:00${s.tz}`),Date.parse(`${date}T${s.end}:00${s.tz}`)];}
/** 回 {kind:'in',week} 或 {kind:'after'}；無效時間回 null */
export function stampLabel(iso){
 const t=Date.parse(iso||'');if(!Number.isFinite(t))return null;
 for(const [week,date] of CLASS_SCHEDULE.days){const [a,b]=classWindow(date);if(t>=a&&t<=b)return {kind:'in',week};}
 return {kind:'after'};
}
/** 出席：該週的 q1、q2 都在那一週的上課時段內存檔 */
export function attendance(stamps,week){
 const l1=stampLabel(stamps?.q1),l2=stampLabel(stamps?.q2);
 return !!(l1&&l2&&l1.kind==='in'&&l2.kind==='in'&&l1.week===Number(week)&&l2.week===Number(week));
}
export const labelText=iso=>{const l=stampLabel(iso);return l?(l.kind==='in'?'課中':'課後'):'';};

// ---- 課堂兩題：老師可改；留白用預設，再留白用通用題 ----
export const GENERIC_QUESTIONS={q1:'今天老師講的內容裡，哪一點最讓你意外？為什麼？',q2:'把今天講的任何一個例子套到你 Week 4 選的產業痛，一句話。',points:''};
export const DEFAULT_QUESTIONS={
 4:{q1:'Bhidé 訪談 Inc. 500 創辦人發現大多數點子從哪來？一句話說這跟你 Week 1 的起點卡有什麼關係。',q2:'用六條路徑裡的任何一條，說出你的痛可能屬於的另一個產業，一句話。',points:'Bhidé 1994：約七成點子來自親身工作經驗、個位數來自系統性研究；新事業通常解創辦人自己身為顧客或員工碰到的問題。藍海六條路徑：替代產業、策略群、買方鏈、互補品、功能／情感、時間趨勢。'},
 5:{q1:'Blank 說的 earlyvangelist 有五個特徵，寫出其中兩個。',q2:'你的三個機會裡，哪一個最可能被「為什麼是現在」這一問刷掉？為什麼？',points:'earlyvangelist：有問題、知道自己有問題、正在找解法、已經自己拼湊了臨時解法、有或能拿到預算。'},
};
export function resolveQuestions(week,row){
 const d=DEFAULT_QUESTIONS[Number(week)]||GENERIC_QUESTIONS;
 return {q1:w4cut(row?.q1,300)||d.q1,q2:w4cut(row?.q2,300)||d.q2,points:w4cut(row?.points,600)||d.points||''};
}
export function normalizeQuestions(input){return {q1:w4cut(input?.q1,300),q2:w4cut(input?.q2,300),points:w4cut(input?.points,600)};}

// ---- 學生資料 ----
export const SOURCES=['','gemini','gpt','claude','copilot','notebooklm'];
export const SOURCE_LABEL={gemini:'Gemini 說',gpt:'GPT 說',claude:'Claude 說',copilot:'Copilot 說',notebooklm:'NotebookLM 查到（有引用）'};
export const FIELDS=['pain','industry','q1','q2','q1_ai','q2_ai','card1','card2','card3'];
export function emptyWeek4(){return {pain:'',industry:{card:null,custom:''},q1:'',q2:'',q1_ai:'',q2_ai:'',card1:{text:'',source:''},card2:{text:'',source:''},card3:{text:'',source:'',opps:['','','']}};}
const w4src=v=>SOURCES.includes(v)?v:'';
export function normalizeWeek4(input){
 const d=emptyWeek4(),i=input&&typeof input==='object'?input:{};
 d.pain=w4cut(i.pain,300);
 const ind=i.industry&&typeof i.industry==='object'?i.industry:{};
 const card=ind.card==='custom'?'custom':Number.isInteger(Number(ind.card))&&cardById(ind.card)?Number(ind.card):null;
 d.industry={card,custom:card==='custom'?w4cut(ind.custom,40):''};
 d.q1=w4cut(i.q1,600);d.q2=w4cut(i.q2,600);d.q1_ai=w4cut(i.q1_ai,400);d.q2_ai=w4cut(i.q2_ai,400);
 for(const k of ['card1','card2','card3']){const c=i[k]&&typeof i[k]==='object'?i[k]:{};d[k].text=w4cut(c.text,6000);d[k].source=w4src(c.source);}
 const opps=Array.isArray(i.card3?.opps)?i.card3.opps:[];d.card3.opps=[0,1,2].map(n=>w4cut(opps[n],200));
 return d;
}
export const industryName=d=>d?.industry?.card==='custom'?(d.industry.custom||'（自填）'):(cardById(d?.industry?.card)?.name||'');
const w4filled={pain:d=>!!d.pain,industry:d=>d.industry.card==='custom'?!!d.industry.custom:!!d.industry.card,q1:d=>!!d.q1,q2:d=>!!d.q2,q1_ai:d=>!!d.q1_ai,q2_ai:d=>!!d.q2_ai,card1:d=>!!d.card1.text,card2:d=>!!d.card2.text,card3:d=>!!(d.card3.text||d.card3.opps.some(Boolean))};
/** 每個欄位第一次有內容、或內容改變時蓋章；清空不蓋章、不清章（老師要看的是「什麼時候做的」）。 */
export function applyStamps(prevData,nextData,prevStamps,nowIso){
 const stamps={...(prevStamps||{})};
 for(const k of FIELDS){
  if(!w4filled[k](nextData))continue;
  const changed=!prevData||JSON.stringify(prevData[k])!==JSON.stringify(nextData[k]);
  if(changed||!stamps[k])stamps[k]=nowIso;
 }
 return stamps;
}
export function week4Progress(d){return {pain:w4filled.pain(d),industry:w4filled.industry(d),q1:w4filled.q1(d),q2:w4filled.q2(d),card1:w4filled.card1(d),card2:w4filled.card2(d),card3:w4filled.card3(d),cards:['card1','card2','card3'].filter(k=>w4filled[k](d)).length};}

// ---- prompt：app 幫學生填好，學生複製去自己的工具 ----
export const TOOLS=[['gemini','Gemini','https://gemini.google.com/app',false],['gpt','ChatGPT','https://chatgpt.com/?q=',true],['claude','Claude','https://claude.ai/new?q=',true],['copilot','Copilot','https://copilot.microsoft.com/',false]];
export const NOTEBOOKLM_URL='https://notebooklm.google.com/';
export function toolUrl(tool,prompt){const t=TOOLS.find(x=>x[0]===tool)||TOOLS[0];return t[3]?t[2]+encodeURIComponent(prompt):t[2];}
export function buildPrompt(kind,d,q){
 const ind=industryName(d)||'〔產業〕',pain=d.pain||'〔我的痛，一句話〕';
 if(kind==='card1')return `你是台灣「${ind}」這一行的資深顧問。我觀察到：${pain}。請告訴我 (1) 這一行誰付錢給誰、多久一次、大概多少；(2) 業者自己會說出口的三到五個困難；(3) 這些困難現在用什麼方法撐著（人工、LINE、Excel、外包、平台）。繁體中文，每點兩行內，數字寫出處或標「估計」。`;
 if(kind==='card2')return `請只根據這個筆記本裡的來源回答，每一點後面附引用；找不到就說找不到，不要推測。關於台灣的「${ind}」：1. 這一行有多大（家數、營業額、從業人數）？2. 誰在賺錢、錢怎麼流？3. 業者最常被抱怨、自己最常抱怨的三件事？4. 過去三年什麼變了？5. 有人試過解決嗎、結果如何？6. 台灣跟國外差在哪？`;
 if(kind==='card3')return `以下是我用 NotebookLM 查到、有來源的「${ind}」困難：\n${d.card2?.text||'（還沒貼卡 2 的證據）'}\n\n根據這些，列三個適合小團隊切入的機會。每個機會寫：解誰的哪個困難、第一個會付錢的人是誰、現在他付錢給誰、為什麼是現在（AI、法規、行為改變）。不要給做 App 或平台的答案，除非你能說出第一個付錢的人。繁體中文，每個機會不超過四行。`;
 if(kind==='q1'||kind==='q2'){
  const question=q?.[kind]||'',answer=d[kind]||'',points=q?.points||'';
  const task=points?`用繁體中文、兩句以內告訴學生：他答對了講義裡的哪一點、漏了什麼或哪裡講得不精確。不要打分數，不要重寫他的答案。`:`用繁體中文、兩句以內判斷：這個回答有沒有具體提到一個今天課堂講的例子或觀念、有沒有真的連到他自己選的產業痛。不要打分數，不要重寫他的答案。`;
  return `你是一門大學創業課的助教。下面是老師的問題${points?'、講義重點':''}、學生的回答。${task}\n【老師的問題】${question}\n${points?`【講義重點】${points}\n`:''}【學生的回答】${answer}`;
 }
 return '';
}
