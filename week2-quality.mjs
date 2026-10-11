// 痛點品質引擎：學生端的三階完成度、老師端的 8 項分數，都從這裡算。
// 原則：只讀卡片既有欄位，不新增學生要填的問題；每一項都附一句「怎麼補」和一個可以跳過去的欄位。
// 規則刻意簡單、可預測 —— 學生要能看懂為什麼是 0 分，老師要能覆寫。
import {triageFields,depthFields,selectedIndex} from './week2-core.mjs';

export const QUALITY_VERSION='q-20261011a';
const S=v=>String(v??'').trim();
const PENDING=/^(待驗證|不確定|待確認|尚未|還沒|未知|無|沒有|-|—|\?|？)*$/;
const GENERIC_PERSON=/^(我|自己|我本人|本人|我自己|所有人|大家|每個人|人|學生|同學|大學生|消費者|使用者|用戶|客人|我們|我跟我朋友|我和朋友|同學還有我)$/;
const TIME=/(週|周|星期|禮拜|早上|中午|下午|晚上|凌晨|\d+\s*[:：點]|\d+\s*月|\d+\s*[日號]|昨[天晚]|前天|上次|上週|上個月|學期|開學|考前|期中|期末)/;
const PLACE=/(在|教室|餐廳|宿舍|家裡|家中|店|公園|學校|圖書館|捷運|公車|路上|公司|場次|超市|球場|咖啡廳|窗口|租屋)/;
const LOSS=/(\d+\s*(分鐘|分|小時|天|元|塊|次|餐|人|位|週|個)|拒絕|放棄|遲到|退選|錯過|沒吃|沒買|熬夜|請假|重做|被罵|白跑|多花|浪費|來不及)/;
const FREQ_HIGH=/(每天|每日|天天|每週|每周|每星期|一週\s*\d|週\s*\d+\s*次|周\s*\d+\s*次|每次|幾乎每|\d+\s*次)/;
const FREQ_LOW=/(每月|每個月|一個月|學期|偶爾|出國|假日|一次)/;
const GUESS=/(我猜|應該|可能|感覺|大概|很多人|大家都|一定會|我覺得)/;
const SEEN=/(親眼|看到|看見|當時|那天|那次|聽到|實際|親身|遇到)/;
export const SOLUTION_WORDS=/(app|ai\b|ＡＩ|一鍵|平台|系統|工具|網站|軟體|得來速|魔鏡|蓋一?個|開發|打造|推薦引擎|聊天機器人)/i;

export const ITEMS=[
 {key:'people',label:'具體的人',ask:'這是誰的痛？',stage:1},
 {key:'cost',label:'阻礙＋代價',ask:'上次損失了什麼？',stage:1},
 {key:'evidence',label:'親眼證據',ask:'你親眼看到的嗎？',stage:1},
 {key:'frequency',label:'重複發生',ask:'多常發生？',stage:2},
 {key:'workaround',label:'現有做法不夠',ask:'他們現在怎麼硬撐？',stage:2},
 {key:'solution',label:'是問題不是解法',ask:'問題裡有沒有藏著解法？',stage:2},
 {key:'context',label:'可觀察的情境',ask:'何時何地？',stage:3},
 {key:'interviewees',label:'找得到 3 個人',ask:'一週內問得到誰？',stage:3},
];

function pickOf(card){const i=Math.max(0,selectedIndex(card));return {i,c:(card.candidates||[])[i]||{}};}

