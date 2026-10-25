import {resolveQuestions,attendance,stampLabel,classDate,CLASS_SCHEDULE,DEFAULT_QUESTIONS} from './week4-core.mjs?v=20261025-ctx';
import {normalizeWeek5,totals,topChoice,choiceNeedsReason,parseRebuttal,week5Progress,OPP_KEYS,FIVE_QUESTIONS,MAX_SCORE} from './week5-core.mjs?v=20261025-w5';
import {remarkEditor,findRemark,mergeRemarks,remarkText,listenRemarks,suggestTagResearch,freezeSuggestions} from './teacher-remarks.mjs?v=20261025-w5';
// 教師洞察 · Week 5 三個機會比一比
// 一人一列：出席、兩題、三個機會的總分、選了哪個（非最高分有沒有理由）、反方幾回合、一頁幾段、證據裡「估計」幾格。
// 本週放最上面：插在狀態列後面（teacher-week4 之後載入，所以會排在它前面）。
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const root=document.createElement('section');root.id='teacher-week5';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
const el=(tag,text,parent=root,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
el('h2','Week 5 三個機會比一比：出席、計分、選擇、反方、一頁',root);
el('p','出席規則同 Week 4：課堂兩題在上課日 13:30–18:00 內存檔＝出席。老師看的是證據不是分數：「估計」欄是學生自己標估計或沒寫證據的格數；選了非最高分的人，列上會標「非最高分」，點開看理由。',root,'tw2-intro');
const status=el('p','',root);status.setAttribute('role','status');
const reloadBtn=el('button','重新載入 Week 5',root,'quiet');reloadBtn.type='button';
const body=el('div','',root);
let data=null,open=new Set(),week=5;
listenRemarks(()=>data,()=>load());
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入 Week 5…';try{data=await call({action:'teacher_load'});render();}catch(e){status.textContent=e.message;}}
reloadBtn.addEventListener('click',load);
const fmt=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;};
function stampCell(td,iso){if(!iso){td.textContent='—';td.className='';return;}const l=stampLabel(iso);const s=document.createElement('span');s.className=l?.kind==='in'?'tw4-in':'tw4-out';s.textContent=fmt(iso)+(l?.kind==='in'?' 課中':' 課後');td.replaceChildren(s);}
function render(){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w5=(data.week5||[]).filter(r=>r.class_id===c.id);
  const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...w5.map(r=>r.student_id)])];
  const nameOf=id=>w1.find(r=>r.student_id===id)?.student_name||roster.find(r=>r.student_id===id)?.student_name||'';
  const qrow=(data.week_questions||[]).find(r=>r.class_id===c.id&&r.week===week);
  const q=resolveQuestions(week,qrow);
  // 本週兩題
  const qbox=el('div','',sec,'tw4-q');
  const qh=el('div','',qbox);qh.style.gridColumn='1 / -1';el('b',`Week ${week} 課堂兩題（上課日 ${classDate(week)||''} ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end}）· 隨時可改，學生下次載入就換題；留白＝用預設`,qh);
  const mk=(label,val,ph)=>{el('div',label,qbox).style.fontWeight='700';const i=el('input','',qbox);i.type='text';i.value=val;i.placeholder=ph;return i;};
  const q1=mk('Q1',qrow?.q1||'',(DEFAULT_QUESTIONS[week]||{}).q1||'通用題');
  const q2=mk('Q2',qrow?.q2||'',(DEFAULT_QUESTIONS[week]||{}).q2||'通用題');
  const pts=mk('重點',qrow?.points||'',(DEFAULT_QUESTIONS[week]||{}).points||'（給 AI 評語用，選填）');
  const act=el('div','',qbox);act.style.gridColumn='1 / -1';act.style.display='flex';act.style.gap='8px';
  const saveQ=el('button','儲存兩題',act,'primary');saveQ.type='button';const resetQ=el('button','回到預設',act,'quiet');resetQ.type='button';
  const nowQ=el('p',`學生目前看到：Q1「${q.q1}」　Q2「${q.q2}」`,qbox);nowQ.style.gridColumn='1 / -1';nowQ.style.fontSize='.85rem';nowQ.style.color='#6e4a08';
  saveQ.addEventListener('click',async()=>{try{await call({action:'teacher_week_questions',class_id:c.id,week,questions:{q1:q1.value,q2:q2.value,points:pts.value}});status.textContent='兩題已更新。';await load();}catch(e){status.textContent=e.message;}});
  resetQ.addEventListener('click',async()=>{try{await call({action:'teacher_week_questions',class_id:c.id,week,questions:{}});status.textContent='已回到預設題。';await load();}catch(e){status.textContent=e.message;}});
  // 每人一列的數字
  const rows=ids.map(id=>{const r=w5.find(x=>x.student_id===id);const d=r?normalizeWeek5(r.data):null;const st=r?.stamps||{};const present=attendance(st,week);const p=d?week5Progress(d):null;const t=d?totals(d):null;
   const parts=d?[p.scoredAll,!!p.choice&&p.choiceOk,p.rounds>=1,p.pageN>=6].filter(Boolean).length:0;
   const est=d?OPP_KEYS.reduce((n,k)=>n+t[k].estimated,0):0;
   return {id,name:nameOf(id),r,d,st,present,q1:!!st.q1,q2:!!st.q2,p,t,parts,est,top:d?topChoice(d):'',suggested:suggestTagResearch(week,{present,cards:parts>=4?3:parts>=2?1:0,answered:!!(st.q1&&st.q2),what:'計分、選、反方、一頁都做完',unit:'段'})};});
  const live=el('div','',sec,'tw4-live');
  const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(`${rows.filter(x=>x.present).length} / ${rows.length}`,'出席（兩題課中答完）');
  stat(rows.filter(x=>x.p&&x.p.scoredAll).length,'計分表打完');
  stat(rows.filter(x=>x.p&&x.p.choice).length,'選了一個');
  stat(rows.filter(x=>x.p&&x.p.choice&&x.p.choice!==x.top).length,'選非最高分');
  stat(rows.filter(x=>x.p&&x.p.rounds>=3).length,'反方三回合');
  stat(rows.filter(x=>x.p&&x.p.pageN>=6).length,'一頁六段寫完');
  // 把本週推算存成標記（只填還沒點的）
  const fz=el('div','',sec);fz.className='tw4-freeze';
  const fzBtn=el('button','把本週推算存成標記（只填還沒點的）',fz,'quiet');fzBtn.type='button';
  const fzMsg=el('span','',fz);fzMsg.className='tw4-freeze-msg';
  const pending=rows.filter(x=>!findRemark(data.remarks,c.id,x.id,week)?.tag&&x.suggested);
  fzMsg.textContent=`推算：出席＋四段都做完（計分、選、反方、一頁）＝積極、出席＝普通、沒出席但有做＝沒參與、沒紀錄＝缺席。還沒點的 ${pending.length} 人。`;
  fzBtn.disabled=!pending.length;
  fzBtn.addEventListener('click',async()=>{fzBtn.disabled=true;const items=pending.map(x=>({classId:c.id,studentId:x.id,week,tag:x.suggested.tag,note:findRemark(data.remarks,c.id,x.id,week)?.note||''}));
   const r=await freezeSuggestions(items,call,(d,f,t)=>{fzMsg.textContent=`存檔中 ${d+f}/${t}…`;});
   fzMsg.textContent=`已存 ${r.done} 人${r.failed?`，失敗 ${r.failed} 人`:''}。`;await load();});
  // 一人一列
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const thead=el('thead','',table);const tr=el('tr','',thead);
  for(const h of ['學生','出席','老師備註（學生看不到）','A／B／C 總分','選','估計格','反方','一頁','Q1','Q2'])el('th',h,tr);
  const tbody=el('tbody','',table);
  rows.sort((a,b)=>Number(a.present)-Number(b.present)||Number(!!a.r)-Number(!!b.r)||a.id.localeCompare(b.id));
  for(const x of rows){
   const r=el('tr','',tbody);
   const idTd=el('td','',r);const btn=el('button',x.id+(x.name?`　${x.name}`:''),idTd,'quiet');btn.type='button';btn.style.padding='2px 6px';
   const att=el('td','',r);el('span',x.present?'出席':'缺席',att,x.present?'tw4-in':'tw4-out');
   const rk=el('td','',r);rk.className='tw4-remark';remarkEditor(rk,{classId:c.id,studentId:x.id,week,current:findRemark(data.remarks,c.id,x.id,week),call,compact:true,suggested:x.suggested,onSaved:rows=>mergeRemarks(data,c.id,x.id,rows)});
   el('td',x.t?OPP_KEYS.map(k=>`${k} ${x.t[k].scored?x.t[k].sum:'—'}`).join(' · '):'—',r);
   const ch=el('td','',r);if(x.p&&x.p.choice){ch.textContent=x.p.choice;if(x.p.choice!==x.top){const s=el('span',x.p.choiceOk?' 非最高分（有理由）':' 非最高分（沒理由）',ch,x.p.choiceOk?'tw4-out':'tw4-no');}}else ch.textContent='—';
   el('td',x.d?String(x.est):'—',r);
   el('td',x.p?`${x.p.rounds}/3`:'—',r);
   el('td',x.p?`${x.p.pageN}/6`:'—',r);
   for(const k of ['q1','q2']){const td=el('td','',r);if(x.st[k])stampCell(td,x.st[k]);else{td.textContent='未答';td.className='tw4-no';}}
   btn.addEventListener('click',()=>{if(open.has(x.id))open.delete(x.id);else open.add(x.id);render();});
   if(open.has(x.id)&&x.d){
    const dr=el('tr','',tbody);const td=el('td','',dr);td.colSpan=10;const box=el('div','',td,'tw4-detail');
    const prior=[1,2,3,4].map(wk=>({wk,t:remarkText(findRemark(data.remarks,c.id,x.id,wk))})).filter(o=>o.t);
    if(prior.length){const p=el('p','',box);const b=document.createElement('b');b.textContent='前幾週備註：';p.append(b,prior.map(o=>`W${o.wk} ${o.t}`).join('　'));}
    const line=(label,v)=>{if(!v)return;const p=el('p','',box);const b=document.createElement('b');b.textContent=label+'：';p.append(b,v);};
    line('Q1',x.d.q1);if(x.d.q1_ai)line('Q1 AI 評語',x.d.q1_ai);line('Q2',x.d.q2);if(x.d.q2_ai)line('Q2 AI 評語',x.d.q2_ai);
    line('三個機會',x.d.opps.map((o,i)=>o?OPP_KEYS[i]+' '+o:'').filter(Boolean).join('\n'));
    for(const k of OPP_KEYS){if(!x.d.opps[OPP_KEYS.indexOf(k)])continue;line(`機會 ${k} 計分（${x.t[k].sum}/${MAX_SCORE}）`,FIVE_QUESTIONS.map(q=>{const cl=x.d.scores[k][q.key];return `${q.n}.${cl.score===null?'—':cl.score}｜${cl.evidence||'（沒證據）'}`;}).join('\n'));}
    line('選',x.d.choice.key+(x.d.choice.key!==x.top?'（最高分是 '+(x.top||'—')+'）':''));if(x.d.choice.reason)line('選非最高分的理由',x.d.choice.reason);
    if(x.d.rebuttal.text){const pr=parseRebuttal(x.d.rebuttal.text);line('反方紀錄（'+(x.d.rebuttal.source||'未標來源')+'）',pr.rounds.length?pr.rounds.map(r=>`拒絕 ${r.n}：${r.reject}\n我的回應 ${r.n}：${r.reply||'（沒回）'}`).join('\n')+(pr.summary?'\n總結：'+pr.summary:''):x.d.rebuttal.text);}
    line('一頁六段',x.d.page.map((p,i)=>p?`${i+1}. ${p}`:'').filter(Boolean).join('\n'));
    el('p',`版本 ${x.r.version} · 最後更新 ${fmt(x.r.updated_at)}`,box).style.color='#6b7a72';
   }
  }
  if(!rows.length)el('p','這個班還沒有名單或資料。',sec);
 }
 status.textContent=`${data.classes.length} 個授權班級 · 依 Week 5 排序：缺席在最上。`;
}
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
