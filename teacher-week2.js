import {priority,readiness,fields,triageFields,depthFields,check,selectedIndex} from './week2-core.mjs';
import {assess,completion,TARGETS} from './week2-quality.mjs?v=20261011-quality';
// 教師洞察 · Week 2
// 每位學生一張卡：上半 Week 1 起點卡（一句摘要，可展開全文），下半 Week 2 兩個候選、選題、訪談題、AI 建議，
// 底下就是三顆審核按鈕和一句回饋。最上面有進度（已確認 X／已交 Y）和篩選，老師可以只看「還沒看的」。
const dashboard=document.getElementById('teacher-dashboard');
const root=document.createElement('section');root.id='teacher-week2';dashboard.append(root);
const el=(tag,text,parent=root)=>{const e=document.createElement(tag);e.textContent=text||'';parent.append(e);return e;};
el('h2','Week 2 班級互動',root);
el('p','每位學生一張卡：Week 1 起點卡、Week 2 痛點卡、AI 建議，最底下是你的審核。按「確認進入訪談」就是替學生定案痛點。',root).className='tw2-intro';
const status=el('p','按下載入即可查看授權班級。');status.setAttribute('role','status');
const controls=el('div','');controls.className='tw2-controls';
const list=el('div','');let data;
// 記住哪些卡是展開的、目前篩選什麼，重新載入後不要全部收起來。
let openKeys=new Set(),filter='all',query='';

const REVIEW_LABEL={pending:'尚未審核',approved:'已確認進入訪談',revision:'需要小幅修訂',hold:'請先與老師討論'};
const FILTERS=[['all','全部'],['todo','已交、還沒審'],['approved','已確認'],['revision','需修訂'],['hold','請先討論'],['draft','草稿中'],['notstarted','尚未開始 Week 2']];

async function call(body,retry=true){let token=sessionStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(r.status===401&&retry&&typeof window.refreshTeacherToken==='function'&&await window.refreshTeacherToken())return call(body,false);if(!r.ok)throw Error(j.error||'請重新登入教師帳號。');return j;}
function button(text,fn,parent=root){const b=el('button',text,parent);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){status.textContent=e.message;}finally{b.disabled=false;}};return b;}
async function load(){status.textContent='正在載入…';data=await call({action:'teacher_load'});render();}
button('載入／更新 Week 2',load,controls);

// 篩選列：只有載入後才有意義，但先建好。
const filterBar=el('div','',controls);filterBar.className='tw2-filters';
const filterButtons=FILTERS.map(([key,label])=>{const b=el('button',label,filterBar);b.type='button';b.dataset.filter=key;b.onclick=()=>{filter=key;if(data)render();};return b;});
const sortLabel=el('label','排序',controls);const sortSel=el('select','',sortLabel);
for(const [v,t] of [['priority','需要你先看的'],['quality-asc','品質分數 低 → 高'],['quality-desc','品質分數 高 → 低'],['name','姓名']]){const o=el('option',t,sortSel);o.value=v;}
let sortBy='priority';sortSel.onchange=()=>{sortBy=sortSel.value;if(data)render();};
const searchLabel=el('label','搜尋姓名或學號',controls);const search=el('input','',searchLabel);search.type='search';search.placeholder='例：A113270021 或 何';
search.oninput=()=>{query=search.value.trim().toLowerCase();if(data)render();};

function latestAI(usage,classId,studentId){return usage.filter(u=>u.class_id===classId&&u.student_id===studentId&&u.feedback).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];}
function keyOf(classId,studentId){return classId+'|'+studentId;}

/** 每位學生的狀態桶，給篩選和進度用。 */
function bucket(r){
 if(!r)return 'notstarted';
 if(r.status!=='submitted')return 'draft';
 return r.review_status==='pending'?'todo':r.review_status;
}

