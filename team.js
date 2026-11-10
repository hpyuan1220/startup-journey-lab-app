import {INDUSTRY_CARDS} from './week4-core.mjs?v=20261106-tm';
import {DIRECTIONS,directionName,industryLabel,teamSummary,industryOptions,normalizeDirections,TEAM_LOCK_LABEL,TEAM_MAX,TEAM_MIN} from './team-core.mjs?v=20261106-tm';
import {teamReps,COMPANY_NAME} from './islands-core.mjs?v=20261110-rep';
// Week 7 建組（學生端）：掛在 Week 7 期中報告頁最下面（#team）。
// 沒有組：建組（拿四碼組碼）／輸入組碼加入／按「想請老師分組」。有組：組名與組碼、組員與各自認的方向、組的產業線（從組員 Week 4 選的產業挑）、離開。
// 12/19（期末後）才自動鎖；老師在老師頁鎖住的組也不能改。資料存 teams／team_members；每個動作都是一次 API，不用另外按存。
// Week 9 頁第一塊也掛同一套（data-team="9"）：標題改成「先確認我的組」，有組的人多一個「進群島」按鈕。
const WEEK=new URLSearchParams(location.search).get('week');
const root=document.querySelector(`[data-team="${WEEK}"]`);
if(root&&(WEEK==='7'||WEEK==='9')){
const W9=WEEK==='9';
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
const el=(tag,text,parent=root,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const sec=el('section','',root,'w4 tm');
el('p',W9?'WEEK 9 · 先確認我的組':'WEEK 7 · 建組',sec,'eyebrow');
el('h2',W9?'我的組與方向':'建組：三人一組、三個方向各認一人',sec);
el('p',`自己找組員（${TEAM_MIN}–${TEAM_MAX} 人）：組長按「建一組」拿到四碼組碼，組員輸入組碼加入。每人認領一個方向（兩人組一人認兩個），下半學期各自研究那個方向的 AI 新創，期末全組選一家上台。組的產業線選填。整學期都可以改（${TEAM_LOCK_LABEL} 期末後鎖定）；還沒找到組的人按「想請老師分組」，老師會在課堂上幫你分。`,sec,'w4-hint');
const msg=el('p','',sec,'w4-msg');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
const body=el('div','',sec);
let st=null;
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok){const e=Error(b.error||`連線失敗 ${r.status}`);e.status=r.status;throw e;}return b;}
async function run(body,okText){msg.textContent='處理中…';try{st=await api(body);render();msg.textContent=okText||'';}catch(e){msg.textContent=e.message;render();}}
function render(){
 body.replaceChildren();
 if(!session?.token){el('p',W9?'先用學號和邀請碼進入（首頁「學生起點卡」），才看得到你的組、才能進群島。':'先用學號和邀請碼進入，才能建組。',body,'w4-hint');return;}
 if(!st)return;
 const {team,members,me,locked,names,week4}=st;
 if(!team){
  if(locked){el('p','建組已鎖定。你還沒有組：請直接找老師。',body,'w4-lock');return;}
  const grid=el('div','',body,'tm-grid');
  const c1=el('div','',grid,'tm-card');el('h3','我是組長：建一組',c1);const nameIn=el('input','',c1);nameIn.type='text';nameIn.maxLength=30;nameIn.placeholder='組名（例：火鍋隊）';nameIn.setAttribute('aria-label','組名');
  const cb=el('button','建一組、拿組碼',c1,'primary-link');cb.type='button';cb.addEventListener('click',()=>run({action:'team_create',name:nameIn.value},'建好了：把組碼給組員。'));
  const c2=el('div','',grid,'tm-card');el('h3','我是組員：輸入組碼加入',c2);const codeIn=el('input','',c2);codeIn.type='text';codeIn.maxLength=4;codeIn.placeholder='四碼組碼';codeIn.style.textTransform='uppercase';codeIn.setAttribute('aria-label','組碼');
  const jb=el('button','加入這一組',c2,'primary-link');jb.type='button';jb.addEventListener('click',()=>run({action:'team_join',code:codeIn.value},'加入了。'));
  const c3=el('div','',grid,'tm-card');el('h3','還沒找到組',c3);el('p','按一下，老師會在老師頁看到你，課堂上幫你分組。',c3,'w4-hint');
  const wb=el('button',me?.wants_assignment?'已登記：想請老師分組（再按一次取消）':'想請老師分組',c3,'button-link');wb.type='button';wb.addEventListener('click',()=>run({action:'team_want',want:!me?.wants_assignment},me?.wants_assignment?'已取消。':'已登記，老師會看到。'));
  return;
 }
 const sm=teamSummary(team,members);
 const head=el('div','',body,'tm-team');
 const h=el('div','',head,'tm-team-head');el('b',team.name,h);const code=el('span','',h,'tm-code');code.textContent='組碼 '+team.code;code.title='給組員輸入這四碼加入';
 el('span',`${sm.count}／${TEAM_MAX} 人${sm.full?'（已滿）':''}`,h,'w4-hint');
 if(locked)el('p',`已鎖定（${team.locked?'老師鎖住了這一組':TEAM_LOCK_LABEL+' 期末後'}）：要改請找老師。`,head,'w4-lock');
 // 產業線
 const indBox=el('div','',body,'tm-block');el('h3','組的產業線（選填）',indBox);
 const opts=industryOptions(members,week4);
 const sel=el('select','',indBox);sel.setAttribute('aria-label','組的產業線');sel.disabled=locked;
 const o0=el('option','還沒選',sel);o0.value='';
 for(const o of opts){const op=el('option',`${o.label}（${o.who.map(id=>names[id]||id).join('、')} Week 4 選的）`,sel);op.value=o.card==='custom'?'custom:'+o.custom:String(o.card);}
 const og=el('optgroup','',sel);og.label='其他產業線';for(const c of INDUSTRY_CARDS){if(opts.some(o=>o.card===c.id))continue;const op=el('option',c.name,og);op.value=String(c.id);}
 const oc=el('option','自己填…',sel);oc.value='custom:';
 const cur=team.industry?.card==='custom'?'custom:'+(team.industry.custom||''):team.industry?.card?String(team.industry.card):'';
 if(cur&&![...sel.options].some(o=>o.value===cur)){const op=el('option',industryLabel(team.industry),sel);op.value=cur;}
 sel.value=cur;
 const custom=el('input','',indBox);custom.type='text';custom.maxLength=40;custom.placeholder='自填產業：哪一行、誰付錢';custom.hidden=!cur.startsWith('custom:');custom.value=team.industry?.custom||'';custom.disabled=locked;custom.setAttribute('aria-label','自填產業');
 const indSave=()=>{const v=sel.value;if(!v){run({action:'team_industry',industry:{card:null}},'已清掉產業線。');return;}if(v.startsWith('custom:')){custom.hidden=false;if(!custom.value.trim()){custom.focus();return;}run({action:'team_industry',industry:{card:'custom',custom:custom.value}},'產業線已存。');return;}run({action:'team_industry',industry:{card:Number(v)}},'產業線已存。');};
 sel.addEventListener('change',()=>{custom.hidden=!sel.value.startsWith('custom:');indSave();});custom.addEventListener('change',indSave);
 el('p','想從自己熟的產業切入 AI 新創再填；不填也可以。',indBox,'w4-hint');
 // 組員與方向
 const mBox=el('div','',body,'tm-block');el('h3','組員與方向（每人認一個；兩人組一人認兩個）',mBox);
 const table=el('table','',mBox,'tm-table');const tr=el('tr','',el('thead','',table));for(const t of ['組員','方向一','方向二','方向三'])el('th',t,tr);
 const tb=el('tbody','',table);
 for(const m of members){
  const r=el('tr','',tb);const mine=m.student_id===session.student_id;
  el('td',(names[m.student_id]||m.student_id)+(mine?'（我）':''),r);
  const dirs=normalizeDirections(m.directions);
  for(const [d] of DIRECTIONS){
   const td=el('td','',r);
   if(mine&&!locked){const b=el('button',dirs.includes(d)?'✓ 我認領':'認領',td,'button-link w4-small');b.type='button';b.setAttribute('aria-pressed',String(dirs.includes(d)));
    b.addEventListener('click',()=>{const next=dirs.includes(d)?dirs.filter(x=>x!==d):[...dirs,d];run({action:'team_claim',directions:next},'方向已存。');});}
   else td.textContent=dirs.includes(d)?'✓':'';
  }
 }
 const legend=el('ul','',mBox,'w4-hint');for(const [,n,desc] of DIRECTIONS)el('li',`${n}：${desc}`,legend);
 // 組卡三格：每個方向的代表（在群島情報袋「設為我的代表」設的）
 if(W9){const rBox=el('div','',body,'tm-block tm-reps');el('h3','組的三家：方向代表（期末從這三家選一家上台）',rBox);
  const reps=teamReps(members);const grid=el('div','',rBox,'tm-rep-grid');let filled=0;
  for(const [d,n] of DIRECTIONS){const cell=el('div','',grid,'tm-rep');el('small',n.split('｜')[0]+'｜'+n.split('｜')[1],cell);const r=reps[d];const owner=members.find(m=>normalizeDirections(m.directions).includes(d));
   if(r){filled++;el('b',COMPANY_NAME[r.company]||r.company,cell);el('span','由 '+(names[r.student_id]||r.student_id)+' 研究',cell,'w4-hint');cell.dataset.state='done';}
   else{el('b','還沒設',cell,'tm-rep-empty');el('span',owner?('由 '+(names[owner.student_id]||owner.student_id)+(owner.student_id===session.student_id?'（我）':'')+' 開箱後在情報袋按「設為我的代表」'):'這個方向還沒人認',cell,'w4-hint');cell.dataset.state='todo';}}
  el('p',filled===3?'✅ 三家都到齊了。12/4 課堂拿這三家做五問比較、選一家。':`${filled}／3 家。三格填滿才拿得到期末框架（PPT 6 頁、講稿）。`,rBox,'w4-hint');}
 // 狀態
 const stBox=el('div','',body,'w4-done');stBox.dataset.state=sm.complete?'done':'todo';
 el('p',sm.complete?'✅ 這一組建好了：三個方向都有人認。':'還沒完成：',stBox,'w4-done-title');
 if(!sm.complete){const ul=el('ul','',stBox);for(const x of sm.missing)el('li',x,ul);}
 if(W9){const go=el('div','',body,'tm-go');const a=el('a','進群島：開始尋寶 →',go,'primary-link');a.href='islands.html';el('p',sm.complete?'組建好了。到群島選你認的方向，逛島圈 2 家候選、開 2 箱。':'可以先進群島；三個方向沒認滿，期末框架會拿不到，記得回來補。',go,'w4-hint');}
 if(!locked){const lb=el('button','離開這一組',body,'button-link w4-small');lb.type='button';let armed=false;lb.addEventListener('click',()=>{if(!armed){armed=true;lb.textContent='再按一次確認離開';setTimeout(()=>{armed=false;lb.textContent='離開這一組';},4000);return;}run({action:'team_leave'},'已離開。');});}
}
async function load(){if(!session?.token){render();return;}msg.textContent='正在讀取建組…';try{st=await api({action:'team_load'});msg.textContent='';}catch(e){msg.textContent=e.message;}render();}
load();
}
