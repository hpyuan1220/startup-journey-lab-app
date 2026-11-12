import {COMPARE_QUESTIONS,MAX_COMPARE,COUNTER_KINDS,normalizeCompare,compareTotals,compareProgress} from './compare-core.mjs?v=20261112-fix';
import {COMPANY_NAME,normalizeReps,teamReps} from './islands-core.mjs?v=20261112-w10';
// 教師洞察 · Week 10 比較與選定：每組三家、比較表總分、選定哪一家（非最高分的理由）、反方三格、完成度；哪家被幾組選。只讀。
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-compare';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
el('h2','Week 10 比較與選定：每組三家、選了誰、反方（12/4）',root);
el('p','每組一列：三家推薦、比較表總分（五問 0／1／2）、選定哪一家（選非最高分有沒有寫理由）、反方三格與最狠的一刀、還缺什麼。下面是哪家被幾組選。',root);
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');const reloadBtn=el('button','重新載入比較',bar,'quiet');reloadBtn.type='button';const csvBtn=el('button','匯出比較 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);let data=null,tries=0;
async function call(b){const token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入…';try{data=await call({action:'teacher_load'});render();status.textContent='';}catch(e){status.textContent=e.message;if(!data&&tries++<2)setTimeout(load,2500);}}
reloadBtn.addEventListener('click',load);
function rows(c){const teams=(data.teams||[]).filter(t=>t.class_id===c.id),members=(data.team_members||[]).filter(m=>m.class_id===c.id),roster=(data.roster||[]).filter(r=>r.class_id===c.id);const nm=id=>roster.find(r=>r.student_id===id)?.student_name||id;
 return teams.map(t=>{const ms=members.filter(m=>m.team_id===t.id);const reps=teamReps(ms);const allowed=[1,2,3].map(k=>reps[k]?.company).filter(Boolean);const d=normalizeCompare(t.compare||{},allowed);const p=compareProgress(d,allowed);const tt=compareTotals(d);
  return {t,ms,reps,allowed,d,p,tt,names:Object.fromEntries(ms.map(m=>[m.student_id,nm(m.student_id)]))};});}
function render(){body.replaceChildren();
 for(const c of data.classes){const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);const R=rows(c);
  const live=el('div','',sec,'tw4-live');const stat=(n,l)=>{const b=el('div','',live);el('b',String(n),b);el('span',l,b);};
  stat(R.length,'組');stat(R.filter(r=>r.allowed.length===3).length,'三家到齊');stat(R.filter(r=>r.p.scored>0).length,'開始打分');stat(R.filter(r=>r.d.pick.company).length,'已選定');stat(R.filter(r=>r.p.done).length,'比較表完成');
  const picks={};for(const r of R)if(r.d.pick.company)picks[r.d.pick.company]=(picks[r.d.pick.company]||0)+1;
  el('p','哪家被幾組選：'+(Object.keys(picks).length?Object.entries(picks).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${COMPANY_NAME[k]||k} ×${v}`).join('、'):'還沒有組選定'),sec,'w4-hint');
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap,'tm-table ti-table');const tr=el('tr','',el('thead','',table));for(const x of ['組','組員','三家（推薦人）','比較表總分','選定','非最高分的理由','反方三格／最狠的一刀','還缺什麼'])el('th',x,tr);
  const tb=el('tbody','',table);
  for(const r of R){const row=el('tr','',tb);el('td',r.t.name+(r.t.locked?' 🔒':''),row);el('td',r.ms.map(m=>r.names[m.student_id]).join('、'),row);
   el('td',[1,2,3].map(k=>r.reps[k]?`${COMPANY_NAME[r.reps[k].company]||r.reps[k].company}（${r.names[r.reps[k].student_id]||''}）`:'—').join('\n'),row,'ti-pre');
   el('td',r.allowed.map(cid=>`${COMPANY_NAME[cid]||cid} ${r.tt[cid]?.sum??0}／${MAX_COMPARE}${r.tt[cid]?.complete?'':'（未滿）'}`).join('\n'),row,'ti-pre');
   const pick=r.d.pick.company;el('td',pick?(COMPANY_NAME[pick]||pick)+(pick===r.p.top?'（最高分）':r.p.top?'（非最高分）':''):'—',row,pick?'ti-box ti-open':'');
   el('td',pick&&pick!==r.p.top?(r.d.pick.reason||'（沒寫）'):'',row,'ti-pre');
   el('td',COUNTER_KINDS.map(([k,l])=>(r.d.counters.chosen===k?'★ ':'')+l+'：'+(r.d.counters[k]||'—')).join('\n'),row,'ti-pre');
   el('td',r.p.done?'✅ 完成':r.p.missing.join('；'),row,r.p.done?'':'ti-warn');}
  if(!R.length)el('p','還沒有組。',sec,'w4-hint');}
}
csvBtn.addEventListener('click',()=>{if(!data)return;const q=v=>'"'+String(v??'').replace(/"/g,'""').replace(/\n/g,' ')+'"';const lines=[['班級','組','組員','三家','總分','選定','最高分','理由','大廠','客戶','技術','最狠的一刀','完成','缺什麼'].join(',')];
 for(const c of data.classes)for(const r of rows(c))lines.push([c.name,r.t.name,r.ms.map(m=>r.names[m.student_id]).join('、'),r.allowed.map(x=>COMPANY_NAME[x]||x).join('、'),r.allowed.map(x=>`${COMPANY_NAME[x]||x} ${r.tt[x]?.sum??0}`).join('、'),COMPANY_NAME[r.d.pick.company]||r.d.pick.company||'',COMPANY_NAME[r.p.top]||r.p.top||'',r.d.pick.reason,r.d.counters.big,r.d.counters.customer,r.d.counters.tech,r.d.counters.chosen,r.p.done?'是':'',r.p.missing.join('；')].map(q).join(','));
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='compare-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});if(!dashboard.hidden)load();
}