function render(){
 list.replaceChildren();
 data.rows.forEach(r=>{const latest=latestAI(data.usage,r.class_id,r.student_id);r.ai_help=latest?.feedback?.status==='help';r.ai_conflict=!!latest&&latest.feedback?.status==='revise'&&r.review_status==='approved';});
 filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 let shown=0,total=0;
 for(const c of data.classes){
  const section=el('section','',list);section.className='tw2-class';el('h3',c.name,section);
  const rows=data.rows.filter(r=>r.class_id===c.id),w1=data.week1.filter(r=>r.class_id===c.id),usage=data.usage.filter(r=>r.class_id===c.id);
  // 學生名單 = Week 1 有紀錄的人 ∪ Week 2 有卡的人
  const ids=[...new Set([...w1.map(w=>w.student_id),...rows.map(r=>r.student_id)])];
  const students=ids.map(id=>({id,w1:w1.find(w=>w.student_id===id),r:rows.find(r=>r.student_id===id)}));
  const counts={submitted:0,approved:0,revision:0,hold:0,todo:0,draft:0,notstarted:0};
  for(const s of students){const b=bucket(s.r);counts[b]=(counts[b]||0)+1;if(s.r&&s.r.status==='submitted')counts.submitted++;}
  // 進度：這是老師最需要先看到的一行
  const progress=el('p',`已交 ${counts.submitted} 人 · 已確認進入訪談 ${counts.approved} · 需修訂 ${counts.revision} · 請先討論 ${counts.hold} · 還沒審 ${counts.todo} · 草稿中 ${counts.draft} · 尚未開始 ${counts.notstarted} · AI 嘗試 ${usage.length} 次`,section);
  progress.className='tw2-progress';
  const bar=el('div','',section);bar.className='tw2-bar';const fill=el('i','',bar);fill.style.width=(counts.submitted?Math.round(counts.approved/counts.submitted*100):0)+'%';bar.title=`已確認 ${counts.approved} / 已交 ${counts.submitted}`;
  const settings=el('details','',section);el('summary','班級設定（AI 上限）',settings);
  const label=el('label','每人 Week 2 AI 上限（0–10 次，留白依路徑 3／2／2 次）',settings),limit=el('input','',label);limit.type='number';limit.min=0;limit.max=10;limit.value=data.settings.find(s=>s.class_id===c.id)?.weekly_ai_limit??'';
  button('保存班級 AI 上限',async()=>{await call({action:'teacher_settings',class_id:c.id,limit:limit.value===''?null:Number(limit.value)});status.textContent='班級上限已更新。';},settings);
  button('匯出 Week 2 CSV',()=>exportCsv(c,students,usage),settings);

  for(const s of students){s.q=s.r?assess(s.r.card):null;s.lv=s.r?completion(s.r.card,s.r).level:0;}
  const byName=(a,b)=>String(a.w1?.student_name||a.id).localeCompare(String(b.w1?.student_name||b.id),'zh-Hant');
  const ordered=students.sort((a,b)=>{
   if(sortBy==='quality-asc')return ((a.q?.total??-1)-(b.q?.total??-1))||byName(a,b);
   if(sortBy==='quality-desc')return ((b.q?.total??-1)-(a.q?.total??-1))||byName(a,b);
   if(sortBy==='name')return byName(a,b);
   const pa=a.r?priority(a.r):7,pb=b.r?priority(b.r):7;if(pa!==pb)return pa-pb;
   return byName(a,b);
  });
  // 進度行補上品質分布
  const qs=students.filter(x=>x.q).map(x=>x.q.total);
  if(qs.length)el('p',`品質分數（8 項，滿分 16）：A 級（≥12）${qs.filter(t=>t>=12).length} 人 · B 級（8–11）${qs.filter(t=>t>=8&&t<12).length} 人 · C 級（≤7）${qs.filter(t=>t<8).length} 人 · 能拿去問人了 ${students.filter(x=>x.lv>=2).length} 人`,section).className='tw2-progress';
  for(const s of ordered){
   total++;
   const b=bucket(s.r);
   if(filter!=='all'&&b!==filter)continue;
   const name=s.w1?.student_name||'（Week 1 無姓名）';
   if(query&&!(name.toLowerCase().includes(query)||s.id.toLowerCase().includes(query)))continue;
   shown++;
   renderStudent(section,c,s,name,b,usage);
  }
 }
 status.textContent=`${data.classes.length} 個授權班級 · 顯示 ${shown} / ${total} 位學生${filter!=='all'||query?'（已套用篩選）':''}。摘要由已存資料統計，不呼叫 AI。`;
}

