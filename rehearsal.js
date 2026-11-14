import {FINAL_PAGE_TITLES} from './final-core.mjs?v=20261114-fin2';
// Week 11／12 頁：本組上台講評（老師在老師頁寫的六句＋10 分鐘內＋整體；team_load 的 rehearsal）。只讀。
const WEEK=new URLSearchParams(location.search).get('week');const root=WEEK==='12'?document.querySelector('#rehearsal-12[data-rehearsal]'):document.querySelector('#rehearsal[data-rehearsal]');
if(root&&(WEEK==='11'||WEEK==='12')){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const cfg=window.STARTUP_JOURNEY_CONFIG||{};let session=null;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
const box=el('div','',root,'rh-view');el('p','WEEK '+WEEK+' · 本組講評',box,'eyebrow');const h=el('h3','本組講評',box);const body=el('div','',box);
(async()=>{if(!session?.token){el('p','先用學號和邀請碼進入，才看得到本組講評。',body,'w4-hint');return;}
 try{const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({action:'team_load',token:session.token})});const j=await r.json();if(!r.ok)throw Error(j.error||'連線失敗');
  if(!j.team){el('p','你還沒有組。到 Week 9 頁建組或加入。',body,'w4-hint');return;}h.textContent=`${j.team.name}：本組講評`;const o=j.rehearsal;
  if(!o||(!o.notes.some(Boolean)&&!o.general&&o.onTime===null)){el('p','老師還沒寫講評（你們上台後出現）。',body,'w4-hint');return;}
  el('p',o.onTime===null?'':o.onTime?'✅ 10 分鐘內講完':'⚠️ 超過 10 分鐘——每頁砍到 90 秒',body);const ol=el('ol','',body);FINAL_PAGE_TITLES.forEach((t,i)=>{const li=el('li','',ol);el('b',t+'：',li);el('span',o.notes[i]||'（沒有特別要改）',li);});if(o.general)el('p','整體：'+o.general,body);
  el('p','照講評修 PDF 五段，12/25 23:59 前交 TronClass；需要重排就回 Week 10 頁「期末框架」再複製一次。',body,'w4-hint');}catch(e){el('p',e.message,body,'w4-hint');}})();
}
