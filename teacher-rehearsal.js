import {FINAL_PAGE_TITLES,teamKey,parseRehearsal,formatRehearsal,rehearsalFilled} from './final-core.mjs?v=20261113-fin';
import {COMPANY_NAME,teamReps} from './islands-core.mjs?v=20261112-w10';
import {normalizeCompare} from './compare-core.mjs?v=20261112-fix';
import {findRemark,mergeRemarks,listenRemarks} from './teacher-remarks.mjs?v=20261025-w5';
// 教師洞察 · Week 11 預演講評（12/11：每組 6 分鐘＋老師 3 分鐘）
// 一組一列：六頁各一句講評＋「6 分鐘內講完」＋一句整體。存 teacher_remarks week 11 的 'TEAM'+組碼；學生端 Week 11 頁看得到自己組的講評（team_load 轉出）。
const WEEK=11;
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;if(parent)parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-week11';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
el('h2','Week 11 預演講評（12/11：每組 6 分鐘＋講評 3 分鐘）',root);
el('p','依組碼＝上台順序。每組六頁各一句講評（學生 Week 11 頁會看到，12/18 前照著改）、「6 分鐘內講完」、一句整體。離開格子就存。預演看三件事：6 分鐘內講完六頁；第 1 頁 10 秒內聽得出誰付錢給誰；第 4 頁有沒有真的比（不是各講各的）。',root);
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');const reloadBtn=el('button','重新載入預演',bar,'quiet');reloadBtn.type='button';const csvBtn=el('button','匯出講評 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);let data=null,tries=0;
async function call(b){const token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入…';try{data=await call({action:'teacher_load'});render();status.textContent='';}catch(e){status.textContent=e.message;if(!data&&tries++<2)setTimeout(load,2500);}}
reloadBtn.addEventListener('click',load);listenRemarks(()=>data,()=>load());
async function save(c,code,o,st){st.textContent=' 存…';try{const res=await call({action:'teacher_remark',class_id:c.id,student_id:teamKey(code),week:WEEK,tag:'',note:formatRehearsal(o)});mergeRemarks(data,c.id,teamKey(code),res.remarks||[]);st.textContent=' 已存';}catch(e){st.textContent=' '+e.message;}}
function rows(c){const teams=(data.teams||[]).filter(t=>t.class_id===c.id).sort((a,b)=>String(a.code).localeCompare(String(b.code)));const members=(data.team_members||[]).filter(m=>m.class_id===c.id);const roster=(data.roster||[]).filter(r=>r.class_id===c.id);const nm=id=>roster.find(r=>r.student_id===id)?.student_name||id;
 return teams.map(t=>{const ms=members.filter(m=>m.team_id===t.id);const reps=teamReps(ms);const cmp=normalizeCompare(t.compare||{},[1,2,3].map(k=>reps[k]?.company).filter(Boolean));return {t,names:ms.map(m=>nm(m.student_id)),pick:cmp.pick.company,o:parseRehearsal(findRemark(data.remarks,c.id,teamKey(t.code),WEEK)?.note)};});}
function render(){body.replaceChildren();
 for(const c of data.classes){const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);const R=rows(c);
  const live=el('div','',sec,'tw4-live');const stat=(n,l)=>{const b=el('div','',live);el('b',String(n),b);el('span',l,b);};stat(R.length,'組');stat(R.filter(r=>rehearsalFilled(r.o)>0).length,'已講評');stat(R.filter(r=>r.o.onTime===true).length,'6 分鐘內');stat(R.filter(r=>r.o.onTime===false).length,'超時');
  for(const r of R){const card=el('div','',sec,'tw4-detail');card.style.margin='8px 0';const h=el('div','',card,'w4-row');el('b',`${r.t.name}（${r.t.code}）　${r.names.join('、')}　→ ${r.pick?(COMPANY_NAME[r.pick]||r.pick):'還沒選定'}`,h);
   const st=el('span','',h,'w4-hint');const tl=el('label','',h);const cb=el('input','',tl);cb.type='checkbox';cb.checked=r.o.onTime===true;cb.setAttribute('aria-label',`${r.t.name} 6 分鐘內講完`);tl.append(' 6 分鐘內講完');cb.addEventListener('change',()=>{r.o.onTime=cb.checked;save(c,r.t.code,r.o,st);});
   const grid=el('div','',card,'rh-grid');FINAL_PAGE_TITLES.forEach((title,i)=>{const cell=el('label','',grid,'rh-cell');el('span',`第 ${i+1} 頁 ${title}`,cell,'w4-hint');const inp=el('input','',cell);inp.type='text';inp.maxLength=120;inp.placeholder='一句講評（學生看得到）';inp.value=r.o.notes[i]||'';inp.setAttribute('aria-label',`${r.t.name} 第 ${i+1} 頁講評`);let tm=null;const upd=()=>{r.o.notes[i]=inp.value;clearTimeout(tm);tm=setTimeout(()=>save(c,r.t.code,r.o,st),800);};inp.addEventListener('input',upd);inp.addEventListener('change',()=>{clearTimeout(tm);r.o.notes[i]=inp.value;save(c,r.t.code,r.o,st);});});
   const gl=el('label','',card,'rh-cell');el('span','整體一句',gl,'w4-hint');const ginp=el('input','',gl);ginp.type='text';ginp.maxLength=200;ginp.value=r.o.general||'';ginp.setAttribute('aria-label',`${r.t.name} 整體講評`);let gt=null;ginp.addEventListener('input',()=>{r.o.general=ginp.value;clearTimeout(gt);gt=setTimeout(()=>save(c,r.t.code,r.o,st),800);});ginp.addEventListener('change',()=>{clearTimeout(gt);r.o.general=ginp.value;save(c,r.t.code,r.o,st);});}
  if(!R.length)el('p','還沒有組。',sec,'w4-hint');}
}
csvBtn.addEventListener('click',()=>{if(!data)return;const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const lines=[['班級','組','組碼','選定','6 分鐘內',...FINAL_PAGE_TITLES.map((t,i)=>`第${i+1}頁 ${t}`),'整體'].join(',')];
 for(const c of data.classes)for(const r of rows(c))lines.push([c.name,r.t.name,r.t.code,COMPANY_NAME[r.pick]||r.pick||'',r.o.onTime===null?'':r.o.onTime?'是':'否',...r.o.notes,r.o.general].map(q).join(','));
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Week11_預演講評.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});if(!dashboard.hidden)load();
}