function renderStudent(section,c,s,name,b,usage){
 const key=keyOf(c.id,s.id);
 const box=el('details','',section);box.className='tw2-student';box.dataset.bucket=b;box.dataset.studentId=s.id;
 if(openKeys.has(key))box.open=true;
 box.ontoggle=()=>{if(box.open)openKeys.add(key);else openKeys.delete(key);};
 const r=s.r,w=s.w1;
 const w1Tag=w?(w.status==='submitted'?'Week 1 ✓':'Week 1 草稿'):'Week 1 無';
 const w2Tag=r?(r.status==='submitted'?`Week 2 已交 v${r.version}`:`Week 2 草稿 v${r.version}`):'Week 2 未開始';
 const sum=el('summary','',box);
 el('b',name,sum);el('span',` · ${s.id} · ${w1Tag} · ${w2Tag} · `,sum);
 const badge=el('span',r?REVIEW_LABEL[r.review_status]||r.review_status:'—',sum);badge.className='tw2-badge tw2-badge-'+b;
 if(s.q){const qb=el('span',` 品質 ${s.q.total}/16 · 第 ${s.lv} 格`,sum);qb.className='tw2-score tw2-score-'+(s.q.total>=12?'a':s.q.total>=8?'b':'c');}
 if(r?.ai_help)el('span',' · AI 建議先找老師',sum).className='tw2-flag';

 // ---- Week 1 ----
 const w1Box=el('section','',box);w1Box.className='tw2-week1';
 el('h4','Week 1 起點卡',w1Box);
 if(!w){el('p','這位學生沒有 Week 1 紀錄。',w1Box);}
 else{
  el('p',w.observed_problem||'（未填觀察到的問題）',w1Box).className='tw2-lead';
  const full=el('details','',w1Box);el('summary','展開 Week 1 全文',full);
  for(const [k,t] of [['student_name','姓名'],['team_preference','分組偏好'],['verbatim_complaint','原話'],['observed_context','現場'],['observed_problem','觀察到的問題'],['affected_user','誰受影響'],['known_fact','已知事實'],['unverified_assumption','待驗證假設'],['interview_next_question','下週最想問'],['expected_learning','期待學到'],['concern','擔心']]){
   if(w[k])el('p',`${t}：${w[k]}`,full);
  }
  const firstAI=data.feedback.find(f=>f.class_id===c.id&&f.student_id===s.id);
  if(firstAI?.feedback_json?.overall_feedback)el('p','Week 1 AI：'+firstAI.feedback_json.overall_feedback,full).className='tw2-ai';
  if(w.teacher_note)el('p','你在 Week 1 的回饋：'+w.teacher_note,full);
 }

 // ---- Week 2 ----
 const w2Box=el('section','',box);w2Box.className='tw2-week2';
 el('h4','Week 2 痛點探索卡',w2Box);
 if(!r){el('p',w&&w.status!=='submitted'?'需先補交 Week 1 才能開始 Week 2。':'尚未開始 Week 2。',w2Box);return;}
 el('p',`路徑：${r.card.mode} · 版本 ${r.version} · 提交嘗試 ${r.attempts} · ${readiness(r)}`,w2Box).className='tw2-meta';
 const pick=selectedIndex(r.card);
 const cands=el('div','',w2Box);cands.className='tw2-candidates';
 r.card.candidates.forEach((cand,i)=>{
  const cb=el('section','',cands);cb.className='tw2-candidate'+(i===pick?' tw2-picked':'');
  el('h5',`候選 ${i+1}${i===pick?' · 學生暫定選擇':''}`,cb);
  const need=i===pick?fields:triageFields;
  for(const [k,t] of need){if(cand[k])el('p',`${t}：${cand[k]}`,cb);}
  if(i!==pick){const more=depthFields.filter(([k])=>cand[k]);if(more.length){const d=el('details','',cb);el('summary','此候選的深入欄位',d);for(const [k,t] of more)el('p',`${t}：${cand[k]}`,d);}}
 });
 const core=el('section','',w2Box);core.className='tw2-core';
 el('h5','選題與訪談準備',core);
 for(const [k,t] of [['reason','選題理由'],['reconsider','改變選擇的條件'],['statement','痛點陳述']])el('p',`${t}：${r.card[k]||'—'}`,core).className=k==='statement'?'tw2-statement':'';
 el('p','受訪者：'+(r.card.interviewees||[]).filter(Boolean).join('；')||'—',core);
 el('p','訪談問題：'+(r.card.questions||[]).filter(Boolean).map((q,i)=>`(${i+1}) ${q}`).join('　')||'—',core);
 if(r.card.external_ai)el('p','使用的外部 AI：'+r.card.external_ai,core);
 if(r.card.ai_response)el('p','學生回應 AI：'+r.card.ai_response,core);
 const result=check(r.card);el('p','規則檢查：'+(result.ok?'完整':result.errors.join('；')),core).className='tw2-check';result.warnings.forEach(t=>el('p',t,core).className='tw2-warn');
 // 8 項品質：系統算的，老師可以不同意；按鈕在下面的審核區。
 const qbox=el('section','',w2Box);qbox.className='tw2-quality';
 el('h5',`痛點品質 ${s.q.total}/16（系統依 8 項標準自動算，只是建議）`,qbox);
 const ul=el('ul','',qbox);
 for(const it of s.q.items){const li=el('li','',ul);li.dataset.score=it.score;el('b',`${it.score}/2 ${it.label}`,li);el('span',`　${it.reason}${it.score<2&&it.fix?'　→ '+it.fix:''}`,li);}
 const ai=latestAI(usage,c.id,s.id);
 if(ai){const ab=el('section','',w2Box);ab.className='tw2-ai';el('h5','Week 2 AI 建議（形成性，不計成績）',ab);if(ai.feedback.strength)el('p','做得好：'+ai.feedback.strength,ab);for(const g of ai.feedback.gaps||[])el('p','缺口：'+g,ab);if(ai.feedback.next_action)el('p','下一步：'+ai.feedback.next_action,ab);if(ai.submission_version!==r.version)el('p',`此建議針對版本 ${ai.submission_version}，學生之後又改過。`,ab).className='tw2-warn';}

 // ---- 審核 ----
 const review=el('section','',box);review.className='tw2-review';
 el('h4','你的審核',review);
 el('p',`目前：${REVIEW_LABEL[r.review_status]||r.review_status}${r.teacher_note?' · 回饋：'+r.teacher_note:''}`,review).className='tw2-current';
 const label=el('label','老師的一句具體回饋（學生會在卡片上看到）',review),note=el('textarea','',label);note.maxLength=600;note.value=r.teacher_note||'';
 const tLabel=el('label','指路：要學生先改哪一格（學生會看到一顆「老師要你改：__」的按鈕）',review),tSel=el('select','',tLabel);
 {const o0=el('option','不指定',tSel);o0.value='';for(const [k,t] of TARGETS){const o=el('option',t,tSel);o.value=k;}
  const worst=[...s.q.items].sort((a,b)=>a.score-b.score)[0];
  tSel.value=r.teacher_target||(worst&&worst.score<2?worst.key:'');}
 const actions=el('div','',review);actions.className='tw2-actions';
 for(const [v,t] of [['approved','確認進入訪談'],['revision','需要小幅修訂'],['hold','請先與老師討論']]){
  const btn=button(t,async()=>{
   if(v==='approved'&&r.status!=='submitted'){status.textContent='這位學生還沒正式提交，不能確認。';return;}
   await call({action:'teacher_review',class_id:c.id,student_id:s.id,version:r.version,review_status:v,note:note.value,target:tSel.value});
   openKeys.add(key);await load();status.textContent=`${name}：已標為「${t}」。`;
  },actions);
  btn.className=v==='approved'?'primary-action':'';
  if(r.review_status===v)btn.setAttribute('aria-pressed','true');
 }
 const history=el('details','',box);el('summary','查看保存版本',history);
 button('載入最近 30 個版本',async()=>{const r2=await call({action:'teacher_history',class_id:c.id,student_id:s.id});history.querySelectorAll('.saved-version').forEach(x=>x.remove());for(const v of r2.versions){const d=el('details','',history);d.className='saved-version';el('summary',`Week ${v.week} 版本 ${v.version} · ${new Date(v.created_at).toLocaleString('zh-TW')}`,d);el('pre',JSON.stringify(v.snapshot?.card||v.snapshot,null,2),d);}},history);
}

