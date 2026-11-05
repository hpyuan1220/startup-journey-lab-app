// 研究筆記 v2（期中報告）草稿：把 Week 4 研究頁＋Week 5 比較頁排進 v2 範本的九段（0–8）＋AI 使用紀錄。
// 純邏輯、只在瀏覽器用（Edge Function 不載入這個檔）。Word 下載沿用 week4-core 的 noteDraftHtml（第一段當標題、其他段當小標）。
import {normalizeWeek4,industryName,SOURCE_LABEL} from './week4-core.mjs?v=20261105-cq';
import {normalizeWeek5,totals,topChoice,parseRebuttal,FIVE_QUESTIONS,PAGE_TITLES,OPP_KEYS,MAX_SCORE} from './week5-core.mjs?v=20261104-rb';

const RB_LABEL={claude:'Claude',gpt:'ChatGPT',gemini:'Gemini',copilot:'Copilot',app:'app 內 AI 老闆'};
export function buildNoteDraftV2(w4in,w5in,studentId=''){
 const a=normalizeWeek4(w4in||{}),b=normalizeWeek5(w5in||{}),dash='（還沒填）';
 const ind=industryName(a)||'（還沒選產業線）';
 const t=totals(b),top=topChoice(b),key=b.choice.key||'';
 const rb=parseRebuttal(b.rebuttal.text);
 const oppLine=(k,n)=>`機會 ${k}：${b.opps[n]||a.card3.opps[n]||dash}`;
 const scoreBlock=OPP_KEYS.map((k,n)=>{
  if(!b.opps[n])return `機會 ${k}：（沒有這個機會）`;
  const rows=FIVE_QUESTIONS.map(q=>{const c=b.scores[k][q.key];return `　${q.n}. ${q.title}：${c.score===null?'—':c.score} 分｜${c.evidence||'（沒寫證據）'}`;});
  return `機會 ${k}（總分 ${t[k].sum}／${MAX_SCORE}${t[k].estimated?`，${t[k].estimated} 格是估計`:''}）\n${rows.join('\n')}`;
 }).join('\n');
 const choiceLine=key?`我選的是機會 ${key}${top&&key!==top?`（最高分是機會 ${top}）；理由：${b.choice.reason||'（還沒寫理由）'}`:'。'}`:'我選的是機會 ＿（還沒選）';
 const page=PAGE_TITLES.map((h,i)=>`${i+1}. ${h}\n${b.page[i]||dash}`).join('\n');
 const rbText=rb.rounds.length?rb.rounds.map(r=>`拒絕 ${r.n}：${r.reject}\n我的回應 ${r.n}：${r.reply||'（這一回合沒回）'}`).join('\n')+(rb.summary?`\n總結：${rb.summary}`:''):(b.rebuttal.text||dash);
 const tools=[...new Set([a.card1.source,a.card2.source,a.card3.source].filter(Boolean).map(s=>SOURCE_LABEL[s]||s))];
 const sec=[
  ['0　我的痛（Week 3 訪談後的一句話）',`${a.pain||dash}\n（改成：〔誰〕在〔什麼時候〕因為〔什麼〕而〔付出什麼代價〕。）`],
  ['1　產業一句話',`產業線：${ind}\n（自己寫一句：這一行是誰在賣什麼給誰；我的痛翻到業者那一面落在哪一段。）`],
  ['2　錢流（卡 1）',`${a.card1.text||dash}\n（來源：${SOURCE_LABEL[a.card1.source]||'未標'}。整理成「誰 → 付給誰 → 付什麼錢、大約多少」，數字寫（來源：XX）或「估計」。）`],
  ['3　三個挑戰（卡 2，每點附來源）',`${a.card2.text||dash}\n（來源：${SOURCE_LABEL[a.card2.source]||'未標'}。每個挑戰後面寫來源標題；AI 說的不算來源。下面列至少 5 個來源，標層級：1 政府統計／2 產業報告／3 近一年新聞／4 業者訪談／5 論壇。）`],
  ['4　三個機會（卡 3）',OPP_KEYS.map(oppLine).join('\n')],
  ['5　我還不確定的事',`${rb.summary?`反方總結：${rb.summary}\n`:''}（自己寫：哪一個主張還沒有來源？下一步要問誰、查什麼？反方說「最該補的一個證據」也寫在這裡。）`],
  ['6　五問計分表（Week 5）',`${scoreBlock}\n${choiceLine}`],
  ['7　為什麼這是好的商業痛點（一頁六段）',`${page}\n（每段一句主張、一個證據（來源：XX）、一個理論名；改成完整句子。）`],
  ['8　反方紀錄（Week 5）',`${b.rebuttal.source?`（反方：${RB_LABEL[b.rebuttal.source]||b.rebuttal.source}）\n`:''}${rbText}`],
  ['AI 使用紀錄',`研究頁用過：${tools.join('、')||'（沒標來源）'}${b.rebuttal.source?`；反方：${RB_LABEL[b.rebuttal.source]||b.rebuttal.source}`:''}\n（自己補：問了幾輪、哪一段是 AI 說的、哪一段是你查到的。AI 的回答不算來源；AI 幫你找到的來源才算。）`],
 ];
 const head=`產業研究筆記 v2（期中報告・草稿）${studentId?'｜'+studentId:''}\n產業線：${ind}　選定的機會：${key||'＿'}\n這份是 app 依你的 Week 4 研究頁＋Week 5 比較頁自動排的草稿：請改成自己的句子、每個主張補來源，存成 PDF，11/13 上課前交到 TronClass。`;
 return head+'\n\n'+sec.map(([h,x])=>`${h}\n${x}`).join('\n\n');
}