/** 回傳 8 項，每項 {key,label,ask,stage,score,reason,fix,field} */
export function assess(card){
 const {i,c}=pickOf(card);
 const out=[];
 const add=(key,score,reason,fix,field)=>{const def=ITEMS.find(x=>x.key===key);out.push({...def,score,reason,fix,field});};

 // 1 具體的人
 const people=S(c.people);
 if(!people)add('people',0,'還沒寫受到影響的人。','寫一群人，不是你自己。',{cand:i,key:'people'});
 else if(GENERIC_PERSON.test(people.replace(/\s/g,'')))add('people',0,`「${people}」太籠統，別人找不到這群人。`,'改成「什麼情況下的哪種人」。',{cand:i,key:'people'});
 else if(people.length<6)add('people',1,`「${people}」可以更具體。`,'加上情況，例如「午休只有一小時的大二生」。',{cand:i,key:'people'});
 else add('people',2,'說得出是哪一群人。','',{cand:i,key:'people'});

 // 2 代價
 const cost=S(c.cost);
 if(!cost||PENDING.test(cost))add('cost',0,'還沒寫上次損失了什麼。','寫一個數字：多花幾分鐘／幾元，或放棄了什麼。',{depth:'cost'});
 else if(LOSS.test(cost))add('cost',2,'有具體的損失。','',{depth:'cost'});
 else add('cost',1,'有寫代價，但沒有數字或具體損失。','補上「上次多花了 __ 分鐘」或「放棄了 __」。',{depth:'cost'});

 // 3 證據
 const ev=S(c.evidence);
 if(!ev||PENDING.test(ev))add('evidence',0,'還沒寫親眼看到的事件。','寫最近一次：幾月幾日、在哪裡、看到誰發生什麼。',{depth:'evidence'});
 else if(GUESS.test(ev)&&!TIME.test(ev)&&!SEEN.test(ev))add('evidence',0,'這是猜測，不是事件。','改成一次真的發生過的事，有日期、地點。',{depth:'evidence'});
 else if(TIME.test(ev)||(SEEN.test(ev)&&PLACE.test(ev)))add('evidence',2,'有一次真實事件。','',{depth:'evidence'});
 else add('evidence',1,'像是事件，但沒有時間或地點。','加上「__月__日，在 __」。',{depth:'evidence'});

 // 4 頻率
 const fq=S(c.frequency);
 if(!fq||PENDING.test(fq))add('frequency',0,'還不知道多常發生。','訪談時問受訪者：最近一週發生幾次？',{cand:i,key:'frequency'});
 else if(FREQ_HIGH.test(fq))add('frequency',2,'每週以上。','',{cand:i,key:'frequency'});
 else if(FREQ_LOW.test(fq))add('frequency',1,'發生頻率偏低。','確認是不是每次發生都很痛，否則考慮換「誰」。',{cand:i,key:'frequency'});
 else add('frequency',1,'有寫，但看不出一週幾次。','改成「每週 __ 次」。',{cand:i,key:'frequency'});

 // 5 現有做法不夠
 const wa=S(c.workaround),ac=S(c.acceptance);
 const waOk=wa&&!PENDING.test(wa),acOk=ac&&!PENDING.test(ac);
 if(waOk&&acOk)add('workaround',2,'他們已經在硬撐，而且會抱怨。','',{depth:'workaround'});
 else if(waOk||acOk)add('workaround',1,waOk?'有現在的做法，但沒說為什麼不夠。':'有說不夠，但沒寫現在怎麼做。','兩格都要：現在怎麼做＋為什麼還是不滿意。',{depth:waOk?'acceptance':'workaround'});
 else add('workaround',0,'沒有人在處理這件事，可能根本不痛。','問受訪者：你現在怎麼應付？',{depth:'workaround'});

 // 6 是問題不是解法
 const textsCore=[c.problem,c.job,card.statement].map(S).join('｜');
 const textsAss=[c.assumption,card.reason].map(S).join('｜');
 if(SOLUTION_WORDS.test(textsCore))add('solution',0,`問題裡寫了解法（${(textsCore.match(SOLUTION_WORDS)||[''])[0]}）。`,'刪掉解法那幾個字，只留困擾本身。',{cand:i,key:SOLUTION_WORDS.test(S(c.problem))?'problem':SOLUTION_WORDS.test(S(c.job))?'job':'statement'});
 else if(SOLUTION_WORDS.test(textsAss))add('solution',1,'假設裡已經在想解法。','假設先寫「原因」，不寫「做什麼」。',{depth:'assumption'});
 else add('solution',2,'描述的是困擾，不是解法。','',{cand:i,key:'problem'});

 // 7 情境
 const ctx=S(c.context);
 const t=TIME.test(ctx),p=PLACE.test(ctx);
 if(!ctx)add('context',0,'還沒寫何時何地。','寫時間＋地點＋正在做什麼。',{cand:i,key:'context'});
 else if(t&&p)add('context',2,'有時間有地點。','',{cand:i,key:'context'});
 else add('context',1,t?'有時間，沒地點。':p?'有地點，沒時間。':'太籠統。','補成「週三 12:00，在 __」。',{cand:i,key:'context'});

 // 8 受訪者
 const ppl=(card.interviewees||[]).map(S).filter(Boolean);
 const distinct=new Set(ppl.map(x=>x.replace(/[\sA-Za-z0-9ａ-ｚＡ-Ｚ０-９１２３]/g,''))).size;
 if(ppl.length>=3&&distinct>=2)add('interviewees',2,'列出 3 位受訪者。','',{interviewee:0});
 else if(ppl.length>=1)add('interviewees',1,ppl.length<3?`只有 ${ppl.length} 位受訪者。`:'三位受訪者幾乎一樣。','補到 3 位，最好不同角色。',{interviewee:ppl.length<3?ppl.length:1});
 else add('interviewees',0,'還沒列受訪者。','寫 3 個真的能在一週內問到的人。',{interviewee:0});

 const total=out.reduce((s,x)=>s+x.score,0);
 return {items:out,total,version:QUALITY_VERSION};
}

