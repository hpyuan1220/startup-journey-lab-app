// Week 1 rubric regression check. Synthetic cards only — no student data, ever.
// Dry run by default (no model call, no cost): node scripts/eval-week1-rubric.mjs
// Live check (5 model calls): OPENAI_API_KEY=... node scripts/eval-week1-rubric.mjs --run
import fs from 'node:fs/promises';
import {SYSTEM_PROMPT,PROMPT_VERSION,FEEDBACK_SCHEMA,buildUserContent} from '../supabase/functions/ai-feedback/validate.ts';

// 每張卡都是為了測一條 rubric 規則而寫的合成範例，不是任何學生的作答。
export const cases=[
 {id:'strong',why:'完整卡：有時間地點、可查證數字、標示假設、行動寫出對象與數量',
  fields:{observed_problem:'星期二中午十二點十分，我在第二餐廳外排隊十九分鐘，回教室時已經遲到五分鐘。',
   affected_user:'中午只有五十分鐘、下午第一堂在另一棟大樓上課的大二學生。',
   known_fact:'我連續三週在十二點十分到場計時，分別等了十九、二十二與十八分鐘。',
   unverified_assumption:'我猜測等待久不只是人多，也可能和付款流程有關，這點還需要確認。',
   expected_learning:'學會用訪談確認別人是否也遇到同樣情況。',
   concern:'擔心只有我特別趕，其他人其實沒感覺。'},
  expect:{next_validation_step:[0,2],fact_assumption_separation:[3,4],problem_specificity:[3,4],total:[11,20]},
  note:'行動只寫在 expected_learning，對象與問題未明確，因此 next_validation_step 不應給高分'},
 {id:'blank-help',why:'學生卡住求救：所有欄位都是「不知道」與願望，不得有同情分',
  fields:{observed_problem:'有時候很不方便 有時候又還可以 有時候會忘記',
   affected_user:'受影響的人是誰',
   known_fact:'我也不知道要寫什麼',
   unverified_assumption:'希望有人可以告訴我怎麼寫',
   expected_learning:'想看看別人怎麼做',
   concern:'擔心我寫的東西沒有用'},
  expect:{problem_specificity:[0,0],affected_user_clarity:[0,0],fact_quality:[0,0],fact_assumption_separation:[0,0],next_validation_step:[0,0],total:[0,0]},
  note:'最容易被送分的一張；next_validation_step 必須是 0'},
 {id:'no-action',why:'問題與對象都還可以，但整張卡沒有任何行動動詞',
  fields:{observed_problem:'買了褲子穿起來太鬆或太緊，花了錢卻沒有買到合身的。',
   affected_user:'腰臀比例落差較大、常買不到合身長褲的人。',
   known_fact:'我去過的三家店都只有標示腰圍，沒有標示臀圍。',
   unverified_assumption:'是不是因為打版成本比較高，店家才不願意做。',
   expected_learning:'學會挑到合身的版型。',
   concern:'擔心又買到不能搭的。'},
  expect:{next_validation_step:[0,0],problem_specificity:[2,4],affected_user_clarity:[3,4]},
  note:'核心修正一：沒有行動句就是 0，且 reason 不得描述不存在的訪談計畫'},
 {id:'causal-fact',why:'事實欄自己就是因果推論，假設欄只是換句話說同一個因果',
  fields:{observed_problem:'午餐選擇太多，最後隨便決定。',
   affected_user:'同學還有我',
   known_fact:'因為沒辦法決定，所以就選了最近的那間或乾脆去便利商店。',
   unverified_assumption:'因為選擇太多，所以遲遲無法決定。',
   expected_learning:'學會更快做決定。',
   concern:'擔心做決定時忽略成本。'},
  expect:{fact_assumption_separation:[0,1],next_validation_step:[0,0],affected_user_clarity:[0,1]},
  note:'核心修正二：事實欄含因果字＋兩欄重複，分開度最高 1'},
 {id:'mismatch',why:'問題講查詢流程，受影響對象卻是另一個問題的人',
  fields:{observed_problem:'訂票網站要先點進每一部片才看得到場次時間。',
   affected_user:'不知道自己想看什麼片的人。',
   known_fact:'我看過的幾個網站都沒有一次列出全部場次。',
   unverified_assumption:'如果要填問卷才有推薦，會有人願意花時間填嗎。',
   expected_learning:'學會設計問卷。',
   concern:'擔心問題太多沒人想填。'},
  expect:{affected_user_clarity:[0,1],next_validation_step:[0,0]},
  note:'核心修正三：跨欄位不一致，受影響對象最高 1'},
];

