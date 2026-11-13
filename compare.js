import {COMPARE_QUESTIONS,COUNTER_KINDS,MAX_COMPARE,PAGES,emptyCompare,normalizeCompare,compareTotals,topCompany,pickNeedsReason,pickOk,compareProgress,buildFramework} from './compare-core.mjs?v=20261112-fix';
import {COMPANY_NAME,normalizeReps,teamReps,companyDir} from './islands-core.mjs?v=20261112-w10';
import {DIRECTIONS,normalizeDirections} from './team-core.mjs?v=20261106-tm';
import {COMPANIES,companyById} from './islands-data.mjs?v=20261111-art';
import {buildDeckSpec,makePptx} from './final-pptx.mjs?v=20261113-ppt';
// Week 10 頁：比較表（三家 × 五問，每格 0／1／2＋一句證據）→ 選定一家 → 反方三格 → 期末框架（六頁＋每人講稿）。
// 一組一份，存 teams.compare（team_compare_save）；任一組員可改，存檔後全組看到同一份。證據可以從理由卡一鍵帶入。
const WEEK=new URLSearchParams(location.search).get('week');
const root=document.querySelector('[data-compare]');
if(root&&WEEK==='10'){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session=null;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`連線失敗 ${r.status}`);return b;}
const dirShort=d=>DIRECTIONS.find(x=>x[0]===Number(d))?.[1].split('｜')[0]||'';
const sec=el('section','',root,'w4 cmp');el('p','WEEK 10 · 比較表',sec,'eyebrow');el('h2','三家比一比，選一家上台',sec);
const status=el('p','',sec,'w4-status');status.setAttribute('role','status');const body=el('div','',sec);
let T=null,d=emptyCompare(),allowed=[],dirty=false,saving=false;
async function load(){if(!session?.token){el('p','先用學號和邀請碼進入，再回來比較。',body,'w4-hint');return;}status.textContent='載入中…';try{T=await api({action:'team_load'});apply();status.textContent='';}catch(e){status.textContent=e.message;}}
function apply(){const reps=teamReps(T.members);allowed=[1,2,3].map(k=>reps[k]?.company).filter(Boolean);d=normalizeCompare(T.team?.compare||{},allowed);render();}
async function save(){if(saving)return;saving=true;status.textContent='存檔中…';try{T=await api({action:'team_compare_save',compare:d});dirty=false;apply();status.textContent='已存，全組看到同一份。';}catch(e){status.textContent=e.message;}finally{saving=false;}}
let timer=null;const queue=()=>{dirty=true;clearTimeout(timer);timer=setTimeout(save,900);};
function render(){body.replaceChildren();
 if(!T?.team){el('p','有組之後才有比較表：先到 Week 9 頁建組或加入。',body,'w4-hint');return;}
 const reps=teamReps(T.members);const names=T.names||{};const repOwner=cid=>T.members.find(m=>Object.values(normalizeReps(m.reps)).includes(cid));
 // 三家
 const top=el('div','',body,'cmp-top');el('h3',`${T.team.name}：我們組要比的三家`,top);
 const row=el('div','',top,'tm-rep-grid');for(const k of [1,2,3]){const r=reps[k];const c=el('div','',row,'tm-rep');el('small',dirShort(k),c);if(r){el('b',COMPANY_NAME[r.company]||r.company,c);el('span','由 '+(names[r.student_id]||r.student_id)+' 推薦',c,'w4-hint');c.dataset.state='done';}else{el('b','還沒推薦',c,'tm-rep-empty');el('span','到群島情報袋按「推薦給我的組」',c,'w4-hint');c.dataset.state='todo';}}
 if(allowed.length<2){el('p','至少要兩家才比得起來。缺的方向先回群島開一箱、推薦。',top,'callout');}
 if(!allowed.length)return;
 // 比較表
 const tb=el('div','',body,'cmp-block');el('h3','① 比較表：每格 0／1／2 ＋ 一句證據（研究那家的人打那家的分，其他人質疑）',tb);
 const wrap=el('div','',tb,'tw4-wrap');const table=el('table','',wrap,'tm-table cmp-table');const thead=el('tr','',el('thead','',table));el('th','五問',thead);for(const cid of allowed)el('th',COMPANY_NAME[cid]||cid,thead);
 const tbody=el('tbody','',table);
 for(const q of COMPARE_QUESTIONS){const tr=el('tr','',tbody);const th=el('td','',tr,'cmp-q');el('b',q.title,th);el('small',q.hint,th);el('small',q.rubric,th,'cmp-rubric');
  for(const cid of allowed){const td=el('td','',tr);const cell=(d.scores[cid]||={})[q.key]||={score:null,evidence:''};
   const seg=el('div','',td,'cmp-seg');for(const v of [0,1,2]){const b=el('button',String(v),seg,'cmp-s');b.type='button';b.setAttribute('aria-pressed',String(cell.score===v));b.addEventListener('click',()=>{cell.score=cell.score===v?null:v;render();queue();});}
   const ta=el('textarea','',td,'cmp-ev');ta.rows=2;ta.maxLength=300;ta.placeholder='一句證據（來源：XX）';ta.value=cell.evidence||'';ta.setAttribute('aria-label',`${COMPANY_NAME[cid]||cid} ${q.title} 證據`);ta.addEventListener('input',()=>{cell.evidence=ta.value;queue();});
   if(cell.score!=null&&!cell.evidence)td.classList.add('cmp-warn');
   // 從理由卡帶入
   const o=repOwner(cid);const card=o?T.cards?.[o.student_id]?.[cid]:null;const c=companyById(cid);
   const seedText=(()=>{if(!c)return '';const g=k=>c.card.find(([kk])=>kk===k)?.[1]||'';switch(q.key){case 'q1':return g('誰付錢')+(g('數字')?'；'+g('數字'):'');case 'q2':return g('怎麼收費')+(card?.est?'｜我們的估價：'+card.est:'');case 'q3':return g('為什麼是現在');case 'q4':return g('以前誰在做')+'；風險：'+g('風險');case 'q5':return g('台灣同層');}return '';})();
   if(seedText&&!cell.evidence){const sb=el('button','從理由卡帶入',td,'button-link w4-small');sb.type='button';sb.addEventListener('click',()=>{cell.evidence=seedText.slice(0,300);render();queue();});}
  }}
 const t=compareTotals(d);const tr=el('tr','',tbody,'cmp-total');el('td','總分（參考）',tr);const topId=topCompany(d);for(const cid of allowed){const td=el('td',`${t[cid]?.sum??0}／${MAX_COMPARE}${t[cid]?.complete?'':'（還沒打滿）'}`,tr);if(cid===topId)td.classList.add('cmp-top-cell');}
 // 選定
 const pk=el('div','',body,'cmp-block');el('h3','② 選定一家上台（另外兩家變成第 4 頁「為什麼不是它們」）',pk);
 const opts=el('div','',pk,'cmp-pick');for(const cid of allowed){const b=el('button',(d.pick.company===cid?'✓ ':'')+(COMPANY_NAME[cid]||cid)+(cid===topId?'（最高分）':''),opts,'cmp-s');b.type='button';b.setAttribute('aria-pressed',String(d.pick.company===cid));b.addEventListener('click',()=>{d.pick.company=d.pick.company===cid?'':cid;d.pick.at='';render();queue();});}
 if(pickNeedsReason(d)){const l=el('label','選的不是最高分：五問哪一題沒量到？（至少 20 字）',pk);l.htmlFor='cmp-reason';const ta=el('textarea','',pk);ta.id='cmp-reason';ta.rows=2;ta.maxLength=600;ta.value=d.pick.reason;ta.placeholder='例：組裡有人家裡做物流，接觸得到真人，期末可以訪談——Aulet 的「符合團隊」五問沒這一格。';ta.addEventListener('input',()=>{d.pick.reason=ta.value;queue();});}
 // 反方
 const ct=el('div','',body,'cmp-block');el('h3','③ 反方三格：大廠／客戶／技術各一刀，選最狠的一刀放第 5 頁',ct);
 for(const [k,label,desc] of COUNTER_KINDS){const box=el('div','',ct,'cmp-counter');const h=el('div','',box,'w4-row');const ch=el('button',(d.counters.chosen===k?'✓ 最狠的一刀：':'')+label,h,'cmp-s');ch.type='button';ch.setAttribute('aria-pressed',String(d.counters.chosen===k));ch.addEventListener('click',()=>{d.counters.chosen=d.counters.chosen===k?'':k;render();queue();});el('span',desc,h,'w4-hint');
  const ta=el('textarea','',box,'cmp-ev');ta.rows=2;ta.maxLength=300;ta.placeholder='它會怎麼砍、你們怎麼回（用證據，或老實說沒證據要查什麼）';ta.value=d.counters[k];ta.setAttribute('aria-label',label);ta.addEventListener('input',()=>{d.counters[k]=ta.value;queue();});}
 // 狀態
 const p=compareProgress(d,allowed);const st=el('div','',body,'w4-done');st.dataset.state=p.done?'done':'todo';el('p',p.done?'✅ 比較表完成：選定、反方都有了。':'還沒完成：',st,'w4-done-title');if(!p.done){const ul=el('ul','',st);for(const m of p.missing)el('li',m,ul);}
 // 期末框架
 const fw=el('div','',body,'cmp-block');el('h3','④ 期末框架：六頁＋每人講稿草稿（選定之後生成，改成自己的話）',fw);
 const f=buildFramework(d,T.members.map(m=>({student_id:m.student_id,reps:normalizeReps(m.reps),directions:normalizeDirections(m.directions)})),names,T.cards||{},cid=>companyById(cid));
 if(!f){el('p','先在 ② 選定一家，框架會自動出現。',fw,'w4-hint');}
 else{
  el('p',`選定：${f.name}。研究它的人（${names[f.owner]||f.owner}）講前三頁，另外兩人講後三頁；每頁 60 秒，每人至少 2 頁。`,fw,'w4-hint');
  const pg=el('ol','',fw,'cmp-pages');for(const page of f.pages){const li=el('li','',pg);el('b',`第 ${page.n} 頁　${page.title}`,li);el('small','　講：'+String(page.speaker).split('、').map(s=>names[s]||s).filter(Boolean).join('、'),li);el('p',page.body,li,'cmp-page-body');el('small',PAGES[page.n-1][1],li,'w4-hint');}
  const me=session.student_id;const mine=f.scripts[me];const scb=el('div','',fw,'cmp-script');el('h4','我的講稿草稿（'+(names[me]||me)+'）',scb);const pre=el('pre',mine||'（還沒分到頁）',scb);
  const row=el('div','',fw,'w4-row');const msg=el('span','',row,'w4-hint');
  const cp=el('button','複製我的講稿',row,'primary');cp.type='button';cp.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(mine||'');msg.textContent='已複製。';}catch{msg.textContent='複製失敗，請手動選取。';}});
  const ppt=el('button','下載六頁 PPT 初稿（講稿在備忘稿）',row,'quiet');ppt.type='button';ppt.addEventListener('click',async()=>{if(ppt.disabled)return;ppt.disabled=true;msg.textContent='正在做 PPT…';try{const file=await makePptx(buildDeckSpec(f,T.team,T.members,names));msg.textContent=`已下載 ${file}：先改成自己的話，再補數字與來源。`;}catch(e){msg.textContent='PPT 元件載不進來（網路或被擋）：改按「複製整份框架」貼進 PowerPoint／Google 簡報。';}finally{ppt.disabled=false;}});
  const all=el('button','複製整份框架（六頁＋三人講稿＋PDF 五段）',row,'quiet');all.type='button';all.addEventListener('click',async()=>{const txt=[`${T.team.name}｜期末：${f.name}`,'',...f.pages.map(p=>`第 ${p.n} 頁 ${p.title}（講：${String(p.speaker).split('、').map(s=>names[s]||s).join('、')}）\n${p.body}`),'','— 每人講稿 —',...T.members.map(m=>`【${names[m.student_id]||m.student_id}】\n${f.scripts[m.student_id]}`),'','— PDF 五段 —',...f.pdf].join('\n\n');try{await navigator.clipboard.writeText(txt);msg.textContent='已複製整份。';}catch{msg.textContent='複製失敗。';}});
 }
}
load();
}
