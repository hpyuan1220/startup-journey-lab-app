import {normalizeWeek4,industryName} from './week4-core.mjs?v=20261105-cq';
import {normalizeWeek5,totals,topChoice,parseRebuttal,OPP_KEYS,MAX_SCORE,FIVE_QUESTIONS} from './week5-core.mjs?v=20261104-rb';
import {findRemark,mergeRemarks,listenRemarks} from './teacher-remarks.mjs?v=20261025-w5';
import {paySentence,fitSentence} from './note-v2.mjs?v=20261105-mt5';
// 教師洞察 · Week 7 期中報告評分表（11/13 上台；規格 docs/AI_GRADING_SPEC.md）
// 總分 100＝A 內容七項×10（老師點 0／5／10）＋B 完成度 10（電腦算）＋C 上台 0–20（老師打）。依學號＝上台順序。
// 分數存在 teacher_remarks 的 week 7 note（學生看不到），格式「MT1|a=10,5,,0,5,10,5|c=18」；舊格式（只有一個數字）當作上台分數。
// 之後加 AI 建議時，AI 只填建議，老師點過的才算（同一張表）。
const WEEK=7;
export const RUBRIC=[
 ['產業與痛','0：沒寫，或看不出痛跟產業的關係｜5：有產業線，沒說痛落在哪一段｜10：說出痛落在這一行哪一段；對不上的老實說比較像哪一行也算'],
 ['錢流','0：沒有誰付錢給誰｜5：有誰付給誰，沒數字｜10：誰 → 付給誰 → 付什麼錢＋一個數字（估計可以）'],
 ['挑戰與來源','0：沒有困難，或只有 AI 的話｜5：有困難，沒來源｜10：至少一個業者的困難附來源名稱'],
 ['三個機會','0：沒有，或只寫「做 App」｜5：有機會，沒有第一個付錢的人｜10：三個都說出誰的困難 → 第一個付錢的人'],
 ['五問證據','0：沒打分或全沒證據｜5：一半以上的格有證據｜10：選定機會五格都有證據，沒把握的標估計'],
 ['選擇與一頁','0：沒選或一頁空白｜5：有選、一頁寫一半，或非最高分沒理由｜10：選定有理由，一頁六段都有主張＋證據'],
 ['反方','0：沒做｜5：一兩回合、回應空泛｜10：三回合，至少一回合用證據回應，或老實寫輸在哪、下一步補什麼'],
];
export function parseScore(note){
 const s=String(note||'').trim();const out={a:Array(7).fill(null),c:null};if(!s)return out;
 if(/^MT1\|/.test(s)){for(const part of s.split('|').slice(1)){const [k,v]=part.split('=');if(k==='a')(v||'').split(',').slice(0,7).forEach((x,i)=>{out.a[i]=x===''?null:[0,5,10].includes(Number(x))?Number(x):null;});if(k==='c'){const n=Number(v);out.c=v!==''&&Number.isFinite(n)&&n>=0&&n<=20?n:null;}}return out;}
 const n=Number(s);if(Number.isFinite(n)&&n>=0&&n<=20)out.c=n;return out;
}
export const formatScore=sc=>`MT1|a=${sc.a.map(x=>x===null?'':x).join(',')}|c=${sc.c===null?'':sc.c}`;
// B 完成度 10：Week 4 五項、Week 5 五項，各 1 分。
export function completion(d4,st4,d5,st5){
 const w4=[!!(d4&&(d4.industry.card)),!!st4?.card1,!!st4?.card2,!!st4?.card3,!!(st4?.q1&&st4?.q2)];
 let w5=[false,false,false,false,!!(st5?.q1&&st5?.q2)];
 if(d5){const t=totals(d5);const keys=OPP_KEYS.filter((k,i)=>d5.opps[i]);w5=[keys.length>0&&keys.every(k=>t[k].complete),!!d5.choice.key,parseRebuttal(d5.rebuttal.text).rounds.length>=1,d5.page.filter(p=>String(p||'').trim()).length>=6,w5[4]];}
 return {w4,w5,total:[...w4,...w5].filter(Boolean).length};
}
const dashboard=typeof document!=='undefined'?document.getElementById('teacher-dashboard'):null;
if(dashboard){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const root=document.createElement('section');root.id='teacher-week7';root.className='tw4';(dashboard.querySelector('.statusbar')||dashboard).after(root);
el('h2','Week 7 期中報告評分表（總分 100）',root);
el('p','依學號＝11/13 上台順序。A 內容七項各 0／5／10（共 70），點學號展開，看學生的內容再點分數；B 完成度 10 分由電腦照 Week 4／5 有沒有做算；C 上台 0–20 你現場打。點了就存，學生看不到。PDF 交在 TronClass，這裡評的是 app 裡的 Week 4＋5 內容；PDF 寫得比 app 好可以加在 A。',root,'tw2-intro');
const legend=el('details','',root,'tw4-detail');el('summary','評分標準（A 七項 0／5／10）',legend);
for(const [i,[h,t]] of RUBRIC.entries())el('p',`${i+1}. ${h}　${t}`,legend);
el('p','B 完成度（各 1 分）：Week 4 產業線、卡 1、卡 2、卡 3、課堂兩題；Week 5 計分表、選一個、反方 ≥1 回合、一頁六段、課堂兩題。　C 上台：2 分鐘內講完四段，0–20。',legend);
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');
const reloadBtn=el('button','重新載入評分表',bar,'quiet');reloadBtn.type='button';
const csvBtn=el('button','匯出期中成績 CSV',bar,'quiet');csvBtn.type='button';
const body=el('div','',root);
let data=null;const open=new Set();
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入評分表…';try{data=await call({action:'teacher_load'});render();}catch(e){status.textContent=e.message;}}
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
  const rm=findRemark(data.remarks,c.id,id,WEEK);const sc=parseScore(rm?.note);
  const comp=completion(d4,r4?.stamps,d5,r5?.stamps);
  const aSum=sc.a.reduce((s,x)=>s+(x||0),0),aDone=sc.a.filter(x=>x!==null).length;
  const total=aSum+comp.total+(sc.c||0);
  return {n:i+1,id,name:nameOf(id),d4,d5,ind:d4?industryName(d4):'',key,opp,sum:key&&t?t[key].sum:null,nonTop:!!(key&&top&&key!==top),rm,sc,comp,aSum,aDone,total};
 });
}
async function saveScore(c,x,st){
 st.textContent=' 存…';
 try{const res=await call({action:'teacher_remark',class_id:c.id,student_id:x.id,week:WEEK,tag:x.rm?.tag||'',note:formatScore(x.sc)});mergeRemarks(data,c.id,x.id,res.remarks||[]);x.rm=findRemark(data.remarks,c.id,x.id,WEEK);st.textContent=' 已存';window.dispatchEvent(new CustomEvent('sjl-remarks',{detail:{classId:c.id,studentId:x.id,rows:res.remarks||[]}}));}
 catch(e){st.textContent=' '+e.message;}
}
function evidence(x,i){
 const a=x.d4,b=x.d5,cut=(s,n=220)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n)+'…':s;};
 if(i===0)return `產業線：${x.ind||'—'}\n我的痛：${cut(a?.pain,160)||'—'}\n卡 1 第一步：${a?fitSentence(a.card1.text,140)||'（抓不到）':'—'}`;
 if(i===1)return `錢流句：${a?paySentence(a.card1.text,160)||'（卡 1 找不到誰付錢的句子）':'—'}`;
 if(i===2)return `卡 2（${a?.card2.source||'未標'}）：${cut(a?.card2.text,320)||'—'}`;
 if(i===3)return OPP_KEYS.map((k,n)=>`${k}：${cut(b?.opps[n]||a?.card3.opps[n],120)||'—'}`).join('\n');
 if(i===4){if(!b||!x.key)return '還沒選機會。';return FIVE_QUESTIONS.map(q=>{const c=b.scores[x.key][q.key];return `${q.n}. ${q.title}：${c.score===null?'—':c.score}｜${cut(c.evidence,80)||'（沒證據）'}`;}).join('\n');}
 if(i===5){if(!b)return '—';return `選：${x.key||'—'}${x.nonTop?`（非最高分）理由：${cut(b.choice.reason,120)||'（沒寫）'}`:''}\n一頁：${b.page.filter(p=>String(p||'').trim()).length}/6 段｜${cut(b.page[0],100)}`;}
 if(i===6){if(!b)return '—';const rb=parseRebuttal(b.rebuttal.text);return rb.rounds.length?rb.rounds.map(r=>`拒絕 ${r.n}：${cut(r.reject,70)}\n回應 ${r.n}：${cut(r.reply,90)||'（沒回）'}`).join('\n')+(rb.summary?`\n總結：${cut(rb.summary,90)}`:''):cut(b.rebuttal.text,200)||'沒做';}
 return '';
}
function render(){
 body.replaceChildren();
 for(const c of data.classes){
  const sec=el('section','',body,'tw2-class');el('h3',c.name,sec);
  const rows=rowsFor(c);
  const live=el('div','',sec,'tw4-live');const stat=(n,label)=>{const b=el('div','',live);el('b',String(n),b);el('span',label,b);};
  stat(rows.length,'上台人數');stat(rows.filter(x=>x.aDone===7).length,'A 七項評完');stat(rows.filter(x=>x.sc.c!==null).length,'上台已打分');
  const done=rows.filter(x=>x.aDone===7&&x.sc.c!==null);stat(done.length?Math.round(done.reduce((s,x)=>s+x.total,0)/done.length):'—','評完的平均');
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const tr=el('tr','',el('thead','',table));
  for(const h of ['順序','學生','產業線','選定的機會','A 內容 /70','B 完成 /10','C 上台 /20','總分 /100'])el('th',h,tr);
  const tbody=el('tbody','',table);
  for(const x of rows){
   const r=el('tr','',tbody);
   el('td',String(x.n),r);
   const idTd=el('td','',r);const btn=el('button',(open.has(x.id)?'▾ ':'▸ ')+x.id+(x.name?`　${x.name}`:''),idTd,'quiet');btn.type='button';btn.style.padding='2px 6px';
   btn.addEventListener('click',()=>{if(open.has(x.id))open.delete(x.id);else open.add(x.id);render();});
   const ti=el('td',x.ind||'—',r);if(!x.ind)ti.className='tw4-no';
   const to=el('td','',r);if(x.key){to.textContent=`${x.key}　${(x.opp||'').slice(0,40)}`;if(x.nonTop)el('span',' 非最高分',to,'tw4-out');}else{to.textContent='還沒選';to.className='tw4-no';}
   el('td',`${x.aSum}${x.aDone<7?`（${x.aDone}/7 項）`:''}`,r);
   el('td',String(x.comp.total),r);
   const cTd=el('td','',r);const cIn=el('input','',cTd);cIn.type='number';cIn.min='0';cIn.max='20';cIn.step='1';cIn.style.width='4.5em';cIn.value=x.sc.c===null?'':String(x.sc.c);cIn.setAttribute('aria-label',`${x.id} 上台分數（0–20）`);
   const cSt=el('span','',cTd,'w4-hint');
   cIn.addEventListener('change',()=>{const v=cIn.value.trim();const n=Number(v);if(v!==''&&!(Number.isInteger(n)&&n>=0&&n<=20)){cSt.textContent=' 0–20';return;}x.sc.c=v===''?null:n;saveScore(c,x,cSt).then(()=>render());});
   cIn.addEventListener('keydown',e=>{if(e.key==='Enter')cIn.blur();});
   el('td',x.aDone===7&&x.sc.c!==null?String(x.total):`${x.total}（未完）`,r);
   if(open.has(x.id)){
    const dr=el('tr','',tbody);const td=el('td','',dr);td.colSpan=8;const box=el('div','',td,'tw4-detail');
    const st=el('span','',box,'w4-hint');
    RUBRIC.forEach(([h,desc],i)=>{
     const item=el('div','',box);item.style.borderTop='1px solid #e6dfcf';item.style.padding='6px 0';
     const head=el('div','',item);el('b',`${i+1}. ${h}　`,head);
     for(const v of [0,5,10]){const b=el('button',String(v),head,'trk-tag');b.type='button';b.setAttribute('aria-pressed',String(x.sc.a[i]===v));if(x.sc.a[i]===v){b.style.background='#2f6f86';b.style.color='#fff';}
      b.addEventListener('click',()=>{x.sc.a[i]=x.sc.a[i]===v?null:v;saveScore(c,x,st).then(()=>render());});}
     el('p',desc,item,'w4-hint');
     const ev=el('p',evidence(x,i),item);ev.style.whiteSpace='pre-wrap';ev.style.background='#fff';ev.style.padding='6px 8px';ev.style.borderRadius='6px';
    });
    el('p',`B 完成度：Week 4 ${x.comp.w4.filter(Boolean).length}/5（產業線、卡 1、卡 2、卡 3、兩題）・Week 5 ${x.comp.w5.filter(Boolean).length}/5（計分、選、反方、一頁、兩題）`,box);
   }
  }
  if(!rows.length)el('p','這個班還沒有名單。',sec);
 }
 status.textContent=`${data.classes.length} 個授權班級 · 依學號排序＝上台順序。點學號展開評 A 七項。`;
}
csvBtn.addEventListener('click',()=>{
 if(!data){status.textContent='先載入評分表。';return;}
 const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const head=['班級','順序','學號','姓名','產業線','選定的機會','機會一句話',...RUBRIC.map(([h],i)=>`A${i+1} ${h}`),'A 小計','B 完成度','C 上台','總分','A 已評項數'];
 const lines=[head.join(',')];
 for(const c of data.classes)for(const x of rowsFor(c))lines.push([c.name,x.n,x.id,x.name,x.ind,x.key,x.opp,...x.sc.a.map(v=>v===null?'':v),x.aSum,x.comp.total,x.sc.c??'',x.total,x.aDone].map(q).join(','));
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Week7_期中成績.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
