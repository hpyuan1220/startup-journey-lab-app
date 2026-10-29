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

/** 痛點句子裡的關鍵字 → 產業卡。老師 2026-10-19 實測：痛是「合租找室友」卻被推到「健身」，prompt 硬把兩者接在一起、AI 一本正經地亂答。
 * 所以推薦先看痛的文字，再看普查；句子完全對不到任何一條就老實說「看不出來」，讓學生自己選或自填。 */
export const PAIN_KEYWORDS={
 1:['吃飯','吃什麼','要吃','午餐','早餐','晚餐','宵夜','餐廳','餐點','便當','飲料店','飲料','喝什麼','菜單','手搖','排隊','排隊買','點餐','外送','小吃','用餐','買飯','客人太多'],
 2:['打工','排班','代班','工讀','兼職','缺人','短班','時薪','店長','班表','人手'],
 3:['網拍','蝦皮','電商','退貨','賣家','買家','代購','直播','出貨','賣東西','買東西','網購','購物','商品','比價','評論','折扣','穿搭','衣服','服飾','褲子','鞋子','穿什麼','品質'],
 4:['租屋','室友','合租','房東','房仲','民宿','住宿','自習室','場地','停車','車位','違停','包棟','租房','旅遊','出遊','景點','訂房','圖書館','座位'],
 5:['健身','運動','場館','教練','球場','瑜珈','游泳','重訓','跑步'],
 6:['美髮','美甲','美容','按摩','預約','工作室','理髮','剪髮','獲客','咖啡廳'],
 7:['長照','銀髮','長輩','爺爺','奶奶','照護','看護','回診','用藥','阿公','阿嬤'],
 8:['寵物','毛小孩','獸醫','寄宿','遛狗','貓咪','狗狗'],
 9:['二手','租借','租衣','二手書','器材','閒置','循環','轉賣'],
};
/** 對不到任何一條線時，再看痛是哪一類，給一句「往哪裡選」的明確指引（2026-10-20 用全班實際痛點歸納）：
 *  group＝分組協調類（全班最多，10 人）→ 翻到業者那一面是「很多人要對時間」：零工排班（2）、場地預約（4），或自填「補習班排課」。
 *  unusable＝早八／記帳／抽菸／搶票這四類：找不到願意付錢的人，直接改選（先判，因為「抽菸找地方」的句子裡也會出現「空堂」）。
 *  biz＝痛本身已經是某一行業者的痛（例如業務開發）→ 直接自填那一行。 */
export const PAIN_PATTERNS=[
 ['unusable',['早八','起不來','鬧鐘','睡過頭','賴床','記帳','理財','錢花光','抽菸','吸菸','抽煙','吸煙','搶票','門票','搶不到票']],
 ['biz',['業務員','陌生開發','潛在客戶','接案','開店']],
 ['group',['分組','組員','組長','分工','開會','對時間','都有空','空堂','找組員','討論時間']],
];
export function painPattern(painText){const t=String(painText||'');for(const [k,words] of PAIN_PATTERNS){if(words.some(w=>t.includes(w)))return k;}return '';}
export const PATTERN_HINTS={
 group:'你的痛是「分組協調」這一類（對時間、找組員、分工、沒人開口）：同學之間沒有人付錢，但翻到業者那一面，「很多人要湊在一起、對時間、找人」是真的有人花錢在解決的——請直接選 2 零工排班（排班、找人、代班）或 4 場地預約；想做補習班排課、社團／活動媒合也可以自己填。',
 unusable:'你的痛是「早八起不來、記帳、找抽菸的地方、個人搶票」這一類：找不到願意付錢的人，不用硬掰。請直接從下面九條挑一條你接觸得到業者或客人的（例如你打工的店、常去的店）。',
 biz:'你的痛本身就是某一行業者的痛（例如業務開發、接案、開店）：不用對九條，直接在最下面「自己填一個產業」寫那一行就好。',
 '':'從你的痛看不出屬於哪一條線（這很常見，例如通勤、選擇困難、人際）。想一下「誰的生意裡也有這個麻煩」，從下面九條挑一條你接觸得到業者或客人的；都不是就自己填一個產業。',
};
export function keywordHits(card,painText){const t=String(painText||'');return (PAIN_KEYWORDS[card.id]||[]).filter(k=>t.includes(k)).length;}
/** 把「痛的文字」和「普查命中」合起來排：文字命中一個算 2 分，普查命中一題算 1 分。回傳 [{card,hits,score,byText}]；
 * related＝有沒有任何一條靠文字對上（false 就該直接秀全部九條，讓學生自己選）。 */
export function rankCards(painText,surveyRecommended){
 const sv=new Map((surveyRecommended||[]).map(r=>[Number(r.id),Number(r.hits)||0]));
 const list=INDUSTRY_CARDS.map(card=>{const byText=keywordHits(card,painText);const hits=sv.get(card.id)||0;return {card,hits,byText,score:byText*2+hits};}).sort((a,b)=>b.score-a.score||a.card.id-b.card.id);
 return {list,related:list.some(x=>x.byText>0)};
}

