import {resolveQuestions,attendance,stampLabel,classDate,classWindow,CLASS_SCHEDULE,DEFAULT_QUESTIONS,CLASSQ_WEEKS,normalizeClassQ} from './week4-core.mjs?v=20261112-w9';
import {remarkEditor,findRemark,mergeRemarks,listenRemarks,suggestTagResearch,freezeSuggestions} from './teacher-remarks.mjs?v=20261025-w5';
// 教師洞察 · 只有課堂兩題的週（Week 6 起；例如 11/6 跟 Week 5 同一天上）
// 每週一塊：改兩題（留白用預設）＋一人一列（出席、Q1／Q2 存檔時間、備註；點代號看全文與 AI 評語）。出席跟 Week 5 分開算。
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
let data=null;const open=new Set();
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
const fmt=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;};
const blocks=CLASSQ_WEEKS.map(week=>{
 const root=document.createElement('section');root.id='teacher-week'+week;root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
 el('h2',`Week ${week} 課堂兩題：出席、Q1、Q2`,root);
 el('p',`出席規則同 Week 4／5：Week ${week} 頁的兩題在上課日（${classDate(week)||''}）${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end} 內存檔＝Week ${week} 出席；跟同一天其他週的兩題分開算。`,root,'tw2-intro');
 const status=el('p','',root);status.setAttribute('role','status');
 const reloadBtn=el('button',`重新載入 Week ${week}`,root,'quiet');reloadBtn.type='button';reloadBtn.addEventListener('click',load);
 const body=el('div','',root);
 return {week,root,status,body};
});
async function load(){for(const b of blocks)b.status.textContent='正在載入…';try{data=await call({action:'teacher_load'});render();}catch(e){for(const b of blocks)b.status.textContent=e.message;}}
listenRemarks(()=>data,()=>load());
function stampCell(td,iso){if(!iso){td.textContent='未答';td.className='tw4-no';return;}const l=stampLabel(iso);const s=document.createElement('span');s.className=l?.kind==='in'?'tw4-in':'tw4-out';s.textContent=fmt(iso)+(l?.kind==='in'?' 課中':' 課後');td.replaceChildren(s);}
function render(){for(const b of blocks)renderWeek(b);}
function renderWeek({week,status,body}){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),wq=(data.week_class||[]).filter(r=>r.class_id===c.id&&r.week===week);
  const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...wq.map(r=>r.student_id)])];
  const nameOf=id=>w1.find(r=>r.student_id===id)?.student_name||roster.find(r=>r.student_id===id)?.student_name||'';
  const qrow=(data.week_questions||[]).find(r=>r.class_id===c.id&&r.week===week);const q=resolveQuestions(week,qrow);
  const qbox=el('div','',sec,'tw4-q');
  const qh=el('div','',qbox);qh.style.gridColumn='1 / -1';el('b',`Week ${week} 課堂兩題（上課日 ${classDate(week)||''} ${CLASS_SCHEDULE.start}–${CLASS_SCHEDULE.end}）· 隨時可改，學生下次載入就換題；留白＝用預設`,qh);
  const mk=(label,val,ph)=>{el('div',label,qbox).style.fontWeight='700';const i=el('input','',qbox);i.type='text';i.value=val;i.placeholder=ph;return i;};
  const d0=DEFAULT_QUESTIONS[week]||{};
  const q1=mk('Q1',qrow?.q1||'',d0.q1||'通用題'),q2=mk('Q2',qrow?.q2||'',d0.q2||'通用題'),pts=mk('重點',qrow?.points||'',d0.points||'（給 AI 評語用，選填）');
  const act=el('div','',qbox);act.style.gridColumn='1 / -1';act.style.display='flex';act.style.gap='8px';
  const saveQ=el('button','儲存兩題',act,'primary');saveQ.type='button';const resetQ=el('button','回到預設',act,'quiet');resetQ.type='button';
  const nowQ=el('p',`學生目前看到：Q1「${q.q1}」　Q2「${q.q2}」`,qbox);nowQ.style.gridColumn='1 / -1';nowQ.style.fontSize='.85rem';nowQ.style.color='#6e4a08';
  saveQ.addEventListener('click',async()=>{try{await call({action:'teacher_week_questions',class_id:c.id,week,questions:{q1:q1.value,q2:q2.value,points:pts.value}});status.textContent='兩題已更新。';await load();}catch(e){status.textContent=e.message;}});
  resetQ.addEventListener('click',async()=>{try{await call({action:'teacher_week_questions',class_id:c.id,week,questions:{}});status.textContent='已回到預設題。';await load();}catch(e){status.textContent=e.message;}});
  const rows=ids.map(id=>{const r=wq.find(x=>x.student_id===id);const st=r?.stamps||{};const present=attendance(st,week);
   // 跟 Week 4／5 同一套推算：只有兩題的週，兩題課中答完＝積極、有答但不在課中＝沒參與、沒答＝缺席（沒有「普通」）。
   return {id,name:nameOf(id),r,d:r?normalizeClassQ(r.data):null,st,present,suggested:suggestTagResearch(week,{present,cards:present?3:0,answered:!!(st.q1||st.q2),what:'兩題都在課中答完',unit:'題'})};});
  const live=el('div','',sec,'tw4-live');const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(`${rows.filter(x=>x.present).length} / ${rows.length}`,'出席（兩題課中答完）');
  stat(rows.filter(x=>x.st.q1&&x.st.q2).length,'兩題都答（含課後）');
  stat(rows.filter(x=>!x.r).length,'還沒打開');
  // 上課日 17:00 前還在作答時段，推算不完整：按鈕先鎖住，免得把還在答的人存成缺席。
  const endAt=classDate(week)?classWindow(classDate(week))[1]:0,tooEarly=Date.now()<endAt;
  const fz=el('div','',sec);fz.className='tw4-freeze';
  const fzBtn=el('button','把本週推算存成標記（只填還沒點的）',fz,'quiet');fzBtn.type='button';
  const fzMsg=el('span','',fz);fzMsg.className='tw4-freeze-msg';
  const pending=rows.filter(x=>!findRemark(data.remarks,c.id,x.id,week)?.tag&&x.suggested);
  fzMsg.textContent=`推算（同 Week 4／5）：兩題都在課中答完＝積極、有答但不在課中＝沒參與、沒答＝缺席。還沒點的 ${pending.length} 人。${tooEarly?`上課日 ${CLASS_SCHEDULE.end} 後才能存（現在還在作答時段）。`:''}`;
  fzBtn.disabled=!pending.length||tooEarly;
  fzBtn.addEventListener('click',async()=>{fzBtn.disabled=true;const items=pending.map(x=>({classId:c.id,studentId:x.id,week,tag:x.suggested.tag,note:findRemark(data.remarks,c.id,x.id,week)?.note||''}));
   const res=await freezeSuggestions(items,call,(d,f,t)=>{fzMsg.textContent=`存檔中 ${d+f}/${t}…`;});
   fzMsg.textContent=`已存 ${res.done} 人${res.failed?`，失敗 ${res.failed} 人`:''}。`;await load();});
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const tr=el('tr','',el('thead','',table));
  for(const h of ['學生','出席','老師備註（學生看不到）','Q1','Q2'])el('th',h,tr);
  const tbody=el('tbody','',table);
  rows.sort((a,b)=>Number(a.present)-Number(b.present)||Number(!!a.r)-Number(!!b.r)||a.id.localeCompare(b.id));
  for(const x of rows){
   const r=el('tr','',tbody);
   const idTd=el('td','',r);const btn=el('button',x.id+(x.name?`　${x.name}`:''),idTd,'quiet');btn.type='button';btn.style.padding='2px 6px';
   const att=el('td','',r);el('span',x.present?'出席':'缺席',att,x.present?'tw4-in':'tw4-out');
   const rk=el('td','',r);rk.className='tw4-remark';remarkEditor(rk,{classId:c.id,studentId:x.id,week,current:findRemark(data.remarks,c.id,x.id,week),call,compact:true,suggested:x.suggested,onSaved:rs=>mergeRemarks(data,c.id,x.id,rs)});
   for(const k of ['q1','q2'])stampCell(el('td','',r),x.st[k]);
   btn.addEventListener('click',()=>{if(open.has(x.id))open.delete(x.id);else open.add(x.id);render();});
   if(open.has(x.id)&&x.d){
    const dr=el('tr','',tbody);const td=el('td','',dr);td.colSpan=5;const box=el('div','',td,'tw4-detail');
    const line=(label,v)=>{if(!v)return;const p=el('p','',box);const b=document.createElement('b');b.textContent=label+'：';p.append(b,v);};
    line('Q1',x.d.q1);line('Q1 AI 評語',x.d.q1_ai);line('Q2',x.d.q2);line('Q2 AI 評語',x.d.q2_ai);
    el('p',`版本 ${x.r.version} · 最後更新 ${fmt(x.r.updated_at)}`,box).style.color='#6b7a72';
   }
  }
  if(!rows.length)el('p','這個班還沒有名單或資料。',sec);
 }
 status.textContent=`${data.classes.length} 個授權班級 · 缺席在最上。`;
}
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
