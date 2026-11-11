// 教師洞察：每一週區塊（Week 1／2／4／5…）標題旁一顆「收合／展開」。
// 收合＝把標題以下的所有東西藏起來（列表、按鈕、說明都藏），標題留著；狀態記在 sessionStorage，重新整理後還在。
const dash=document.getElementById('teacher-dashboard');
if(dash){
 const KEY='sjl-teacher-fold';
 const state=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}');}catch(e){return {};}};
 const save=s=>{try{sessionStorage.setItem(KEY,JSON.stringify(s));}catch(e){}};
 function apply(sec,folded){const h=sec.querySelector(':scope > h2');if(!h)return;let n=h.nextElementSibling;while(n){n.hidden=folded;n=n.nextElementSibling;}const b=h.querySelector('.tfold');if(b){b.textContent=folded?'展開':'收合';b.setAttribute('aria-expanded',String(!folded));}}
 function attach(sec){if(!/^teacher-(week|team|islands|compare)/.test(sec.id)||sec.querySelector(':scope > h2 > .tfold'))return;const h=sec.querySelector(':scope > h2');if(!h)return;
  const b=document.createElement('button');b.type='button';b.className='quiet tfold';b.setAttribute('aria-controls',sec.id);h.append(b);
  b.addEventListener('click',()=>{const s=state();const f=!s[sec.id];s[sec.id]=f;save(s);apply(sec,f);if(f)sec.scrollIntoView({block:'start'});});
  apply(sec,!!state()[sec.id]);}
 // 區塊順序固定：最新的週在上（各模組載入先後不影響）。建組與群島也可收合。
 const ORDER=['teacher-compare','teacher-week10','teacher-week9','teacher-islands','teacher-week8','teacher-week7','teacher-team','teacher-week6','teacher-week5','teacher-week4','teacher-week2','teacher-week1'];
 let ordering=false;
 function reorder(){if(ordering)return;ordering=true;try{const anchor=dash.querySelector('.statusbar');const secs=[...dash.querySelectorAll(':scope > section')].filter(s=>ORDER.includes(s.id)).sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
  let prev=anchor;for(const s of secs){if(anchor){if(prev.nextElementSibling!==s)prev.after(s);prev=s;}}}finally{ordering=false;}}
 dash.querySelectorAll(':scope > section').forEach(attach);reorder();
 new MutationObserver(ms=>{let added=false;for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.tagName==='SECTION'){attach(n);added=true;}if(added)reorder();}).observe(dash,{childList:true});
}
