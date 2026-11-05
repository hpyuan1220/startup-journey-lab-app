import {normalizeWeek4,industryName} from './week4-core.mjs?v=20261105-cq';
import {normalizeWeek5,totals,topChoice,parseRebuttal,OPP_KEYS,MAX_SCORE} from './week5-core.mjs?v=20261104-rb';
import {findRemark,mergeRemarks,listenRemarks} from './teacher-remarks.mjs?v=20261025-w5';
// 教師洞察 · 期中名單（Week 7，11/13 上台）：依學號一人一列＝上台順序。
// 看產業線、選定的機會（那一句話）、總分、反方回合、一頁段數；「上台分數」一欄，存進 teacher_remarks（week 7 的 note，學生看不到）。
const WEEK=7;
const dashboard=document.getElementById('teacher-dashboard');
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-week7';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
el('h2','Week 7 期中名單：上台順序（依學號）、產業線、選定的機會、上台分數',root);
el('p','11/13 13:00–17:00 依學號順序上台 2 分鐘。產業線來自 Week 4、選定的機會與總分來自 Week 5 比較頁。「上台分數」只有你看得到，打完離開欄位就存（存在 Week 7 的老師備註）。PDF 是交到 TronClass，這裡看不到。',root,'tw2-intro');
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');
const reloadBtn=el('button','重新載入期中名單',bar,'quiet');reloadBtn.type='button';
const csvBtn=el('button','匯出上台順序表 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);
let data=null;
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入期中名單…';try{data=await call({action:'teacher_load'});render();}catch(e){status.textContent=e.message;}}
reloadBtn.addEventListener('click',load);
listenRemarks(()=>data,()=>load());
function rowsFor(c){
 const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w4=(data.week4||[]).filter(r=>r.class_id===c.id),w5=(data.week5||[]).filter(r=>r.class_id===c.id);
 const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...w4.map(r=>r.student_id),...w5.map(r=>r.student_id)])].sort();
 const nameOf=id=>roster.find(r=>r.student_id===id)?.student_name||w1.find(r=>r.student_id===id)?.student_name||'';
 return ids.map((id,i)=>{
  const r4=w4.find(x=>x.student_id===id),r5=w5.find(x=>x.student_id===id);
  const d4=r4?normalizeWeek4(r4.data):null,d5=r5?normalizeWeek5(r5.data):null;
  const key=d5?(d5.choice.key||''):'',t=d5?totals(d5):null,top=d5?topChoice(d5):'';
  const opp=key?(d5.opps[OPP_KEYS.indexOf(key)]||d4?.card3.opps[OPP_KEYS.indexOf(key)]||''):'';
  const rb=d5?parseRebuttal(d5.rebuttal.text):{rounds:[]};
  const rm=findRemark(data.remarks,c.id,id,WEEK);
  return {n:i+1,id,name:nameOf(id),ind:d4?industryName(d4):'',key,opp,sum:key&&t?t[key].sum:null,nonTop:!!(key&&top&&key!==top),rounds:rb.rounds.length,pageN:d5?d5.page.filter(Boolean).length:0,rm};
 });
}
function render(){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const rows=rowsFor(c);
  const live=el('div','',sec,'tw4-live');const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(rows.length,'上台人數');stat(rows.filter(x=>x.ind).length,'有產業線');stat(rows.filter(x=>x.key).length,'選了機會');stat(rows.filter(x=>x.rounds>=3).length,'反方三回合');stat(rows.filter(x=>x.rm?.note).length,'已打分');
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const tr=el('tr','',el('thead','',table));
  for(const h of ['順序','學生','產業線','選定的機會','總分','反方','一頁','上台分數'])el('th',h,tr);
  const tbody=el('tbody','',table);
  for(const x of rows){
   const r=el('tr','',tbody);
   el('td',String(x.n),r);el('td',x.id+(x.name?`　${x.name}`:''),r);
   const ti=el('td',x.ind||'—',r);if(!x.ind)ti.className='tw4-no';
   const to=el('td','',r);if(x.key){to.textContent=`${x.key}　${x.opp||'（機會那一句是空的）'}`;if(x.nonTop)el('span',' 非最高分',to,'tw4-out');}else{to.textContent='還沒選';to.className='tw4-no';}
   el('td',x.sum===null?'—':`${x.sum}/${MAX_SCORE}`,r);el('td',`${x.rounds}/3`,r);el('td',`${x.pageN}/6`,r);
   const sc=el('td','',r);const inp=el('input','',sc);inp.type='text';inp.maxLength=20;inp.style.width='5.5em';inp.placeholder='分數';inp.value=x.rm?.note||'';inp.setAttribute('aria-label',`${x.id} 上台分數`);
   const st=el('span','',sc,'w4-hint');
   let last=inp.value;
   const save=async()=>{const v=inp.value.trim();if(v===last)return;st.textContent=' 存…';try{const res=await call({action:'teacher_remark',class_id:c.id,student_id:x.id,week:WEEK,tag:x.rm?.tag||'',note:v});last=v;mergeRemarks(data,c.id,x.id,res.remarks||[]);x.rm=findRemark(data.remarks,c.id,x.id,WEEK);st.textContent=' 已存';window.dispatchEvent(new CustomEvent('sjl-remarks',{detail:{classId:c.id,studentId:x.id,rows:res.remarks||[]}}));}catch(e){st.textContent=' '+e.message;}};
   inp.addEventListener('change',save);inp.addEventListener('keydown',e=>{if(e.key==='Enter')inp.blur();});
  }
  if(!rows.length)el('p','這個班還沒有名單。',sec);
 }
 status.textContent=`${data.classes.length} 個授權班級 · 依學號排序＝上台順序。`;
}
csvBtn.addEventListener('click',()=>{
 if(!data){status.textContent='先載入名單。';return;}
 const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const lines=[['班級','順序','學號','姓名','產業線','選定的機會','機會一句話','總分','非最高分','反方回合','一頁段數','上台分數'].join(',')];
 for(const c of data.classes)for(const x of rowsFor(c))lines.push([c.name,x.n,x.id,x.name,x.ind,x.key,x.opp,x.sum??'',x.nonTop?'是':'',x.rounds,x.pageN,x.rm?.note||''].map(q).join(','));
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Week7_期中上台順序.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