/** 學生看的三階：0 還沒交／1 交了／2 能拿去問人了／3 老師說 OK。 */
export function completion(card,row){
 const a=assess(card);
 const gate=a.items.filter(x=>x.stage===1);
 const gateOk=gate.every(x=>x.score>=1)&&gate.reduce((s,x)=>s+x.score,0)>=5;
 // 「交了」看的是有沒有提交過（submitted_at 由資料庫保留），不是現在是不是草稿：
 // 學生提交後回來改、按一次儲存草稿，狀態會變 draft，第一格不該因此熄掉。
 const everSubmitted=!!(row&&(row.submitted_at||row.status==='submitted'));
 const approved=everSubmitted&&row?.status==='submitted'&&row?.review_status==='approved';
 const level=!everSubmitted?0:approved?3:gateOk?2:1;
 const unsentEdits=everSubmitted&&row?.status!=='submitted';
 const todo=gate.filter(x=>x.score<2).sort((p,q)=>p.score-q.score);
 const stage2=a.items.filter(x=>x.stage===2&&x.score<1);
 let next='';
 if(level===0)next='按「正式提交」就會亮第一格。';
 else if(level===1)next=todo.length?`離「能拿去問人了」差 ${todo.filter(x=>x.score===0).length||1} 件事：${todo[0].ask} —— ${todo[0].fix}`:'再存一次就會亮第二格。';
 else if(level===2)next=stage2.length?`訪談回來後補這 ${stage2.length} 件：${stage2.map(x=>x.ask).join('、')}。`:'等老師確認。';
 else next='老師已確認，可以準備 Week 3 訪談。';
 if(unsentEdits&&level>=1)next+='（你改過的內容還沒重新提交，記得按「正式提交」。）';
 return {level,labels:['還沒交','交了','能拿去問人了','老師說 OK'],next,todo,stage2,unsentEdits,assess:a};
}

/** 把「要改哪一格」換算成 .week2-question 的序號（和 missingTargets 同一套算法）。 */
export function questionIndex(card,field){
 if(!field)return -1;
 const n=(card.candidates||[]).length,base=n*triageFields.length;
 if(field.cand!==undefined&&field.key){const t=triageFields.findIndex(([k])=>k===field.key);if(t>=0)return field.cand*triageFields.length+t;if(field.key==='statement')return base+2;}
 if(field.key==='reason')return base;if(field.key==='reconsider')return base+1;if(field.key==='statement')return base+2;
 if(field.depth){const d=depthFields.findIndex(([k])=>k===field.depth);if(d>=0)return base+3+d;}
 const afterDepth=base+3+depthFields.length;
 if(field.interviewee!==undefined)return afterDepth+field.interviewee;
 if(field.question!==undefined)return afterDepth+3+field.question;
 return -1;
}

/** 可以點的選項：點一下就把文字放進那一格，學生再補空格。 */
export function chips(item,card){
 const {c}=pickOf(card);const ctx=S(c.context),prob=S(c.problem);
 const topic=/餐|午|吃|排隊/.test(ctx+prob)?'eat':/分組|組員|報告/.test(ctx+prob)?'group':/打工|排班|班表|上班/.test(ctx+prob)?'work':/穿|衣|搭/.test(ctx+prob)?'wear':/鬧鐘|起床|早八|睡/.test(ctx+prob)?'wake':/代購|購買|網購|買/.test(ctx+prob)?'buy':'';
 switch(item.key){
  case 'people':return ({eat:['午休只有一小時、下午還有課的學生','和朋友一起吃飯、常決定不了的大學生','在尖峰時段排隊的外帶客人'],group:['通識課不認識任何人的學生','分組報告裡負責收尾的組長','課表和打工時間都和別人不同的組員'],work:['排班不固定的兼職學生','要同時顧課表和班表的工讀生','常被臨時叫去代班的人'],wear:['每天通勤上課、衣服很多卻常搭不出來的學生','買了新衣不知道怎麼配的人','早上只有 20 分鐘準備出門的人'],wake:['熬夜後要上早八的大學生','住宿舍、鬧鐘會吵到室友的學生','一週遲到兩次以上的通勤學生'],buy:['常買國外商品、對價格敏感的年輕人','沒有海外信用卡的大學生','第一次找代購、怕被騙的人']}[topic]||['＿＿情況下的＿＿人（例：中午只有一小時的大二生）','常在＿＿（地點）遇到這件事的人','需要在＿＿（期限）前完成＿＿的人']).map(text=>({text,mode:'set'}));
  case 'cost':return ['上次多花了 __ 分鐘','上次因此放棄了 __','上次多花了 __ 元','上次來不及 __'].map(text=>({text,mode:'append'}));
  case 'evidence':return ['__月__日 __點，在 __，我親眼看到 __（誰）__（發生什麼）','上次是 __，我自己 __，結果 __'].map(text=>({text,mode:'append'}));
  case 'frequency':return ['每天','每週 2–3 次','每週 1 次','每月 1 次（偏低，訪談時確認）'].map(text=>({text,mode:'set'}));
  case 'workaround':return [{text:'目前先 __ 硬撐',mode:'append'},{text:'不夠是因為 __',mode:'append'}];
  case 'solution':return [{text:'刪掉「App／AI／一鍵／平台」這幾個字',mode:'strip'}];
  case 'context':return ['週__ __點，在 __，正在 __'].map(text=>({text,mode:'append'}));
  default:return [];
 }
}

/** 老師指路：可選的欄位清單（給下拉選單）。 */
export const TARGETS=ITEMS.map(x=>[x.key,x.label+'：'+x.ask]);
