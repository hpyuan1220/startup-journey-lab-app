import {GROUP_ITEMS,C_MAX,PERSONAL_ITEMS,teamKey,parseGroup,formatGroup,parsePersonal,formatPersonal,groupSum,personalCompletion,finalTotal} from './final-core.mjs?v=20261113-fin';
import {COMPANY_NAME,normalizeReps,teamReps} from './islands-core.mjs?v=20261112-w10';
import {normalizeDirections,directionName} from './team-core.mjs?v=20261106-tm';
import {normalizeCompare} from './compare-core.mjs?v=20261112-fix';
import {findRemark,mergeRemarks,listenRemarks} from './teacher-remarks.mjs?v=20261025-w5';
// 教師洞察 · Week 12 期末評分表（12/18 上台；規則 final-core.mjs，草案待老師確認）
// 一組一列：選定的公司、組分五項 0／5／10（50）、PDF 已交；展開看三個人：上台自己那幾頁 0–30（老師打）＋個人完成度 20（電腦算）＝個人分；每人總分＝組分＋個人分。
// 組分存 teacher_remarks week 12 的 'TEAM'+組碼；個人分存 week 12 本人學號。學生看不到。
const WEEK=12;
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;if(parent)parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-week12';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
el('h2','Week 12 期末評分表（總分 100＝組分 50＋個人分 50）',root);
el('p','依組碼排序。組分 50：五項各 0／5／10，上台時點；個人分 50：展開組，每人「上台自己那幾頁」0–30 你打＋「個人完成度」20 電腦算（開 ≥2 箱、推薦 1 家、理由卡完成、Week 9＋10 課堂兩題各 5）。PDF 五段只勾「已交」，不計分。點了就存，學生看不到。',root);
const legend=el('details','',root,'tw4-detail');el('summary','組分五項判準（0／5／10）',legend);for(const [i,[h,t]] of GROUP_ITEMS.entries())el('p',`${h}　${t}`,legend);
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');const reloadBtn=el('button','重新載入期末評分表',bar,'quiet');reloadBtn.type='button';const csvBtn=el('button','匯出期末成績 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);let data=null,tries=0;const open=new Set();
async function call(b){const token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入…';try{data=await call({action:'teacher_load'});render();status.textContent='';}catch(e){status.textContent=e.message;if(!data&&tries++<2)setTimeout(load,2500);}}
reloadBtn.addEventListener('click',load);listenRemarks(()=>data,()=>load());
async function saveNote(c,sid,note,st){st.textContent=' 存…';try{const res=await call({action:'teacher_remark',class_id:c.id,student_id:sid,week:WEEK,tag:'',note});mergeRemarks(data,c.id,sid,res.remarks||[]);st.textContent=' 已存';}catch(e){st.textContent=' '+e.message;}}
function rows(c){
 const teams=(data.teams||[]).filter(t=>t.class_id===c.id).sort((a,b)=>String(a.code).localeCompare(String(b.code)));const members=(data.team_members||[]).filter(m=>m.class_id===c.id);const roster=(data.roster||[]).filter(r=>r.class_id===c.id);const isl=(data.islands||[]).filter(r=>r.class_id===c.id);const wc=(data.week_class||[]).filter(r=>r.class_id===c.id);
 const nm=id=>roster.find(r=>r.student_id===id)?.student_name||'';
 return teams.map(t=>{const ms=members.filter(m=>m.team_id===t.id).sort((a,b)=>a.student_id.localeCompare(b.student_id));const reps=teamReps(ms);const cmp=normalizeCompare(t.compare||{},[1,2,3].map(k=>reps[k]?.company).filter(Boolean));
  const g=parseGroup(findRemark(data.remarks,c.id,teamKey(t.code),WEEK)?.note);
  const people=ms.map(m=>{const prog=isl.find(r=>r.student_id===m.student_id)?.data||null;const q=w=>{const r=wc.find(x=>x.student_id===m.student_id&&Number(x.week)===w);return !!(r?.data?.q1&&r?.data?.q2);};
   const comp=personalCompletion({prog,reps:normalizeReps(m.reps),classq9:q(9),classq10:q(10)});const p=parsePersonal(findRemark(data.remarks,c.id,m.student_id,WEEK)?.note);
   return {id:m.student_id,name:nm(m.student_id),dirs:normalizeDirections(m.directions),reps:normalizeReps(m.reps),comp,p,total:finalTotal(g,p.c,comp.total)};});
  return {t,ms,people,reps,pick:cmp.pick.company,g,gsum:groupSum(g),gDone:g.g.every(x=>x!==null)};});
}
function render(){body.replaceChildren();
 for(const c of data.classes){const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);const R=rows(c);
  const live=el('div','',sec,'tw4-live');const stat=(n,l)=>{const b=el('div','',live);el('b',String(n),b);el('span',l,b);};
  stat(R.length,'組');stat(R.filter(r=>r.gDone).length,'組分打完');stat(R.filter(r=>r.g.pdf).length,'PDF 已交');stat(R.filter(r=>r.people.every(p=>p.p.c!==null)).length,'個人分打完');
  const done=R.filter(r=>r.gDone&&r.people.every(p=>p.p.c!==null)).flatMap(r=>r.people);stat(done.length?Math.round(done.reduce((s,p)=>s+p.total,0)/done.length):'—','打完的個人平均');
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const tr=el('tr','',el('thead','',table));for(const h of ['組','組員','選定','①','②','③','④','⑤','組分 /50','PDF 五段','個人分'])el('th',h,tr);const tb=el('tbody','',table);
  for(const r of R){const row=el('tr','',tb);const td0=el('td','',row);const btn=el('button',(open.has(r.t.id)?'▾ ':'▸ ')+r.t.name+'（'+r.t.code+'）',td0,'quiet');btn.type='button';btn.style.padding='2px 6px';btn.addEventListener('click',()=>{if(open.has(r.t.id))open.delete(r.t.id);else open.add(r.t.id);render();});
   el('td',r.people.map(p=>p.name||p.id).join('、'),row);el('td',r.pick?(COMPANY_NAME[r.pick]||r.pick):'—',row,r.pick?'':'tw4-no');
   const st=el('span','',null,'w4-hint');
   r.g.g.forEach((v,i)=>{const td=el('td','',row);for(const s of [0,5,10]){const b=el('button',String(s),td,'trk-tag');b.type='button';b.title=GROUP_ITEMS[i][0];b.setAttribute('aria-label',`${r.t.name} ${GROUP_ITEMS[i][0]} ${s} 分`);b.setAttribute('aria-pressed',String(v===s));if(v===s){b.style.background='#2f6f86';b.style.color='#fff';}b.addEventListener('click',()=>{r.g.g[i]=v===s?null:s;saveNote(c,teamKey(r.t.code),formatGroup(r.g),st).then(()=>render());});}});
   el('td',`${r.gsum}${r.gDone?'':'（未完）'}`,row);
   const pt=el('td','',row);const cb=el('input','',pt);cb.type='checkbox';cb.checked=r.g.pdf;cb.setAttribute('aria-label',`${r.t.name} PDF 已交`);cb.addEventListener('change',()=>{r.g.pdf=cb.checked;saveNote(c,teamKey(r.t.code),formatGroup(r.g),st).then(()=>render());});pt.append(st);
   el('td',r.people.map(p=>`${(p.name||p.id).slice(0,4)} ${p.p.c===null?'—':p.p.c}+${p.comp.total}`).join('\n'),row,'ti-pre');
   if(open.has(r.t.id)){const dr=el('tr','',tb);const td=el('td','',dr);td.colSpan=11;const box=el('div','',td,'tw4-detail');
    const t2=el('table','',box,'tm-table');const h2=el('tr','',el('thead','',t2));for(const h of ['組員','方向／推薦','上台自己的頁 /30','個人完成度 /20','個人分 /50','總分 /100'])el('th',h,h2);const b2=el('tbody','',t2);
    for(const p of r.people){const pr=el('tr','',b2);el('td',`${p.id}　${p.name}`,pr);el('td',p.dirs.map(d=>directionName(d).split('｜')[0]+(p.reps[d]?'＝'+(COMPANY_NAME[p.reps[d]]||p.reps[d]):'')).join('、')||'—',pr);
     const ct=el('td','',pr);const inp=el('input','',ct);inp.type='number';inp.min='0';inp.max=String(C_MAX);inp.step='1';inp.style.width='4.5em';inp.value=p.p.c===null?'':String(p.p.c);inp.setAttribute('aria-label',`${p.id} 上台分數（0–${C_MAX}）`);const cst=el('span','',ct,'w4-hint');
     inp.addEventListener('change',()=>{const v=inp.value.trim();const n=Number(v);if(v!==''&&!(Number.isInteger(n)&&n>=0&&n<=C_MAX)){cst.textContent=' 0–'+C_MAX;return;}p.p.c=v===''?null:n;saveNote(c,p.id,formatPersonal(p.p),cst).then(()=>render());});inp.addEventListener('keydown',e=>{if(e.key==='Enter')inp.blur();});
     el('td',`${p.comp.total}（${PERSONAL_ITEMS.map(([l],i)=>(p.comp.items[i]?'✓':'✗')+l).join('、')}）`,pr,'ti-pre');el('td',String((p.p.c||0)+p.comp.total),pr);el('td',p.p.c===null||!r.gDone?`${p.total}（未完）`:String(p.total),pr);}
   }}
  if(!R.length)el('p','還沒有組。',sec,'w4-hint');}
}
csvBtn.addEventListener('click',()=>{if(!data)return;const q=v=>'"'+String(v??'').replace(/"/g,'""').replace(/\n/g,' ')+'"';const lines=[['班級','組','組碼','選定','①','②','③','④','⑤','組分','PDF','學號','姓名','上台 /30','完成度 /20','個人分','總分'].join(',')];
 for(const c of data.classes)for(const r of rows(c))for(const p of r.people)lines.push([c.name,r.t.name,r.t.code,COMPANY_NAME[r.pick]||r.pick||'',...r.g.g.map(v=>v??''),r.gsum,r.g.pdf?1:0,p.id,p.name,p.p.c??'',p.comp.total,(p.p.c||0)+p.comp.total,p.total].map(q).join(','));
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Week12_期末成績.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});if(!dashboard.hidden)load();
}
