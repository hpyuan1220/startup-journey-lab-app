import {COMPANIES,ISLANDS,DIRECTIONS,companyById,islandById,boxScore,EST_BONUS} from './islands-data.mjs?v=20261109-sync';
import {normalizeDirections,teamSummary} from './team-core.mjs?v=20261106-tm';
// 教師洞察 · Week 9 群島尋寶：誰還沒進來、誰沒組、各組方向缺口；每人圈了哪些候選、開了哪些箱（分數、第三題網址、探索／找碴、估價）。
// 只讀。分數不進成績（記錄用）。資料來源：teacher_load 的 islands（islands_progress）、teams／team_members、roster／week1。
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-islands';root.className='tw4';
const anchor=document.getElementById('teacher-team')||dashboard.querySelector('.statusbar')||dashboard;anchor.after(root);
el('h2','Week 9 群島尋寶：誰開了哪些箱（11/27 起）',root);
el('p','上課前看三件事：① 還沒登入過 app 的人（名單有、沒任何作業）② 登入了但沒組的人 ③ 哪一組三個方向沒認滿。下面每人一列：方向、候選、開過的箱與分數、第三題貼的網址、探索站／找碴、估價。分數只是紀錄，不進成績。',root);
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');
const reloadBtn=el('button','重新載入群島',bar,'quiet');reloadBtn.type='button';
const csvBtn=el('button','匯出群島 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);
let data=null;
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
let tries=0;
async function load(){status.textContent='正在載入群島…';try{data=await call({action:'teacher_load'});render();status.textContent='';}catch(e){status.textContent=e.message;if(!data&&tries++<2)setTimeout(load,2500);}}// 老師剛登入時 token 可能還在換新，失敗就隔 2.5 秒再試兩次
reloadBtn.addEventListener('click',load);
const dirShort=id=>DIRECTIONS.find(d=>d.id===id)?.name.split('｜')[0]||'';
function rows(c){
 const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),members=(data.team_members||[]).filter(m=>m.class_id===c.id),teams=(data.teams||[]).filter(t=>t.class_id===c.id),isl=(data.islands||[]).filter(r=>r.class_id===c.id);
 const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...members.map(m=>m.student_id),...isl.map(r=>r.student_id)])].sort();
 const nameOf=id=>roster.find(r=>r.student_id===id)?.student_name||w1.find(r=>r.student_id===id)?.student_name||'';
 const everLogged=new Set([...w1.map(r=>r.student_id),...(data.rows||[]).filter(r=>r.class_id===c.id).map(r=>r.student_id),...(data.week4||[]).filter(r=>r.class_id===c.id).map(r=>r.student_id),...(data.week_class||[]).filter(r=>r.class_id===c.id).map(r=>r.student_id),...members.map(m=>m.student_id),...isl.map(r=>r.student_id)]);
 return ids.map(id=>{const m=members.find(x=>x.student_id===id),t=m?.team_id?teams.find(x=>x.id===m.team_id):null,p=isl.find(x=>x.student_id===id)?.data||null;
  const boxes=Object.entries(p?.boxes||{}).map(([cid,b])=>({c:companyById(cid),b})).filter(x=>x.c&&(x.b.found||x.b.passed>0||x.b.opened));
  return {id,name:nameOf(id),logged:everLogged.has(id),team:t,dirs:normalizeDirections(m?.directions),gameDir:Number(p?.dir)||0,cands:(p?.candidates||[]).map(companyById).filter(Boolean),boxes,saved:p?.saved_at||'',rep:p?.rep||null};});
}
function render(){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const R=rows(c),members=(data.team_members||[]).filter(m=>m.class_id===c.id),teams=(data.teams||[]).filter(t=>t.class_id===c.id);
  const notLogged=R.filter(r=>!r.logged),noTeam=R.filter(r=>r.logged&&!r.team),gaps=teams.map(t=>({t,sm:teamSummary(t,members)})).filter(x=>!x.sm.complete);
  const opened=R.filter(r=>r.boxes.some(x=>x.b.opened)).length,boxesN=R.reduce((n,r)=>n+r.boxes.filter(x=>x.b.opened).length,0);
  const live=el('div','',sec,'tw4-live');const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(notLogged.length,'還沒登入過');stat(noTeam.length,'登入了沒組');stat(gaps.length,'方向沒認滿的組');stat(R.filter(r=>r.cands.length).length,'圈了候選');stat(opened,'開過箱的人');stat(boxesN,'開箱總數');
  const chk=el('div','',sec,'ti-checks');
  const block=(title,items,empty)=>{const d=el('div','',chk,'ti-check');el('h4',title,d);if(!items.length){el('p',empty,d,'w4-hint');return;}const ul=el('ul','',d);for(const x of items)el('li',x,ul);};
  block('① 還沒登入過（'+notLogged.length+'）',notLogged.map(r=>r.id+' '+r.name),'全班都進來過。');
  block('② 登入了、沒有組（'+noTeam.length+'）',noTeam.map(r=>r.id+' '+r.name),'有登入的人都有組。');
  block('③ 三個方向沒認滿（'+gaps.length+' 組）',gaps.map(x=>x.t.name+'：'+x.sm.missing.join('；')),'每組三個方向都有人。');
  // 每人一列
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap,'tm-table ti-table');const tr=el('tr','',el('thead','',table));
  for(const x of ['學號','姓名','組','認的方向','遊戲方向','候選','開過的箱（分數）','第三題網址','探索／找碴','估價','最後存檔'])el('th',x,tr);
  const tb=el('tbody','',table);
  for(const r of R){
   const row=el('tr','',tb);if(!r.logged)row.classList.add('ti-dim');
   el('td',r.id,row);el('td',r.name,row);el('td',r.team?r.team.name:(r.logged?'—':'未登入'),row,r.logged&&!r.team?'ti-warn':'');
   el('td',r.dirs.map(dirShort).join('、'),row);el('td',r.gameDir?dirShort(r.gameDir)+(r.dirs.length&&!r.dirs.includes(r.gameDir)?'（≠認領）':''):'',row,r.gameDir&&r.dirs.length&&!r.dirs.includes(r.gameDir)?'ti-warn':'');
   el('td',r.cands.map(c=>c.name).join('、'),row);
   const bt=el('td','',row);for(const {c,b} of r.boxes){const s=el('span',c.name+(b.opened?' '+boxScore(b.scores)+'/30'+(b.estOk?' +'+EST_BONUS:''):b.passed>0?' 三題 '+b.passed+'/3':b.found?' 找到島':''),bt,'ti-box'+(b.opened?' ti-open':''));s.title=islandById(c.island)?.name||'';}
   const ut=el('td','',row);for(const {c,b} of r.boxes){if(!b.url)continue;const a=el('a',c.name,ut,'ui');a.href=b.url;a.target='_blank';a.rel='noopener noreferrer';a.title=b.url;}
   el('td',r.boxes.filter(x=>x.b.deep).map(x=>x.c.name+(x.b.insight?'：'+x.b.insight.slice(0,40):'')+(x.b.argue?'｜找碴：'+x.b.argue.slice(0,40):'')).join('\n'),row,'ti-pre');
   el('td',r.boxes.filter(x=>x.b.est).map(x=>x.c.name+'：'+x.b.est+(x.b.estOk?' ✓':' ✗')).join('\n'),row,'ti-pre');
   el('td',r.saved?new Date(r.saved).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'',row);
  }
  if(!R.length)el('p','還沒有名單。',sec,'w4-hint');
 }
}
csvBtn.addEventListener('click',()=>{if(!data)return;const lines=[['班級','學號','姓名','登入過','組','認的方向','遊戲方向','候選','公司','島','找到島','三題','分數','估價','估價對','第三題網址','探索筆記','找碴','開箱時間','最後存檔'].join(',')];
 const q=v=>'"'+String(v??'').replace(/"/g,'""').replace(/\n/g,' ')+'"';
 for(const c of data.classes)for(const r of rows(c)){const base=[c.name,r.id,r.name,r.logged?'是':'',r.team?.name||'',r.dirs.map(dirShort).join('、'),r.gameDir?dirShort(r.gameDir):'',r.cands.map(x=>x.name).join('、')];
  if(!r.boxes.length)lines.push([...base,'','','','','','','','','','','',r.saved].map(q).join(','));
  for(const {c:co,b} of r.boxes)lines.push([...base,co.name,islandById(co.island)?.name||'',b.found?'是':'',b.passed,b.opened?boxScore(b.scores):'',b.est||'',b.est?(b.estOk?'是':'否'):'',b.url||'',b.insight||'',b.argue||'',b.at||'',r.saved].map(q).join(','));}
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='islands-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
