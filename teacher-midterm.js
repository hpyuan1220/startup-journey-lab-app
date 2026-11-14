import {normalizeWeek4,industryName} from './week4-core.mjs?v=20261105-cq';
import {normalizeWeek5,totals,topChoice,parseRebuttal,OPP_KEYS,MAX_SCORE,FIVE_QUESTIONS} from './week5-core.mjs?v=20261104-rb';
import {findRemark,mergeRemarks,listenRemarks} from './teacher-remarks.mjs?v=20261025-w5';
import {paySentence,fitSentence} from './note-v2.mjs?v=20261105-mt5';
// 教師洞察 · Week 7 期中報告評分表（11/13 上台；規格 docs/AI_GRADING_SPEC.md）
// 2026-11-12 老師定：總分 100＝B 完成度 30（app Week 4 五項＋Week 5 五項各 3 分，電腦算）＋P PDF 20（TronClass Week 4、Week 5 研究報告各 10，老師勾）＋C 上台 0–50（老師打）。依學號＝上台順序。
// 分數存在 teacher_remarks 的 week 7 note（學生看不到），格式「MT2|p=1,0|c=42」。舊格式 MT1（a 七項＋c 0–20）仍可讀：a 只保留不計分，c 照原值。
// A 內容七項 0／5／10 的判準留著當展開時的參考（RUBRIC），不進總分。
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
export const C_MAX=50,P_EACH=10,B_EACH=3;
export function parseScore(note){
 const s=String(note||'').trim();const out={a:Array(7).fill(null),p:[false,false],c:null};if(!s)return out;
 if(/^MT2\|/.test(s)){for(const part of s.split('|').slice(1)){const [k,v]=part.split('=');if(k==='p'){const q=(v||'').split(',');out.p=[q[0]==='1',q[1]==='1'];}if(k==='c'){const n=Number(v);out.c=v!==''&&Number.isInteger(n)&&n>=0&&n<=C_MAX?n:null;}}return out;}
 if(/^MT1\|/.test(s)){for(const part of s.split('|').slice(1)){const [k,v]=part.split('=');if(k==='a')(v||'').split(',').slice(0,7).forEach((x,i)=>{out.a[i]=x===''?null:[0,5,10].includes(Number(x))?Number(x):null;});if(k==='c'){const n=Number(v);out.c=v!==''&&Number.isFinite(n)&&n>=0&&n<=20?n:null;}}return out;}
 const n=Number(s);if(Number.isFinite(n)&&n>=0&&n<=20)out.c=n;return out;
}
export const formatScore=sc=>`MT2|p=${sc.p[0]?1:0},${sc.p[1]?1:0}|c=${sc.c===null?'':sc.c}`;
export const scoreTotal=(comp,sc)=>comp.total*B_EACH+(sc.p[0]?P_EACH:0)+(sc.p[1]?P_EACH:0)+(sc.c||0);
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
el('h2','Week 7 期中報告評分表（總分 100＝完成度 30＋PDF 20＋上台 50）',root);
el('p','依學號＝11/13 上台順序。B 完成度 30：app Week 4 五項＋Week 5 五項各 3 分，電腦算；P PDF 20：TronClass「Week 4 研究報告」「Week 5 研究報告」各 10，勾選（可用下面「貼上已交學號」一次勾完）；C 上台 0–50 你現場打。點了就存，學生看不到。點學號展開可看七項內容與判準（參考，不計分）。PDF 交在 TronClass，這裡評的是 app 裡的 Week 4＋5 內容；PDF 寫得比 app 好可以加在 A。',root,'tw2-intro');
const legend=el('details','',root,'tw4-detail');el('summary','內容七項判準（參考用，不計分）',legend);
for(const [i,[h,t]] of RUBRIC.entries())el('p',`${i+1}. ${h}　${t}`,legend);
el('p','B 完成度（各 3 分）：Week 4 產業線、卡 1、卡 2、卡 3、課堂兩題；Week 5 計分表、選一個、反方 ≥1 回合、一頁六段、課堂兩題。　P PDF：Week 4、Week 5 研究報告各 10。　C 上台：2 分鐘內講完四段，0–50。',legend);
const status=el('p','',root);status.setAttribute('role','status');
const bar=el('div','',root,'w4-row');
const reloadBtn=el('button','重新載入評分表',bar,'quiet');reloadBtn.type='button';
const csvBtn=el('button','匯出期中成績 CSV',bar,'quiet');csvBtn.type='button';
const paste=el('details','',root,'tw4-detail');el('summary','貼上 TronClass 已交學號，一次勾 PDF',paste);
el('p','從 TronClass 作業頁複製「已繳」的學號（整頁貼上也行，會自動抓 A 開頭的學號）。沒在名單裡的會被取消勾選，所以要貼完整名單。',paste,'w4-hint');
const pRow=el('div','',paste,'w4-row');const pSel=el('select','',pRow);for(const [v,t] of [['0','Week 4 研究報告'],['1','Week 5 研究報告']]){const o=el('option',t,pSel);o.value=v;}
const pTa=el('textarea','',paste);pTa.rows=3;pTa.style.width='100%';pTa.placeholder='A113279999 王小明 已繳 … 或一行一個學號';pTa.setAttribute('aria-label','已交學號');
const pBtn=el('button','套用到這一欄',pRow,'primary');pBtn.type='button';const pSt=el('span','',pRow,'w4-hint');
pBtn.addEventListener('click',async()=>{if(!data)return;const ids=new Set((pTa.value.match(/A\d{8,10}/g)||[]).map(x=>x.toUpperCase()));if(!ids.size){pSt.textContent='沒抓到學號。';return;}const col=Number(pSel.value);let n=0,changed=0;pBtn.disabled=true;
 for(const c of data.classes)for(const x of rowsFor(c)){const want=ids.has(x.id);if(x.sc.p[col]!==want){x.sc.p[col]=want;await saveScore(c,x,pSt);changed++;}if(want)n++;}
 pBtn.disabled=false;pSt.textContent=`已套用：${n} 人已交，改了 ${changed} 列。`;render();});
