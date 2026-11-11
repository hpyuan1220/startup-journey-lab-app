import {COMPANIES,islandById,companyById,boxScore,EST_BONUS} from './islands-data.mjs?v=20261111-art';
import {DIRECTIONS} from './team-core.mjs?v=20261106-tm';
// Week 9 頁：公司卡 v1。你在群島情報袋「設為我的代表」的那家（一個方向一家），七格卡＋你答的三題分數＋你貼的來源＋探索／找碴＋估價，自動填好；
// 你只補兩個來源和一句「為什麼它是好新創」。存在 islands_progress.data.cards[公司]（跟遊戲進度同一包，islands_save）。
const WEEK=new URLSearchParams(location.search).get('week');
const root=document.querySelector('[data-company-card]');
if(root&&WEEK==='9'){
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
let session=null;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.error||`連線失敗 ${r.status}`);return b;}
const dirShort=d=>DIRECTIONS.find(x=>x[0]===Number(d))?.[1].split('｜')[0]||'';
const sec=el('section','',root,'w4 cc');el('p','WEEK 9 · 公司卡 v1',sec,'eyebrow');el('h2','我的公司卡（自動生成，補兩個來源）',sec);
const status=el('p','',sec,'w4-status');status.setAttribute('role','status');const body=el('div','',sec);
let state=null;// {data, reps, directions}
async function load(){if(!session?.token){el('p','先用學號和邀請碼進入，再回來看公司卡。',body,'w4-hint');return;}status.textContent='載入中…';try{const r=await api({action:'islands_load'});state={data:r.row?.data||{boxes:{}},reps:r.reps||{},directions:r.directions||[],team:r.team_id};status.textContent='';render();}catch(e){status.textContent=e.message;}}
function render(){body.replaceChildren();const {data,reps,directions}=state;
 if(!state.team){el('p','有組之後才有公司卡：先在上面建組或加入，認一個方向。',body,'w4-hint');return;}
 if(!directions.length){el('p','先在組卡認一個方向。',body,'w4-hint');return;}
 const todo=directions.filter(d=>!reps[d]);
 if(todo.length)el('p',`${todo.map(dirShort).join('、')} 還沒有代表：到群島開完箱，在情報袋按「設為我的代表」，公司卡就會出現在這裡。`,body,'callout');
 for(const d of directions){const cid=reps[d];if(!cid)continue;const c=companyById(cid);const b=data.boxes?.[cid]||{};const card=data.cards?.[cid]||{sources:['',''],why:''};
  const a=el('article','',body,'cc-card');a.dataset.company=cid;
  const h=el('div','',a,'cc-head');el('small',dirShort(d)+' 代表 · '+islandById(c.island).name+(b.opened?' · 三題 '+boxScore(b.scores)+'/30'+(b.estOk?' +'+EST_BONUS:''):''),h);el('h3',c.name,h);el('p',c.tagline,h,'cc-tag');
  const dl=el('dl','',a,'facts cc-facts');c.card.forEach(([k,v],i)=>{el('dt',k,dl);el('dd',v+(i===1&&b.est?'｜我的估價：'+b.est+(b.estOk?'（答對）':'（答錯，正解在遊戲裡）'):''),dl);});
  if(b.insight){el('dt','我的理解（探索站）',dl);el('dd',b.insight,dl);}if(b.argue){el('dt','找碴：業務最站不住腳的一句',dl);el('dd',b.argue,dl);}
  // 來源三個：第三題貼的＋補兩個
  const src=el('div','',a,'cc-src');el('h4','來源（至少三個：遊戲貼的一個＋你補兩個）',src);
  const s0=el('p','',src);el('span','① ',s0);if(b.url){const l=el('a',b.url,s0);l.href=b.url;l.target='_blank';l.rel='noopener noreferrer';}else el('span','（第三題還沒貼網址）',s0,'w4-hint');
  const ins=[];[1,2].forEach(i=>{const row=el('p','',src);el('span',['②','③'][i-1]+' ',row);const inp=el('input','',row);inp.type='url';inp.placeholder='https://…（新聞、官網定價頁、募資公告）';inp.value=card.sources?.[i-1]||'';inp.setAttribute('aria-label',c.name+' 來源 '+(i+1));inp.className='cc-input';ins.push(inp);});
  const whyBox=el('div','',a,'cc-why');el('h4','一句話：為什麼它是一家好新創？（期末第 1 頁的開場）',whyBox);const ta=el('textarea','',whyBox);ta.rows=2;ta.maxLength=200;ta.placeholder='例：它把餐廳最怕漏接的電話接起來，按月收費比請一個人便宜，而且客人一多就離不開。';ta.value=card.why||'';ta.setAttribute('aria-label',c.name+' 為什麼是好新創');
  const row=el('div','',a,'w4-row');const st=el('span','',row,'w4-hint');
  const saveBtn=el('button','存公司卡',row,'primary');saveBtn.type='button';
  saveBtn.addEventListener('click',async()=>{const bad=ins.find(x=>x.value.trim()&&!/^https?:\/\/\S+\.\S+/.test(x.value.trim()));if(bad){st.textContent='來源要是完整網址（https:// 開頭）。';bad.focus();return;}
   saveBtn.disabled=true;st.textContent='存檔中…';try{const fresh=await api({action:'islands_load'});const data=fresh.row?.data||{boxes:{}};data.cards={...(data.cards||{}),[cid]:{sources:ins.map(x=>x.value.trim()),why:ta.value.trim(),saved_at:new Date().toISOString()}};data.updated_at=new Date().toISOString();await api({action:'islands_save',data});state.data=data;st.textContent='已存。';}catch(e){st.textContent=e.message;}finally{saveBtn.disabled=false;}});
  const copyBtn=el('button','複製整張公司卡',row,'quiet');copyBtn.type='button';copyBtn.addEventListener('click',async()=>{const txt=[`【${c.name}】${c.tagline}`,...c.card.map(([k,v],i)=>`${k}：${v}${i===1&&b.est?'｜我的估價：'+b.est:''}`),b.insight?'我的理解：'+b.insight:'',b.argue?'找碴：'+b.argue:'',ta.value.trim()?'為什麼是好新創：'+ta.value.trim():'','來源：'+[b.url,...ins.map(x=>x.value.trim())].filter(Boolean).join(' ; ')].filter(Boolean).join('\n');try{await navigator.clipboard.writeText(txt);st.textContent='已複製。';}catch{st.textContent='複製失敗，請手動選取。';}});
  const n=[b.url,...(card.sources||[])].filter(Boolean).length;el('p',n>=3&&card.why?'✅ 這張公司卡完成了（三個來源＋一句話）。':`還差：${n<3?'來源 '+(3-n)+' 個':''}${n<3&&!card.why?'、':''}${!card.why?'一句話':''}。`,a,'w4-hint cc-done');a.dataset.done=String(n>=3&&!!card.why);
 }
}
load();
window.addEventListener('focus',()=>{if(state)load();});
}
