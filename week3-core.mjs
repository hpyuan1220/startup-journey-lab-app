// Week 3 訪談紀錄卡：瀏覽器與 Edge Function 共用的純邏輯（不含任何身分資訊）。
// 一張卡 = 三次訪談 + 訪談後的判斷。所有欄位都是學生自己的文字；AI 不參與本週。
export const WEEK3_RULES='w3-20261012';
export const INTERVIEW_COUNT=3;
export const interviewFields=[
 ['who','受訪者代稱＋身分（不寫姓名）','例：便利商店夜班工讀生 A'],
 ['when_where','什麼時候、在哪裡訪談','例：10/14 下課後，教室外走廊，約 10 分鐘'],
 ['quotes','對方的原話（至少一句，照抄用詞）','例：「上禮拜三我排到快上課，直接不吃了，下午餓到頭昏。」'],
 ['cost','對方說的代價（時間／錢／錯過什麼）','例：「大概等了 20 分鐘」、「那天就沒吃」'],
 ['workaround','對方目前怎麼處理、為什麼','例：「後來都去便利商店，比較貴但快」'],
 ['surprise','意外發現（你原本沒想到的事）','例：他其實不怕排隊，是怕排完想吃的賣完了'],
];
export const fitsOptions=[['yes','成立：對方真的遇過，說得出上一次'],['partly','部分：遇過，但卡的點跟我想的不同'],['no','不成立：對方沒遇過，或說不出具體事件']];
export const judgmentOptions=[['keep','成立：保留這個痛點，補強陳述'],['adjust','調整：縮小人物或步驟，改寫陳述'],['change','換題：回 Week 2 另一個候選']];

