import {resolveQuestions,attendance,stampLabel,industryName,normalizeWeek4,SOURCE_LABEL,classDate,CLASS_SCHEDULE,DEFAULT_QUESTIONS} from './week4-core.mjs?v=20261018-w4';
import {remarkEditor,findRemark,mergeRemarks,remarkText,tagLabel,listenRemarks,suggestTag,suggestTagResearch,effectiveTag,freezeSuggestions} from './teacher-remarks.mjs?v=20261019-freeze';
import {doneCount} from './week3-core.mjs?v=20261013-preclass';
// 教師洞察 · Week 4 第一輪研究
// 老師不用按任何開關：出席＝課堂兩題在上課日 13:30–18:00 內存檔。這裡只有兩件事：改本週兩題（可留白用預設），
// 和一人一列（出席、Q1／Q2、產業、三張卡的時間與來源；未答排最上；點代號展開看全文）。
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
// 本週放最上面：插在狀態列後面（teacher-week2 先插，所以這段會在它前面）。
const root=document.createElement('section');root.id='teacher-week4';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
const el=(tag,text,parent=root,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
el('h2','Week 4 第一輪研究：出席、兩題、三張卡',root);
el('p','出席規則固定：課堂兩題在上課日 13:30–18:00 內存檔＝出席。研究頁一直開著、沒有截止，每個欄位只記學生實際存檔的時間（課中／課後）。你要操作的只有兩件事：本週兩題的文字，和每位學生那一列的「老師備註」（四個標記一點就存、備註打完按 Enter；學生看不到）。表格太寬時可以左右滑。',root,'tw2-intro');
const status=el('p','',root);status.setAttribute('role','status');
const reloadBtn=el('button','重新載入 Week 4',root,'quiet');reloadBtn.type='button';
const csvBtn=el('button','匯出評分參考 CSV',root,'quiet');csvBtn.type='button';csvBtn.title='學號、姓名、Week 1–4 狀態、出席、三張卡來源、每週老師標記與備註';
const body=el('div','',root);
let data=null,open=new Set(),week=4;
listenRemarks(()=>data,()=>load());// Week 2 區存的備註也要進這裡的 data（展開列的「前幾週備註」、CSV）
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入 Week 4…';try{data=await call({action:'teacher_load'});render();}catch(e){status.textContent=e.message;}}
reloadBtn.addEventListener('click',load);
const fmt=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;};
function stampCell(td,iso){if(!iso){td.textContent='—';td.className='';return;}const l=stampLabel(iso);const s=document.createElement('span');s.className=l?.kind==='in'?'tw4-in':'tw4-out';s.textContent=fmt(iso)+(l?.kind==='in'?' 課中':' 課後');td.replaceChildren(s);}
function render(){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w4=(data.week4||[]).filter(r=>r.class_id===c.id);
  const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...w4.map(r=>r.student_id)])];
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
  // 即時數字
  const rows=ids.map(id=>{const r=w4.find(x=>x.student_id===id);const d=r?normalizeWeek4(r.data):null;const st=r?.stamps||{};const present=attendance(st,week);const cards=['card1','card2','card3'].filter(k=>st[k]).length;return {id,name:nameOf(id),r,d,st,present,q1:!!st.q1,q2:!!st.q2,cards,suggested:suggestTagResearch(week,{present,cards,answered:!!(st.q1&&st.q2)})};});
  const live=el('div','',sec,'tw4-live');
  const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(`${rows.filter(x=>x.present).length} / ${rows.length}`,'出席（兩題課中答完）');
  stat(rows.filter(x=>x.q1&&x.q2&&!x.present).length,'課後補答');
  stat(rows.filter(x=>x.d&&(x.d.industry.card)).length,'已選產業');
  stat(rows.filter(x=>x.st.card1).length,'卡 1 已貼回');stat(rows.filter(x=>x.st.card2).length,'卡 2 已貼回');stat(rows.filter(x=>x.st.card3).length,'卡 3 已貼回');
  // 把本週推算存成標記：只填老師還沒點的人；點過的不動。存完就是評分參考的正式紀錄。
  const fz=el('div','',sec);fz.className='tw4-freeze';
  const fzBtn=el('button','把本週推算存成標記（只填還沒點的）',fz,'quiet');fzBtn.type='button';
  const fzMsg=el('span','',fz);fzMsg.className='tw4-freeze-msg';
  const pending=rows.filter(x=>!findRemark(data.remarks,c.id,x.id,week)?.tag&&x.suggested);
  fzMsg.textContent=`推算：出席＋三張卡＝積極、出席＝普通、沒出席但有做＝沒參與、沒紀錄＝缺席。還沒點的 ${pending.length} 人。`;
  fzBtn.disabled=!pending.length;
  fzBtn.addEventListener('click',async()=>{fzBtn.disabled=true;const items=pending.map(x=>({classId:c.id,studentId:x.id,week,tag:x.suggested.tag,note:findRemark(data.remarks,c.id,x.id,week)?.note||''}));
   const r=await freezeSuggestions(items,call,(d,f,t)=>{fzMsg.textContent=`存檔中 ${d+f}/${t}…`;});
   fzMsg.textContent=`已存 ${r.done} 人${r.failed?`，失敗 ${r.failed} 人`:''}。`;await load();});
  // 一人一列
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const thead=el('thead','',table);const tr=el('tr','',thead);
  // 備註欄放在出席旁邊（第三欄）：手機或窄視窗不用往右滑就看得到、點得到。
  for(const h of ['學生','出席','老師備註（學生看不到）','產業線','Q1','Q2','卡 1 錢流','卡 2 查證','卡 3 機會','來源'])el('th',h,tr);
  const tbody=el('tbody','',table);
  rows.sort((a,b)=>Number(a.present)-Number(b.present)||Number(!!a.r)-Number(!!b.r)||a.id.localeCompare(b.id));
  for(const x of rows){
   const r=el('tr','',tbody);
   const idTd=el('td','',r);const btn=el('button',x.id+(x.name?`　${x.name}`:''),idTd,'quiet');btn.type='button';btn.style.padding='2px 6px';
   const att=el('td','',r);const sp=el('span',x.present?'出席':'缺席',att,x.present?'tw4-in':'tw4-out');
   const rk=el('td','',r);rk.className='tw4-remark';remarkEditor(rk,{classId:c.id,studentId:x.id,week,current:findRemark(data.remarks,c.id,x.id,week),call,compact:true,suggested:x.suggested,onSaved:rows=>mergeRemarks(data,c.id,x.id,rows)});
   const ind=el('td','',r);if(x.d&&x.d.industry.card){ind.textContent=industryName(x.d)+' ';const s=document.createElement('span');s.className=stampLabel(x.st.industry)?.kind==='in'?'tw4-in':'tw4-out';s.textContent=fmt(x.st.industry);ind.append(s);}else ind.textContent='未選';
   for(const k of ['q1','q2']){const td=el('td','',r);if(x.st[k])stampCell(td,x.st[k]);else{td.textContent='未答';td.className='tw4-no';}}
   for(const k of ['card1','card2','card3']){const td=el('td','',r);stampCell(td,x.st[k]);}
   el('td',x.d?['card1','card2','card3'].map(k=>x.d[k].source).filter(Boolean).map(s=>(SOURCE_LABEL[s]||s).replace(/ 說| 查到（有引用）/,'')).join(' · ')||'—':'—',r);
   btn.addEventListener('click',()=>{if(open.has(x.id))open.delete(x.id);else open.add(x.id);render();});
   if(open.has(x.id)&&x.d){
    const dr=el('tr','',tbody);const td=el('td','',dr);td.colSpan=10;const box=el('div','',td,'tw4-detail');
    const prior=[1,2,3].map(wk=>({wk,t:remarkText(findRemark(data.remarks,c.id,x.id,wk))})).filter(o=>o.t);
    if(prior.length){const p=el('p','',box);const b=document.createElement('b');b.textContent='前幾週備註：';p.append(b,prior.map(o=>`W${o.wk} ${o.t}`).join('　'));}
    const line=(label,v)=>{if(!v)return;const p=el('p','',box);const b=document.createElement('b');b.textContent=label+'：';p.append(b,v);};
    line('痛點一句話',x.d.pain);line('Q1',x.d.q1);if(x.d.q1_ai)line('Q1 AI 評語',x.d.q1_ai);line('Q2',x.d.q2);if(x.d.q2_ai)line('Q2 AI 評語',x.d.q2_ai);
    line('卡 1（'+(SOURCE_LABEL[x.d.card1.source]||'未標來源')+'）',x.d.card1.text);line('卡 2（'+(SOURCE_LABEL[x.d.card2.source]||'未標來源')+'）',x.d.card2.text);
    line('三個機會',x.d.card3.opps.filter(Boolean).map((o,i)=>'ABC'[i]+' '+o).join('\n'));if(x.d.card3.text)line('卡 3 全文（'+(SOURCE_LABEL[x.d.card3.source]||'未標來源')+'）',x.d.card3.text);
    el('p',`版本 ${x.r.version} · 最後更新 ${fmt(x.r.updated_at)}`,box).style.color='#6b7a72';
   }
  }
  if(!rows.length)el('p','這個班還沒有名單或資料。',sec);
 }
 status.textContent=`${data.classes.length} 個授權班級 · 依 Week 4 排序：缺席在最上。`;
}
// 評分參考 CSV：一人一列，Week 1–4 狀態＋出席＋來源＋每週老師標記與備註。Excel 直接開（UTF-8 BOM）。
csvBtn.addEventListener('click',()=>{
 if(!data){status.textContent='先載入 Week 4。';return;}
 const esc=v=>{v=String(v??'').replace(/\r?\n/g,' ');return /[",]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
 const head=['班級','學號','姓名','Week 1','Week 2','Week 2 審核','Week 3','Week 3 訪談次數','Week 4 出席','Week 4 產業','卡 1 來源','卡 2 來源','卡 3 來源'];
 for(const wk of [1,2,3,4])head.push(`W${wk} 標記`,`W${wk} 備註`);
 for(const wk of [1,2,3,4])head.push(`W${wk} 系統推算`);
 for(const wk of [1,2,3,4])head.push(`W${wk} 評分參考`);// 老師標記優先，否則推算
 const lines=[head.map(esc).join(',')];
 for(const c of data.classes){
  const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w2=(data.rows||[]).filter(r=>r.class_id===c.id),w3=(data.week3||[]).filter(r=>r.class_id===c.id),w4=(data.week4||[]).filter(r=>r.class_id===c.id);
  const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...w2.map(r=>r.student_id),...w3.map(r=>r.student_id),...w4.map(r=>r.student_id)])].sort();
  for(const id of ids){
   const a=w1.find(r=>r.student_id===id),b=w2.find(r=>r.student_id===id),d3=w3.find(r=>r.student_id===id),r4=w4.find(r=>r.student_id===id);
   const d=r4?normalizeWeek4(r4.data):null,st=r4?.stamps||{};
   const row=[c.name,id,a?.student_name||roster.find(r=>r.student_id===id)?.student_name||'',
    a?(a.status==='submitted'?'已交':'草稿'):'無',b?(b.status==='submitted'||b.submitted_at?'已交':'草稿'):'無',b?.review_status||'',
    d3?(d3.status==='submitted'?'已交':'草稿'):'無',d3?doneCount(d3.record):0,
    r4?(attendance(st,week)?'出席':'缺席'):'缺席',d&&d.industry.card?industryName(d):'',
    ...['card1','card2','card3'].map(k=>d?(SOURCE_LABEL[d[k].source]||d[k].source||''):'')];
   for(const wk of [1,2,3,4]){const rm=findRemark(data.remarks,c.id,id,wk);row.push(tagLabel(rm?.tag),rm?.note||'');}
   const sugs={};for(const wk of [1,2,3])sugs[wk]=suggestTag(wk,{w1:a,w2:b,w3:d3,interviews:d3?doneCount(d3.record):0});
   sugs[4]=suggestTagResearch(4,{present:attendance(st,4),cards:['card1','card2','card3'].filter(k=>st[k]).length,answered:!!(st.q1&&st.q2)});
   for(const wk of [1,2,3,4])row.push(sugs[wk]?tagLabel(sugs[wk].tag):'');
   for(const wk of [1,2,3,4]){const e=effectiveTag(findRemark(data.remarks,c.id,id,wk),sugs[wk]);row.push(e.tag?`${tagLabel(e.tag)}${e.source==='system'?'（推算）':''}`:'');}
   lines.push(row.map(esc).join(','));
  }
 }
 const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`評分參考_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 status.textContent='已匯出評分參考 CSV（含學生姓名學號，請放在自己的電腦，不要上傳到公開的地方）。';
});
// 教師登入後 dashboard 才會顯示；顯示時自動載入一次。
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