// ---- 課表與課中判定 ----
// 上課日 13:00–17:00（台北，UTC+8；老師 10/29 從 13:30–18:00 改）。存檔時間落在任何一個上課日的時段內＝課中。
export const CLASS_SCHEDULE={
 tz:'+08:00',start:'13:00',end:'17:00',
 days:[[4,'2026-10-30'],[5,'2026-11-06'],[7,'2026-11-13'],[8,'2026-11-20'],[9,'2026-11-27'],[10,'2026-12-04'],[11,'2026-12-11'],[12,'2026-12-18']],
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
/** 卡 3 貼回的整段裡，抓「【貼回摘要】」後面的「機會A：…」三行；抓不到就回空陣列。 */
export function extractOpps(text){
 const t=String(text||'');const i=t.indexOf('【貼回摘要】');const tail=i>=0?t.slice(i):t;
 const out=['','',''];for(const m of tail.matchAll(/機會\s*([ABCabc])\s*[：:]\s*([^\n]+)/g)){const idx='ABC'.indexOf(m[1].toUpperCase());if(idx>=0&&!out[idx])out[idx]=m[2].trim().replace(/^[「"]|[」"]$/g,'').slice(0,200);}
 return out.some(Boolean)?out:[];
}
export function buildPrompt(kind,d,q){
 const ind=industryName(d)||'〔產業〕',pain=d.pain||'〔我的痛，一句話〕';
 if(kind==='card1')return `（這是大學創業課的產業研究作業，目的是學習分析產業。）你是台灣「${ind}」這一行的資深顧問。我是使用者，我觀察到的痛是：${pain}。\n第一步，先判斷：這個痛翻到業者那一面，會落在「${ind}」這一行的哪一段（誰為它花錢、花時間）？如果這個痛跟這一行其實關係不大，請直接說「關係不大」，並告訴我它比較像哪一行，不要硬湊。\n第二步，只針對「${ind}」這一行回答：(1) 誰付錢給誰、多久一次、大概多少；(2) 業者自己會說出口的三到五個困難；(3) 這些困難現在用什麼方法撐著（人工、LINE、Excel、外包、平台）。\n繁體中文，每點兩行內，數字寫出處或標「估計」。\n最後用「【貼回摘要】」開頭，給我三行可以直接貼回作業的摘要：第一行誰付錢給誰、第二行業者最大的一個困難、第三行現在用什麼撐著。`;
 if(kind==='card2')return `請只根據這個筆記本裡的來源回答。每一點後面請直接寫出是哪個來源，格式：（來源：來源的標題），不要只給編號；找不到就寫（來源：找不到），不要推測。\n我研究的是台灣「${ind}」這一行裡、跟這個痛有關的那一段：${pain}。六題都只回答這一段（例如痛是學生合租，就只看學生租屋／包租代管，不要答飯店民宿）。\n1. 這一段有多大（家數、營業額、從業人數）？2. 誰在賺錢、錢怎麼流？3. 業者最常被抱怨、自己最常抱怨的三件事？4. 過去三年什麼變了？5. 有人試過解決嗎、結果如何？6. 台灣跟國外差在哪？`;
 if(kind==='card3')return `（這是大學創業課的產業研究作業。）以下是我用 NotebookLM 查到、有來源的「${ind}」困難：\n${d.card2?.text||'（還沒貼卡 2 的證據）'}\n\n根據這些，列三個適合小團隊切入的機會。每個機會寫：解誰的哪個困難、第一個會付錢的人是誰、現在他付錢給誰、為什麼是現在（AI、法規、行為改變）。不要給做 App 或平台的答案，除非你能說出第一個付錢的人。繁體中文，每個機會不超過四行。\n最後用「【貼回摘要】」開頭，用三行總結，每行一個機會、一句話，格式固定：「機會A：〔誰的哪個困難〕→ 第一個付錢的人：〔誰〕」「機會B：…」「機會C：…」。`;
 if(kind==='q1'||kind==='q2'){
  const question=q?.[kind]||'',answer=d[kind]||'',points=q?.points||'';
  const task=points?`用繁體中文、兩句以內告訴學生：他答對了講義裡的哪一點、漏了什麼或哪裡講得不精確。不要打分數，不要重寫他的答案。`:`用繁體中文、兩句以內判斷：這個回答有沒有具體提到一個今天課堂講的例子或觀念、有沒有真的連到他自己選的產業痛。不要打分數，不要重寫他的答案。`;
  return `你是一門大學創業課的助教。下面是老師的問題${points?'、講義重點':''}、學生的回答。${task}\n【老師的問題】${question}\n${points?`【講義重點】${points}\n`:''}【學生的回答】${answer}`;
 }
 return '';
}