// ---- 2 分鐘期中口頭報告講稿（11/13 上台）：四段、用學生自己的資料先填，學生再改成自己的話 ----
const firstBit=(s,n=90)=>{const t=String(s||'').replace(/\s+/g,' ').trim();if(!t)return '';const cut=t.split(/(?<=[。！？])|\n/)[0]||t;const c2=cut.replace(/[。！？；，、\s]+$/,'');return (c2.length>n?c2.slice(0,n)+'…':c2);};
// 錢流那一句：卡 1 常是 Gemini 的長段（「第一步：痛點歸屬判斷…」），第一句不是錢流。
// 先找「有付錢動詞＋數字」的句子，再找只有付錢動詞的；都沒有就留空讓學生自己寫。去掉 markdown 和「1.」「第一行｜」「誰付錢給誰：」這類標頭。
const PAY=/付|支付|繳|抽成|佣金|月費|訂閱|收費|租金|分潤|手續費/;
const clean=s=>String(s||'').replace(/\*\*|##+|【貼回摘要】/g,'').replace(/^[\s*•\-–\d.、)）(（]+/,'').replace(/^(第[一二三四五]行|誰付錢給誰|錢流與頻次|金流與頻次)[｜|：:\s]*/,'').trim();
export function paySentence(text,n=80){
 const ss=String(text||'').split(/(?<=[。！？])|\n/).map(clean).filter(s=>s.length>=6&&!/^第[一二三]步/.test(s)&&!/[：:]$/.test(s)&&!/^補充/.test(s));
 const hit=ss.find(s=>PAY.test(s)&&/\d/.test(s))||ss.find(s=>PAY.test(s))||'';
 const c=hit.replace(/[。！？；，、\s]+$/,'');return c.length>n?c.slice(0,n)+'…':c;
}
export function challengeSentence(text,n=60){
 const ss=String(text||'').split(/(?<=[。！？])|\n/).map(x=>clean(noSource(x))).filter(x=>x.length>=4&&!/^第[一二三]步/.test(x)&&!/[：:]$/.test(x)&&!/請只根據|筆記本|來源中|資料不足|找不到|無法確認|沒有找到|這一段有多大|^針對|^回答|^我研究的是|^家數|^營業額|^從業|^誰在|^市場規模/.test(x));
 const hit=ss.find(x=>/困難|挑戰|不足|成本|流失|缺工|缺人|難以|風險|抽成|過重|過高/.test(x))||'';
 const c=hit.replace(/[。！？；，、\s]+$/,'');return c.length>n?c.slice(0,n)+'…':c;
}
const noSource=s=>String(s||'').replace(/[（(]\s*來源[：:][^）)]*[）)]/g,'').replace(/\*\*/g,'').trim();
export function buildTalkScript(w4in,w5in,studentId=''){
 const a=normalizeWeek4(w4in||{}),b=normalizeWeek5(w5in||{}),blank='〔＿＿＿〕';
 const ind=industryName(a)||blank,t=totals(b),top=topChoice(b),key=b.choice.key||top||'';
 const n=OPP_KEYS.indexOf(key),opp=key?(b.opps[n]||a.card3.opps[n]||blank):blank;
 let best=null;if(key)for(const q of FIVE_QUESTIONS){const c=b.scores[key][q.key];if(c.score!==null&&(!best||c.score>best.c.score))best={q,c};}
 const rb=parseRebuttal(b.rebuttal.text),round=rb.rounds.length?rb.rounds[rb.rounds.length-1]:null;
 const parts=[
  ['0:00–0:30　我的產業線和我的痛',`我研究的是「${ind}」。我的痛是：${firstBit(a.pain,60)||blank}。這個痛翻到業者那一面，落在這一行的${blank}。`],
  ['0:30–1:00　錢怎麼流、最大的一個挑戰',`錢是這樣流的：${paySentence(a.card1.text)||`${blank}（誰付錢給誰、付什麼錢、大約多少；不確定就說「估計」）`}。業者最大的挑戰是：${blank}（從卡 2 挑一個業者最常抱怨的困難，一句話）。`],
  ['1:00–1:40　我選的機會',key?`我選的是機會 ${key}：${firstBit(opp,70)||blank}。五問總分 ${t[key].sum}／${MAX_SCORE}${best?`，最強的是第 ${best.q.n} 問「${best.q.title}」：${firstBit(best.c.evidence,50)||blank}`:''}。${top&&key!==top?`我沒有選最高分的機會 ${top}，因為${firstBit(b.choice.reason,50)||blank}。`:''}${/付錢/.test(opp)?'':`第一個會付錢的人是${blank}。`}`:`我選的是機會${blank}：${blank}。（比較頁還沒選，先回 Week 5 打分、選一個。）`],
  ['1:40–2:00　老闆最狠的反對，我怎麼回',round?`老闆說：「${firstBit(round.reject,50)}」我的回應是：${firstBit(round.reply,60)||blank}。${rb.summary?`下一步我要補的證據是：${firstBit(rb.summary,40)}。`:''}`:`老闆說：「${blank}」我的回應是：${blank}。（比較頁的反方還沒做。）`],
 ];
 const body=parts.map(([h,x])=>`【${h}】\n${x}`).join('\n\n');
 return `2 分鐘期中報告講稿（草稿）${studentId?'｜'+studentId:''}\n11/13 上台。唸一遍計時：中文 2 分鐘大約 450 字，超過就刪；每段只留一個數字。〔＿＿＿〕是要你自己補的地方。\n\n${body}`;
}
export const talkChars=s=>String(s||'').split('\n\n').slice(1).join('').replace(/【[^】]*】|\s/g,'').length;