export function emptyInterview(){return {who:'',when_where:'',quotes:'',cost:'',workaround:'',surprise:'',fits:''};}
export function emptyRecord(){return {interviews:[emptyInterview(),emptyInterview(),emptyInterview()],judgment:'',learned:'',statement:''};}
const str=v=>typeof v==='string'?v.replace(/\r/g,'').trim().slice(0,2000):'';
export function normalizeRecord(input){
 const r=emptyRecord();const src=input&&typeof input==='object'?input:{};
 const list=Array.isArray(src.interviews)?src.interviews:[];
 r.interviews=r.interviews.map((blank,i)=>{const it=list[i]&&typeof list[i]==='object'?list[i]:{};const out={...blank};for(const k of Object.keys(blank))out[k]=str(it[k]);if(!['yes','partly','no',''].includes(out.fits))out.fits='';return out;});
 r.judgment=['keep','adjust','change'].includes(src.judgment)?src.judgment:'';
 r.learned=str(src.learned);r.statement=str(src.statement);
 return r;
}
/** 一次訪談算「記了」：有代稱、有時地、有原話。 */
export function interviewDone(it){return !!(it.who&&it.when_where&&it.quotes.length>=6);}
export function doneCount(record){return record.interviews.filter(interviewDone).length;}
/** 正式提交的規則：三次都記了、每次有「是否成立」、有判斷、有修正後的陳述。原話裡像姓名／電話的東西擋下來。 */
export function checkRecord(record){
 const errors=[],warnings=[];
 record.interviews.forEach((it,i)=>{
  const n=i+1;
  if(!interviewDone(it))errors.push(`訪談 ${n}：請填受訪者代稱、什麼時候在哪裡、以及至少一句原話`);
  else if(!it.fits)errors.push(`訪談 ${n}：請選「痛點是否成立」`);
  if(it.quotes&&!/[「"“]/.test(it.quotes))warnings.push(`訪談 ${n}：原話建議用「」括起來，跟你的解讀分開`);
  if(it.quotes&&!it.cost)warnings.push(`訪談 ${n}：沒記到代價，下次追問「那次多花了多少？」`);
 });
 if(!record.judgment)errors.push('請選訪談後的判斷（成立／調整／換題）');
 if(record.statement.length<10)errors.push('請用受訪者的用詞重寫一次痛點陳述（至少 10 字）');
 const text=record.interviews.map(it=>`${it.who} ${it.quotes} ${it.surprise}`).join(' ');
 if(/(?:姓名|身分證|身份證|電話|學號)\s*[:：]|[A-Z][12]\d{8}|\b0[2-9][- ]?\d{6,8}\b|@\w+\.\w+/.test(text))errors.push('紀錄裡好像有姓名、電話、學號或 Email，請改成代稱後再提交');
 return {ok:errors.length===0,errors,warnings};
}
/** 學生端的三階燈：0 還沒交 / 1 交了 / 2 三次都記了 / 3 老師說 OK。 */
export function week3Completion(record,row){
 const everSubmitted=!!(row&&(row.submitted_at||row.status==='submitted'));
 const n=doneCount(record);
 let level=0;if(everSubmitted)level=1;if(everSubmitted&&n>=INTERVIEW_COUNT&&record.judgment)level=2;if(row&&row.review_status==='approved')level=3;
 const labels=['還沒交','交了','三次都記了','老師說 OK'];
 let next='';
 if(n<INTERVIEW_COUNT)next=`還差 ${INTERVIEW_COUNT-n} 次訪談：填代稱、時地、一句原話就算一次`;
 else if(!record.judgment)next='三次都記了，選一個判斷：成立／調整／換題';
 else if(!everSubmitted)next='按「正式提交」，老師就看得到';
 else if(level<3)next='等老師看；期間可以繼續補原話';
 return {level,labels,done:n,next};
}

// ---- 全班痛點普查 ----
// 一份表單、每人填一次：每題只問事實（遇過嗎、上次何時、多花多少、現在怎麼辦），最後勾「願意被同學訪談」。
// 用途是替訪談找受訪者、讓老師看哪些題目全班真的有感；不是作業，也不算訪談次數。
// 預設題目只是起點，老師在教師洞察可以改字、關題、加題；題目裡沒有任何學生姓名。
export const DEFAULT_SURVEY_TOPICS=[
 ['分組：約第一次開會時間','跨年級／跨系分組，LINE 來回好幾天才敲定'],
 ['分組：組員已讀不回、拖到截止','組長在截止前熬夜替人收尾'],
 ['分組：找不到組員','通識／外系課自由分組，不認識人只能碰運氣'],
 ['午餐排隊太久、來不及吃','午休短，排 20 分鐘以上，有時直接放棄'],
 ['午餐吃什麼決定不了','跟朋友討論半天，最後隨便選'],
 ['早上穿搭花太久','搭 20–30 分鐘還不滿意，甚至遲到'],
 ['早八起不來','鬧鐘按掉好幾次、睡過頭'],
 ['想買國外品牌買不到','官網刷不過或要實名，代購貴很多'],
 ['打工排班、換班','班表太晚出、衝堂要私訊換班'],
 ['衣服版型不合身','好看的版型穿不下或不舒服'],
 ['考前找不到讀書座位','圖書館、咖啡廳沒位子或太吵'],
 ['網購比價看到不敢下單','評價分散又業配，開一堆分頁'],
 ['逛街選擇困難','比較半小時沒買，同行的人乾等'],
 ['出國旅行沒人願意規劃','大家都想去，沒人排行程'],
 ['線上訂的服裝道具不合','收到才發現尺寸、品質不對'],
 ['錢不知道花到哪','月底沒錢、記帳記不住'],
 ['訂票流程太麻煩','演唱會、車票要搶、步驟多'],
 ['外語內容看不懂、翻譯不準','上課或自學卡在語言'],
 ['機車找不到停車位','校園或超商周邊'],
 ['找不到可以抽菸的地方','校園周邊吸菸區'],
 ['打工交班漏記、重複盤點','上一班沒記，下一班重做'],
 ['陌生開發開不了口','推銷、擺攤、拉人入社'],
].map((t,i)=>({topic_id:i+1,label:t[0],hint:t[1],active:true,sort:i+1}));
const ALIAS_BAD=/[A-Z][12]\d{8}|\b0[2-9][- ]?\d{6,8}\b|@\w+\.\w+/;
export function normalizeTopics(input){
 const list=Array.isArray(input)?input:[];const out=[];const seen=new Set();
 list.forEach((t,i)=>{if(!t||typeof t!=='object')return;const id=Number(t.topic_id);if(!Number.isInteger(id)||id<1||id>99||seen.has(id))return;seen.add(id);
  const label=str(t.label).slice(0,40),hint=str(t.hint).slice(0,80);if(!label)return;
  out.push({topic_id:id,label,hint,active:t.active!==false,sort:Number.isInteger(t.sort)?t.sort:i+1});});
 return out;
}
/** 學生的一份回答：只保留題目表裡有的題，字數截短；沒遇過的題不留細節。 */
export function normalizeSurvey(input,topics){
 const src=input&&typeof input==='object'?input:{};
 const alias=str(src.alias).slice(0,20);
 const ids=new Set(topics.map(t=>t.topic_id));
 const answers=[];const seen=new Set();
 for(const a of Array.isArray(src.answers)?src.answers:[]){
  const id=Number(a?.topic_id);if(!ids.has(id)||seen.has(id))continue;seen.add(id);
  const exp=a.experienced===true;
  answers.push({topic_id:id,experienced:exp,last_time:exp?str(a.last_time).slice(0,60):'',cost:exp?str(a.cost).slice(0,60):'',workaround:exp?str(a.workaround).slice(0,60):'',willing:exp&&a.willing===true});
 }
 return {alias,answers};
}
export function checkSurvey(s){
 const errors=[];
 if(s.answers.some(a=>a.willing)&&!s.alias)errors.push('勾了「願意被同學訪談」就要填一個代稱，同學才找得到你（例：座號 12、小魚）');
 if(ALIAS_BAD.test(s.alias+' '+s.answers.map(a=>a.last_time+a.cost+a.workaround).join(' ')))errors.push('請不要填學號、電話或 Email');
 return {ok:errors.length===0,errors};
}
/** 全班彙總：每題幾人遇過、誰願意被問（只給代稱）。 */
export function surveySummary(topics,responses){
 return topics.filter(t=>t.active).sort((a,b)=>a.sort-b.sort).map(t=>{
  const rows=responses.filter(r=>r.topic_id===t.topic_id);
  const exp=rows.filter(r=>r.experienced);
  return {topic_id:t.topic_id,label:t.label,hint:t.hint,answered:rows.length,experienced:exp.length,willing:exp.filter(r=>r.willing&&r.alias).map(r=>r.alias)};
 });
}
