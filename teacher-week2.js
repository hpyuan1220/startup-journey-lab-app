import {priority,readiness,fields,check} from './week2-core.mjs';
const dashboard=document.getElementById('teacher-dashboard');
const root=document.createElement('section');dashboard.append(root);
const el=(tag,text,parent=root)=>{const e=document.createElement(tag);e.textContent=text||'';parent.append(e);return e;};
el('h2','Week 2 班級互動',root);const status=el('p','按下載入即可查看授權班級。');status.setAttribute('role','status');
const controls=el('div',''),list=el('div','');let data;
async function call(body,retry=true){let token=localStorage.getItem('sjl-teacher-token');const cfg=window.STARTUP_JOURNEY_CONFIG;const r=await fetch(cfg.supabaseUrl+'/functions/v1/week2-api',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status===401&&retry&&typeof refreshTeacherSession==='function'&&await refreshTeacherSession())return call(body,false);const b=await r.json();if(!r.ok)throw Error(b.error||'載入失敗');return b;}
function button(text,fn,parent=root){const b=el('button',text,parent);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){status.textContent=e.message;}finally{b.disabled=false;}};return b;}
async function load(){status.textContent='正在載入…';data=await call({action:'teacher_load'});render();status.textContent=`${data.classes.length} 個授權班級，${data.rows.length} 張 Week 2 卡。摘要由已存資料統計，不呼叫 AI。`;}
button('載入／更新 Week 2',load,controls);
function render(){list.replaceChildren();
 data.rows.forEach(r=>{const latest=data.usage.filter(u=>u.class_id===r.class_id&&u.student_id===r.student_id&&u.feedback).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];r.ai_help=latest?.feedback?.status==='help';r.ai_conflict=!!latest&&latest.feedback.status==='ready'&&!check(r.card).ok;});
 for(const c of data.classes){
 const section=el('section','',list);el('h3',c.name,section);
 const rows=data.rows.filter(r=>r.class_id===c.id),w1=data.week1.filter(r=>r.class_id===c.id),usage=data.usage.filter(r=>r.class_id===c.id);
 el('p',`Week 1 已交 ${w1.filter(r=>r.status==='submitted').length} · Week 2 已交 ${rows.filter(r=>r.status==='submitted').length} · 待協助 ${rows.filter(r=>r.review_status==='hold'||r.ai_help).length} · AI 嘗試 ${usage.length} 次`,section);
 el('p','未開始名單以已存在的 Week 1 紀錄為範圍；未登入過的學生需另外對照班級名冊。',section);
 const label=el('label','每人 Week 2 AI 上限（0–10 次，留白依路徑 3／2／2 次）',section),limit=el('input','',label);limit.type='number';limit.min=0;limit.max=10;limit.value=data.settings.find(s=>s.class_id===c.id)?.weekly_ai_limit??'';
 button('保存班級 AI 上限',async()=>{await call({action:'teacher_settings',class_id:c.id,limit:limit.value===''?null:Number(limit.value)});status.textContent='班級上限已更新。';},section);
 for(const w of w1.filter(w=>!rows.some(r=>r.student_id===w.student_id)))el('p',`${w.student_name||w.student_id}：${w.status==='submitted'?'尚未開始 Week 2':'需補交 Week 1'}`,section);
 for(const r of rows.sort((a,b)=>priority(a)-priority(b))){
 const box=el('details','',section),student=w1.find(w=>w.student_id===r.student_id);el('summary',`${student?.student_name||r.student_id} · ${r.student_id} · ${readiness(r)}`,box);
 el('p',`路徑：${r.card.mode} · 版本 ${r.version} · 提交嘗試 ${r.attempts}`,box);
 if(student){el('h4','Week 1 原卡',box);el('p',`${student.observed_problem}\n事實：${student.known_fact}\n假設：${student.unverified_assumption}`,box);}
 const firstAI=data.feedback.find(f=>f.class_id===c.id&&f.student_id===r.student_id);if(firstAI)el('p','Week 1 AI：'+(firstAI.feedback_json?.overall_feedback||''),box);
 el('h4','Week 2 候選痛點',box);r.card.candidates.forEach((cand,i)=>{el('h4',`候選 ${i+1}${i===r.card.selected?'（暫定）':''}`,box);fields.forEach(([k,t])=>el('p',`${t}：${cand[k]}`,box));});
 for(const [k,t]of [['reason','選題理由'],['reconsider','改變選擇的證據'],['statement','痛點陳述'],['ai_response','學生回應 AI']])el('p',`${t}：${r.card[k]||'—'}`,box);
 el('p','受訪者：'+r.card.interviewees.join('；'),box);el('p','訪談問題：'+r.card.questions.join('；'),box);
 const result=check(r.card);el('p','規則檢查：'+(result.ok?'完整':result.errors.join('；')),box);result.warnings.forEach(t=>el('p',t,box));
 const ai=usage.filter(u=>u.student_id===r.student_id&&u.feedback).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];if(ai){el('h4','Week 2 AI（建議，不計成績）',box);el('p',ai.feedback.strength,box);for(const g of ai.feedback.gaps)el('p',g,box);el('p',ai.feedback.next_action,box);if(ai.submission_version!==r.version)el('p','此回饋來自較早版本，請對照修訂。',box);}
 const history=el('details','',box);el('summary','查看保存版本',history);
 button('載入最近 30 個版本',async()=>{const r2=await call({action:'teacher_history',class_id:c.id,student_id:r.student_id});history.querySelectorAll('.saved-version').forEach(x=>x.remove());for(const v of r2.versions){const d=el('details','',history);d.className='saved-version';el('summary',`Week ${v.week} 版本 ${v.version}`,d);const pre=el('pre',JSON.stringify(v.snapshot,null,2),d);pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';}},history);
 const label=el('label','老師的一句具體回饋',box),note=el('textarea','',label);note.maxLength=600;note.value=r.teacher_note||'';
 for(const [v,t]of [['approved','確認進入訪談'],['revision','需要小幅修訂'],['hold','請先與老師討論']])button(t,async()=>{await call({action:'teacher_review',class_id:c.id,student_id:r.student_id,version:r.version,review_status:v,note:note.value});await load();},box);
 }
 }
}
new MutationObserver(()=>{if(dashboard.hidden){list.replaceChildren();data=null;status.textContent='請先登入再載入 Week 2。';}}).observe(dashboard,{attributes:true,attributeFilter:['hidden']});
