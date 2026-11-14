// 期末上台分兩場（Week 11 組碼前一半、Week 12 後一半，每組 10 分鐘）的規則：前端 teacher-final.js／teacher-rehearsal.js／week.html Week 11 用；Edge 只把上台講評轉給學生（team_load）。
// 2026-11-12 草案（待老師確認；改數字只改這裡）：總分 100 ＝ 組分 50 ＋ 個人分 50。
//  組分 50：五項各 0／5／10（老師打）。
//  個人分 50：上台自己那幾頁 0–30（老師打）＋ 個人完成度 20（電腦算：開 ≥2 箱 5、推薦 1 家 5、理由卡完成 5、Week 9＋10 課堂兩題 5）。
//  PDF 五段：只記「已交／遲交」，不另計分（遲交記在備註）。
// 分數存 teacher_remarks：組分存 week 12、student_id＝'TEAM'＋組碼，note 'FG1|g=10,5,10,0,5|pdf=1'；個人存 week 12、本人學號，note 'FG1|c=25'。
// 上台講評（兩場都存 week 11）：student_id＝'TEAM'＋組碼、week 11，note 'RH1|t=1|n=第1頁講評;第2頁講評;…'（六句，分號分隔，分號換成全形）。
export const GROUP_ITEMS=[
 ['① 一句話＋錢流','第 1–2 頁：10 秒內聽得出誰付錢給誰；收費有數字或估價；取代誰。0：沒有誰付錢給誰｜5：有，沒數字｜10：有名字、有數字、有取代誰'],
 ['② 為什麼是現在','第 3 頁：具體的那一個改變；募資／客戶數當押注證據，分清不是賺錢。0：「AI 很強」｜5：有變化但關係弱｜10：具體、有來源'],
 ['③ 為什麼不是另外兩家','第 4 頁：比較表三家同一把尺；落選兩家各 30 秒說輸在哪一問。0：各講各的｜5：有比較表沒講輸在哪｜10：同一把尺＋每家一句'],
 ['④ 風險與反方','第 5 頁：三種反方選最狠一刀；用證據回或老實說沒證據。0：沒反方｜5：有反方、回應是形容詞｜10：證據回或老實＋下一步'],
 ['⑤ 台灣同層＋整體','第 6 頁：台灣有沒有同一層、差在哪；一句學到什麼。整體：10 分鐘內、每個數字有來源標籤。0：空白｜5：一半｜10：都有'],
];
export const C_MAX=30;
export const PERSONAL_ITEMS=[['開 ≥2 箱',5],['推薦 1 家給組',5],['理由卡完成（3 來源＋一句話）',5],['Week 9＋10 課堂兩題',5]];
export const FINAL_PAGE_TITLES=['這家公司一句話','錢流與收費、以前誰在做','為什麼是現在','為什麼不是另外兩家','風險與反方最狠的一刀','台灣同層／我們學到什麼'];
export const teamKey=code=>'TEAM'+String(code||'').toUpperCase();
const scF=v=>[0,5,10].includes(Number(v))&&v!==''?Number(v):null;
export function parseGroup(note){const out={g:Array(GROUP_ITEMS.length).fill(null),pdf:false};const s=String(note||'').trim();if(!/^FG1\|/.test(s))return out;
 for(const part of s.split('|').slice(1)){const [k,v]=part.split('=');if(k==='g')(v||'').split(',').slice(0,GROUP_ITEMS.length).forEach((x,i)=>{out.g[i]=scF(x);});if(k==='pdf')out.pdf=v==='1';}return out;}
export const formatGroup=o=>`FG1|g=${o.g.map(x=>x===null?'':x).join(',')}|pdf=${o.pdf?1:0}`;
export function parsePersonal(note){const s=String(note||'').trim();const out={c:null};if(!/^FG1\|/.test(s))return out;for(const part of s.split('|').slice(1)){const [k,v]=part.split('=');if(k==='c'){const n=Number(v);out.c=v!==''&&Number.isInteger(n)&&n>=0&&n<=C_MAX?n:null;}}return out;}
export const formatPersonal=o=>`FG1|c=${o.c===null?'':o.c}`;
export const groupSum=o=>o.g.reduce((s,x)=>s+(x||0),0);
// 個人完成度（電腦算）：prog＝islands_progress.data；reps＝team_members.reps；classq9／classq10＝week_class_answers 有沒有兩題
export function personalCompletion({prog,reps,classq9,classq10}){
 const boxes=Object.values(prog?.boxes||{}).filter(b=>b?.opened).length;
 const repIds=Object.values(reps||{});const cardOk=repIds.some(cid=>{const cd=prog?.cards?.[cid];const url=prog?.boxes?.[cid]?.url;const n=[url,...(cd?.sources||[])].filter(Boolean).length;return n>=3&&!!cd?.why;});
 const items=[boxes>=2,repIds.length>=1,cardOk,!!(classq9&&classq10)];
 return {items,total:items.reduce((s,ok,i)=>s+(ok?PERSONAL_ITEMS[i][1]:0),0),boxes};
}
export const finalTotal=(group,personalC,completion)=>groupSum(group)+(personalC||0)+completion;
// 上台講評
export function parseRehearsal(note){const s=String(note||'').trim();const out={onTime:null,notes:Array(6).fill(''),general:''};if(!/^RH1\|/.test(s))return out;
 for(const part of s.split('|').slice(1)){const i=part.indexOf('=');const k=part.slice(0,i),v=part.slice(i+1);if(k==='t')out.onTime=v===''?null:v==='1';if(k==='n')v.split(';').slice(0,6).forEach((x,j)=>{out.notes[j]=x.replace(/／／/g,'|');});if(k==='x')out.general=v.replace(/／／/g,'|');}return out;}
const clean=s=>String(s||'').replace(/\r?\n/g,' ').replace(/[|]/g,'／／').replace(/;/g,'；').trim();
export const formatRehearsal=o=>`RH1|t=${o.onTime===null?'':o.onTime?1:0}|n=${o.notes.map(clean).join(';')}|x=${clean(o.general)}`;
export const rehearsalFilled=o=>o.notes.filter(Boolean).length;