const body=el('div','',root);
let data=null;const open=new Set();
async function call(b,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(b,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
async function load(){status.textContent='正在載入評分表…';try{data=await call({action:'teacher_load'});render();}catch(e){status.textContent=e.message;}}
reloadBtn.addEventListener('click',load);
listenRemarks(()=>data,()=>load());
function rowsFor(c){
 const roster=(data.roster||[]).filter(r=>r.class_id===c.id),w1=(data.week1||[]).filter(r=>r.class_id===c.id),w4=(data.week4||[]).filter(r=>r.class_id===c.id),w5=(data.week5||[]).filter(r=>r.class_id===c.id);
 const tm=(data.team_members||[]).filter(r=>r.class_id===c.id);
 const ids=[...new Set([...roster.map(r=>r.student_id),...w1.map(r=>r.student_id),...w4.map(r=>r.student_id),...w5.map(r=>r.student_id),...tm.map(r=>r.student_id)])].sort();
 const nameOf=id=>roster.find(r=>r.student_id===id)?.student_name||w1.find(r=>r.student_id===id)?.student_name||'';
 return ids.map((id,i)=>{
  const r4=w4.find(x=>x.student_id===id),r5=w5.find(x=>x.student_id===id);
  const d4=r4?normalizeWeek4(r4.data):null,d5=r5?normalizeWeek5(r5.data):null;
  const key=d5?(d5.choice.key||''):'',t=d5?totals(d5):null,top=d5?topChoice(d5):'';
  const opp=key?(d5.opps[OPP_KEYS.indexOf(key)]||d4?.card3.opps[OPP_KEYS.indexOf(key)]||''):'';
  const rm=findRemark(data.remarks,c.id,id,WEEK);const sc=parseScore(rm?.note);
  const comp=completion(d4,r4?.stamps,d5,r5?.stamps);
  const aSum=sc.a.reduce((s,x)=>s+(x||0),0),aDone=sc.a.filter(x=>x!==null).length;
  const total=scoreTotal(comp,sc);
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
  stat(rows.length,'上台人數');stat(rows.filter(x=>x.sc.p[0]).length,'W4 PDF 已交');stat(rows.filter(x=>x.sc.p[1]).length,'W5 PDF 已交');stat(rows.filter(x=>x.sc.c!==null).length,'上台已打分');
  const done=rows.filter(x=>x.sc.c!==null);stat(done.length?Math.round(done.reduce((s,x)=>s+x.total,0)/done.length):'—','已打分的平均');
  const wrap=el('div','',sec,'tw4-wrap');const table=el('table','',wrap);const tr=el('tr','',el('thead','',table));
  for(const h of ['順序','學生','產業線','選定的機會','B 完成 /30','P PDF /20','C 上台 /50','總分 /100'])el('th',h,tr);
  const tbody=el('tbody','',table);
  for(const x of rows){
   const r=el('tr','',tbody);
   el('td',String(x.n),r);
   const idTd=el('td','',r);const btn=el('button',(open.has(x.id)?'▾ ':'▸ ')+x.id+(x.name?`　${x.name}`:''),idTd,'quiet');btn.type='button';btn.style.padding='2px 6px';
   btn.addEventListener('click',()=>{if(open.has(x.id))open.delete(x.id);else open.add(x.id);render();});
   const ti=el('td',x.ind||'—',r);if(!x.ind)ti.className='tw4-no';
   const to=el('td','',r);if(x.key){to.textContent=`${x.key}　${(x.opp||'').slice(0,40)}`;if(x.nonTop)el('span',' 非最高分',to,'tw4-out');}else{to.textContent='還沒選';to.className='tw4-no';}
   el('td',`${x.comp.total*B_EACH}（${x.comp.total}/10 項）`,r);
   const pTd=el('td','',r);for(const [i,lab] of [[0,'W4'],[1,'W5']]){const l=el('label','',pTd);l.style.marginRight='8px';const cb=el('input','',l);cb.type='checkbox';cb.checked=x.sc.p[i];cb.setAttribute('aria-label',`${x.id} ${lab} PDF 已交`);l.append(' '+lab);cb.addEventListener('change',()=>{x.sc.p[i]=cb.checked;saveScore(c,x,pSt2).then(()=>render());});}
   const pSt2=el('span','',pTd,'w4-hint');
   const cTd=el('td','',r);const cIn=el('input','',cTd);cIn.type='number';cIn.min='0';cIn.max=String(C_MAX);cIn.step='1';cIn.style.width='4.5em';cIn.value=x.sc.c===null?'':String(x.sc.c);cIn.setAttribute('aria-label',`${x.id} 上台分數（0–${C_MAX}）`);
   const cSt=el('span','',cTd,'w4-hint');
   cIn.addEventListener('change',()=>{const v=cIn.value.trim();const n=Number(v);if(v!==''&&!(Number.isInteger(n)&&n>=0&&n<=C_MAX)){cSt.textContent=' 0–'+C_MAX;return;}x.sc.c=v===''?null:n;saveScore(c,x,cSt).then(()=>render());});
   cIn.addEventListener('keydown',e=>{if(e.key==='Enter')cIn.blur();});
   el('td',x.sc.c!==null?String(x.total):`${x.total}（上台未打）`,r);
   if(open.has(x.id)){
    const dr=el('tr','',tbody);const td=el('td','',dr);td.colSpan=8;const box=el('div','',td,'tw4-detail');
    const st=el('span','',box,'w4-hint');
    RUBRIC.forEach(([h,desc],i)=>{
     const item=el('div','',box);item.style.borderTop='1px solid #e6dfcf';item.style.padding='6px 0';
     const head=el('div','',item);el('b',`${i+1}. ${h}　`,head);

     el('p',desc,item,'w4-hint');
     const ev=el('p',evidence(x,i),item);ev.style.whiteSpace='pre-wrap';ev.style.background='#fff';ev.style.padding='6px 8px';ev.style.borderRadius='6px';
    });
    el('p',`B 完成度：Week 4 ${x.comp.w4.filter(Boolean).length}/5（產業線、卡 1、卡 2、卡 3、兩題）・Week 5 ${x.comp.w5.filter(Boolean).length}/5（計分、選、反方、一頁、兩題）＝${x.comp.total*B_EACH} 分`,box);
   }
  }
  if(!rows.length)el('p','這個班還沒有名單。',sec);
 }
 status.textContent=`${data.classes.length} 個授權班級 · 依學號排序＝上台順序。完成度電腦算、PDF 勾、上台打分。`;
}
csvBtn.addEventListener('click',()=>{
 if(!data){status.textContent='先載入評分表。';return;}
 const q=v=>{const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const head=['班級','順序','學號','姓名','產業線','選定的機會','機會一句話','B 完成度 /30','完成項數 /10','W4 PDF','W5 PDF','P PDF /20','C 上台 /50','總分 /100'];
 const lines=[head.join(',')];
 for(const c of data.classes)for(const x of rowsFor(c))lines.push([c.name,x.n,x.id,x.name,x.ind,x.key,x.opp,x.comp.total*B_EACH,x.comp.total,x.sc.p[0]?1:0,x.sc.p[1]?1:0,(x.sc.p[0]?P_EACH:0)+(x.sc.p[1]?P_EACH:0),x.sc.c??'',x.total].map(q).join(','));
 const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Week7_期中成績.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
});
const obs=new MutationObserver(()=>{if(!dashboard.hidden&&!data)load();});obs.observe(dashboard,{attributes:true,attributeFilter:['hidden']});
if(!dashboard.hidden)load();
}
