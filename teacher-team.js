import {INDUSTRY_CARDS,normalizeWeek4,industryName} from './week4-core.mjs?v=20261106-tm';
import {DIRECTIONS,directionName,industryLabel,teamSummary,normalizeDirections,TEAM_LOCK_LABEL,TEAM_MAX} from './team-core.mjs?v=20261106-tm';
// 教師洞察 · Week 8 建組：每組一塊（組名、組碼、產業線、組員與方向、鎖定），下面是「還沒有組」名單（含想請老師分組的人）。
// 老師可以：建組、改組名、改產業線、把任何人指定進任何組、移出、替人認方向、鎖定／解鎖（單組或全部）、刪空組、匯出 CSV。不受 11/27 鎖定時間限制。
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-week8';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
el('h2','Week 8 建組：組別、產業線、方向認領',root);
el('p',`學生自己建組、加入、選產業、認方向；${TEAM_LOCK_LABEL} 後學生不能改，你在這裡隨時可以改。「還沒有組」名單裡標「想請老師分組」的人，用每組的「加人」下拉指定進組。`,root,'tw2-intro');
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');
const reloadBtn=el('button','重新載入建組',bar,'quiet');reloadBtn.type='button';
const lockAll=el('button','鎖定全部',bar,'quiet');lockAll.type='button';const unlockAll=el('button','解鎖全部',bar,'quiet');unlockAll.type='button';
const newName=el('input','',bar);newName.type='text';newName.placeholder='新組名';newName.style.width='9em';newName.setAttribute('aria-label','新組名');
const newBtn=el('button','老師建一組',bar,'quiet');newBtn.type='button';
const csvBtn=el('button','匯出分組 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);
let data=null;
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入建組…';try{data=await call({action:'teacher_load'});render();status.textContent='';}catch(e){status.textContent=e.message;}}
reloadBtn.addEventListener('click',load);
async function op(c,body,okText){status.textContent='處理中…';try{const r=await call({action:'teacher_team',class_id:c.id,...body});data.teams=data.teams.filter(t=>t.class_id!==c.id).concat(r.teams||[]);data.team_members=data.team_members.filter(m=>m.class_id!==c.id).concat(r.team_members||[]);render();status.textContent=okText||'已存。';}catch(e){status.textContent=e.message;}}
const firstClass=()=>data?.classes?.[0];
lockAll.addEventListener('click',()=>{const c=firstClass();if(c)op(c,{op:'lock',team_id:'all',locked:true},'全部鎖定了。');});
unlockAll.addEventListener('click',()=>{const c=firstClass();if(c)op(c,{op:'lock',team_id:'all',locked:false},'全部解鎖了。');});
newBtn.addEventListener('click',()=>{const c=firstClass();if(c)op(c,{op:'create',name:newName.value},'建好了。').then(()=>{newName.value='';});});
function render(){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w4=(data.week4||[]).filter(r=>r.class_id===c.id);
  const members=(data.team_members||[]).filter(m=>m.class_id===c.id);
  const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...members.map(m=>m.student_id)])].sort();
  const nameOf=id=>roster.find(r=>r.student_id===id)?.student_name||w1.find(r=>r.student_id===id)?.student_name||'';
  const indOf=id=>{const r=w4.find(x=>x.student_id===id);return r?industryName(normalizeWeek4(r.data)):'';};
  const teams=(data.teams||[]).filter(t=>t.class_id===c.id).sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
  const inTeam=new Set(members.filter(m=>m.team_id).map(m=>m.student_id));
  const noTeam=ids.filter(id=>!inTeam.has(id)).map(id=>({id,name:nameOf(id),ind:indOf(id),wants:!!members.find(m=>m.student_id===id)?.wants_assignment}));
  const live=el('div','',sec,'tw4-live');const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(teams.length,'組');stat(inTeam.size,'已有組');stat(noTeam.length,'還沒有組');stat(noTeam.filter(x=>x.wants).length,'想請老師分組');stat(teams.filter(t=>teamSummary(t,members).complete).length,'建好的組');
  const grid=el('div','',sec,'tt-grid');
  for(const t of teams){
   const sm=teamSummary(t,members);
   const card=el('div','',grid,'tt-card');if(t.locked)card.classList.add('tt-locked');
   const h=el('div','',card,'tt-head');
   const nameIn=el('input','',h);nameIn.type='text';nameIn.value=t.name;nameIn.maxLength=30;nameIn.setAttribute('aria-label','組名');nameIn.addEventListener('change',()=>op(c,{op:'rename',team_id:t.id,name:nameIn.value},'組名已改。'));
   el('span','組碼 '+t.code,h,'tm-code');
   el('span',`${sm.count}／${TEAM_MAX}${t.locked?'・已鎖定':''}`,h,'w4-hint');
   const sel=el('select','',card);sel.setAttribute('aria-label','組的產業線');const o0=el('option','產業線：還沒選',sel);o0.value='';
   for(const k of INDUSTRY_CARDS){const o=el('option',k.name,sel);o.value=String(k.id);}
   const oc=el('option','自填…',sel);oc.value='custom';
   const cur=t.industry?.card==='custom'?'custom':t.industry?.card?String(t.industry.card):'';sel.value=cur;
   const cus=el('input','',card);cus.type='text';cus.placeholder='自填產業';cus.value=t.industry?.custom||'';cus.hidden=cur!=='custom';cus.setAttribute('aria-label','自填產業');
   const saveInd=()=>{const v=sel.value;cus.hidden=v!=='custom';if(v==='custom'&&!cus.value.trim()){cus.focus();return;}op(c,{op:'industry',team_id:t.id,industry:v===''?{card:null}:v==='custom'?{card:'custom',custom:cus.value}:{card:Number(v)}},'產業線已改。');};
   sel.addEventListener('change',saveInd);cus.addEventListener('change',saveInd);
   const table=el('table','',card,'tm-table');const tr=el('tr','',el('thead','',table));for(const x of ['組員','一','二','三','Week 4 產業',''])el('th',x,tr);
   const tb=el('tbody','',table);
   for(const m of sm.members){
    const r=el('tr','',tb);el('td',m.student_id+(nameOf(m.student_id)?'　'+nameOf(m.student_id):''),r);
    const dirs=normalizeDirections(m.directions);
    for(const [d] of DIRECTIONS){const td=el('td','',r);const b=el('button',dirs.includes(d)?'✓':'·',td,'quiet');b.type='button';b.style.padding='0 6px';b.setAttribute('aria-pressed',String(dirs.includes(d)));b.title=directionName(d);b.addEventListener('click',()=>op(c,{op:'claim',student_id:m.student_id,directions:dirs.includes(d)?dirs.filter(x=>x!==d):[...dirs,d]},'方向已改。'));}
    el('td',indOf(m.student_id)||'—',r);
    const td=el('td','',r);const rm=el('button','移出',td,'quiet');rm.type='button';rm.style.padding='0 6px';rm.addEventListener('click',()=>op(c,{op:'remove',student_id:m.student_id},'已移出。'));
   }
   const add=el('div','',card,'w4-row');const addSel=el('select','',add);addSel.setAttribute('aria-label','加人');const a0=el('option','加人…',addSel);a0.value='';
   for(const x of noTeam){const o=el('option',`${x.id} ${x.name}${x.wants?'（想請老師分組）':''}${x.ind?'・'+x.ind:''}`,addSel);o.value=x.id;}
   addSel.addEventListener('change',()=>{if(addSel.value)op(c,{op:'assign',student_id:addSel.value,team_id:t.id},'已加入。');});
   const lk=el('button',t.locked?'解鎖':'鎖定',add,'quiet');lk.type='button';lk.addEventListener('click',()=>op(c,{op:'lock',team_id:t.id,locked:!t.locked},t.locked?'已解鎖。':'已鎖定。'));
   if(!sm.count){const dl=el('button','刪除空組',add,'quiet');dl.type='button';dl.addEventListener('click',()=>op(c,{op:'delete',team_id:t.id},'已刪除。'));}
   const stp=el('p',sm.complete?'✅ 建好了':'缺：'+sm.missing.join('；'),card,'w4-hint');if(sm.complete)stp.style.color='#2a6a3a';
  }
  if(!teams.length)el('p','還沒有任何組。',sec);
  el('h4',`還沒有組（${noTeam.length} 人）`,sec);
  const ul=el('ul','',sec,'tt-noteam');
  for(const x of noTeam.sort((a,b)=>Number(b.wants)-Number(a.wants)||a.id.localeCompare(b.id)))el('li',`${x.id}　${x.name}${x.ind?'・'+x.ind:''}${x.wants?'　★ 想請老師分組':''}`,ul);
 }
}
csvBtn.addEventListener('click',()=>{
 if(!data){status.textContent='先載入。';return;}
 const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const lines=[['班級','組名','組碼','組的產業線','鎖定','學號','姓名','方向一','方向二','方向三','Week 4 產業','想請老師分組'].join(',')];
 for(const c of data.classes){
  const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w4=(data.week4||[]).filter(r=>r.class_id===c.id);
  const nameOf=id=>roster.find(r=>r.student_id===id)?.student_name||w1.find(r=>r.student_id===id)?.student_name||'';
  const indOf=id=>{const r=w4.find(x=>x.student_id===id);return r?industryName(normalizeWeek4(r.data)):'';};
  const teams=(data.teams||[]).filter(t=>t.class_id===c.id),members=(data.team_members||[]).filter(m=>m.class_id===c.id);
  const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...members.map(m=>m.student_id)])].sort();
  for(const id of ids){const m=members.find(x=>x.student_id===id);const t=m?.team_id?teams.find(x=>x.id===m.team_id):null;const d=normalizeDirections(m?.directions);
   lines.push([c.name,t?.name||'',t?.code||'',t?industryLabel(t.industry):'',t?.locked?'是':'',id,nameOf(id),d.includes(1)?'✓':'',d.includes(2)?'✓':'',d.includes(3)?'✓':'',indOf(id),m?.wants_assignment&&!t?'是':''].map(q).join(','));}
 }
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Week8_分組.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