function exportCsv(c,students,usage){
 const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const head=['姓名','學號','Week1','Week2 狀態','版本','審核','老師回饋','品質分數','完成度','暫定痛點','痛點陳述','受訪者','訪談問題1','訪談問題2','AI 次數'];
 const lines=[head.map(esc).join(',')];
 for(const s of students){const r=s.r,pick=r?selectedIndex(r.card):-1,cand=r&&pick>=0?r.card.candidates[pick]:null;
  lines.push([s.w1?.student_name||'',s.id,s.w1?.status||'',r?r.status:'未開始',r?r.version:'',r?REVIEW_LABEL[r.review_status]:'',r?.teacher_note||'',s.q?s.q.total:'',s.lv,cand?`${cand.people}｜${cand.problem}`:'',r?.card.statement||'',(r?.card.interviewees||[]).filter(Boolean).join('；'),r?.card.questions?.[0]||'',r?.card.questions?.[1]||'',usage.filter(u=>u.student_id===s.id).length].map(esc).join(','));}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'}));a.download=`Week2-${c.name}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 status.textContent='已產生 Week 2 CSV。';
}

new MutationObserver(()=>{if(dashboard.hidden){list.replaceChildren();data=null;openKeys=new Set();status.textContent='請先登入再載入 Week 2。';}}).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
