// 課程地圖：「本週」自動算（照 CLASS_SCHEDULE），登入的學生多一條「我的進度」（Week 1–5 一格一個狀態，點了跳那一週）。
import {CLASS_SCHEDULE} from './week4-core.mjs?v=20261029-open';
const WEEK_NAMES={1:'課程說明與創業起點',2:'問題探索與選題',3:'使用者訪談',4:'從我的痛看產業',5:'三個機會比一比',6:'AI 新創現況',7:'期中：個人報告',8:'AI agent 工具更新＋建組',9:'第二輪研究：三個方向',10:'第二輪研究工作坊',11:'三題比較與預演',12:'期末：小組報告'};
const CARD_LINK={1:'index.html#student',2:'week.html?week=2#card',3:'week.html?week=3#card',4:'week.html?week=4#card',5:'week.html?week=5#card'};
// 本週＝最近一個「上課日 ≤ 今天（台北）」的週；開學前是 Week 1。Week 1–3 的日期表裡沒有，所以 10/30 之前都算 Week 3 以前＝不改。
export function currentWeek(now=new Date()){
 const taipei=new Date(now.getTime()+8*3600e3).toISOString().slice(0,10);
 let cur=null;for(const [w,d] of CLASS_SCHEDULE.days){if(d<=taipei)cur=[w,d];}
 return cur;// null＝還沒到 10/30
}
function renderThisWeek(){
 const cur=currentWeek();if(!cur)return;const [w,d]=cur;
 const p=document.querySelector('#home .thisweek');
 if(p){const [,m,day]=d.split('-');p.innerHTML='';const b=document.createElement('b');b.textContent='本週';p.append(b,` Week ${w}（${+m}/${+day}）${WEEK_NAMES[w]||''}　`);const a=document.createElement('a');a.href=CARD_LINK[w]||`week.html?week=${w}`;a.textContent=CARD_LINK[w]?'進入本週學習卡 →':'看本週學習藍圖 →';p.append(a);}
 document.querySelectorAll('#home .week-grid li').forEach(li=>{const n=Number(/week=(\d+)/.exec(li.querySelector('a')?.getAttribute('href')||'')?.[1]);li.classList.toggle('current',n===w);});
 const nav=document.querySelector('.topbar nav a[href*="week.html?week="]');if(nav&&CARD_LINK[w])nav.href=CARD_LINK[w];
}
async function renderMine(){
 let session=null;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
 // 課程地圖：放在「本週」那行下面；每週頁面：放在最上面那組「上一週／下一週」下面（卡片頁、藍圖頁都看得到）。
 const host=document.querySelector('#home .thisweek')||document.querySelector('main > nav.week-pager');if(!host)return;
 let box=document.getElementById('my-progress');
 if(!session?.token){if(box)box.remove();return;}
 if(!box){box=document.createElement('section');box.id='my-progress';box.className='my-progress';host.after(box);}
 const here=Number(new URLSearchParams(location.search).get('week'))||0;box.dataset.week=String(here);
 box.innerHTML='<p class="mp-head"><b>我的進度</b> <span class="mp-id"></span> <span class="mp-msg">讀取中…</span></p>';
 box.querySelector('.mp-id').textContent=session.student_id||'';
 const cfg=window.STARTUP_JOURNEY_CONFIG;
 try{
  const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({action:'my_progress',token:session.token})});
  const j=await r.json();if(!r.ok)throw Error(j.error||'讀不到進度');
  const ol=document.createElement('ol');ol.className='mp-grid';
  for(const w of j.weeks){const li=document.createElement('li');li.className='mp-'+w.state+(w.week===here?' mp-here':'');const a=document.createElement('a');a.href=w.href;
   const b=document.createElement('b');b.textContent=`Week ${w.week}`;const s=document.createElement('span');s.textContent=w.label;a.append(b,s);
   if(w.detail){const sm=document.createElement('small');sm.textContent=w.detail;a.append(sm);}
   li.append(a);ol.append(li);}
  const next=document.createElement('p');next.className='mp-next';next.textContent=j.doneCount===5?'到 Week 5 為止都做完了。':'下一步 → '+j.next;
  box.querySelector('.mp-msg').textContent=`${j.doneCount}/5 週完成`;box.append(ol,next);
 }catch(e){box.querySelector('.mp-msg').textContent=/過期|重新進入/.test(e.message)?'登入已過期，進入學生入口重新登入後會顯示。':e.message;}
}
renderThisWeek();renderMine();
// 每週頁面：存檔後狀態會變，回到這頁（例如從卡片切回藍圖）時重抓一次。
window.addEventListener('pageshow',e=>{if(e.persisted)renderMine();});
window.addEventListener('hashchange',()=>{if(location.hash==='#home'||location.hash==='')renderMine();});
window.addEventListener('storage',e=>{if(e.key==='sjl-student-session')renderMine();});