const DIMS=['problem_specificity','affected_user_clarity','fact_quality','fact_assumption_separation','next_validation_step'];
const FALSE_PLAN=/訪談計畫|可執行的(訪談|觀察)(行動|計畫)|已有(可執行|明確)的/;
const MODEL=process.env.OPENAI_MODEL||'gpt-4o-mini';

function judge(c,fb){
 const out=[],r=fb?.readiness;
 if(!r)return [{ok:false,what:'structure',detail:'模型未回傳 readiness'}];
 for(const[k,[lo,hi]]of Object.entries(c.expect)){
  const got=k==='total'?r.total_readiness:r[k]?.score;
  out.push({ok:typeof got==='number'&&got>=lo&&got<=hi,what:k,detail:`期望 ${lo}-${hi}，得到 ${got}`});
 }
 const sum=DIMS.reduce((a,k)=>a+(r[k]?.score??NaN),0);
 out.push({ok:sum===r.total_readiness,what:'total=sum',detail:`${sum} vs ${r.total_readiness}`});
 if(r.next_validation_step?.score===0)out.push({ok:!FALSE_PLAN.test(r.next_validation_step.reason||''),what:'no-false-plan',detail:r.next_validation_step.reason||''});
 return out;
}

// 被測試 import 時不執行 CLI，只匯出 cases。
const isMain=import.meta.main??/eval-week1-rubric\.mjs$/.test(process.argv[1]||'');
if(!isMain){/* imported */}
else if(!process.argv.includes('--run')){
 console.log(JSON.stringify({mode:'dry-run',prompt_version:PROMPT_VERSION,model:MODEL,cases:cases.length,maxCalls:cases.length,
  checks:cases.map(c=>({id:c.id,expect:c.expect,note:c.note})),note:'尚未呼叫模型，尚無品質結論。加 --run 才會真的評分。'},null,2));
 process.exit(0);
}
else if(!process.env.OPENAI_API_KEY)throw Error('缺少 OPENAI_API_KEY；只在本機環境變數設定，不要貼到聊天或 Git。');

else{
const results=[];
for(const c of cases){
 const body={model:MODEL,temperature:0,messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:buildUserContent(c.fields)}],
  response_format:{type:'json_schema',json_schema:{name:'week1_feedback',strict:true,schema:FEEDBACK_SCHEMA}}};
 let fb=null,http=0;
 try{
  const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  http=res.status;const j=await res.json();try{fb=JSON.parse(j.choices?.[0]?.message?.content||'null');}catch{}
 }catch{}
 const checks=judge(c,fb),failed=checks.filter(x=>!x.ok);
 results.push({id:c.id,why:c.why,http,scores:fb?.readiness?Object.fromEntries(DIMS.map(k=>[k,fb.readiness[k]?.score])):null,total:fb?.readiness?.total_readiness??null,checks,passed:failed.length===0,reasons:fb?.readiness?Object.fromEntries(DIMS.map(k=>[k,fb.readiness[k]?.reason])):null});
 console.log(`${failed.length?'✗':'✓'} ${c.id}${failed.length?' — '+failed.map(f=>f.what+'（'+f.detail+'）').join('；'):''}`);
}
await fs.mkdir('.build',{recursive:true});
await fs.writeFile('.build/week1-rubric-eval.json',JSON.stringify({prompt_version:PROMPT_VERSION,model:MODEL,at:new Date().toISOString(),results},null,2));
const pass=results.filter(r=>r.passed).length;
console.log(`\n${pass}/${results.length} 張合成卡符合預期（prompt ${PROMPT_VERSION}, model ${MODEL}）。明細：.build/week1-rubric-eval.json`);
console.log(pass===results.length?'rubric 行為符合預期，但這只是五張合成卡，不代表全班都會正確。':'rubric 尚未達標，請看上面失敗項再調 SYSTEM_PROMPT。');
process.exitCode=pass===results.length?0:1;
}
