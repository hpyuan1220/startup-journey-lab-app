// 老師備註（學生看不到）：每位學生每週一格 —— 四個快速標記 ＋ 一句話，當評分參考。
// 一點就存、離開格子就存，不用按鈕；兩者都清空＝刪掉這格。教師洞察的 Week 2 區（Week 1–3）與 Week 4 區（本週）共用。
export const REMARK_TAGS=[['active','積極'],['normal','普通'],['passive','沒參與'],['absent','缺席']];
const LABEL=Object.fromEntries(REMARK_TAGS);
export const tagLabel=t=>LABEL[t]||'';
export const findRemark=(remarks,classId,studentId,week)=>(remarks||[]).find(r=>r.class_id===classId&&r.student_id===studentId&&Number(r.week)===Number(week))||null;

/** 把回傳的這位學生的備註併回 data.remarks（同班同人整組換掉）。 */
export function mergeRemarks(data,classId,studentId,rows){
 if(!data)return;
 data.remarks=(data.remarks||[]).filter(r=>!(r.class_id===classId&&r.student_id===studentId)).concat(rows||[]);
}

/** Week 2 區與 Week 4 區各有自己的 data；任一邊存了備註，另一邊也要跟著更新（不用重新載入）。 */
export function listenRemarks(getData){
 window.addEventListener('sjl-remarks',e=>{const {classId,studentId,rows}=e.detail||{};mergeRemarks(getData(),classId,studentId,rows);});
}

/** 一格編輯器：標記四選一（再點一次取消）＋一行備註。call＝教師端的 API 呼叫函式。 */
export function remarkEditor(parent,{classId,studentId,week,current,call,onSaved,compact=false}){
 const box=document.createElement('div');box.className='trk'+(compact?' trk-compact':'');parent.append(box);
 let tag=current?.tag||'',note=current?.note||'',saving=false,pending=false;
 const tags=document.createElement('div');tags.className='trk-tags';box.append(tags);
 const btns=REMARK_TAGS.map(([k,t])=>{const b=document.createElement('button');b.type='button';b.className='trk-tag trk-tag-'+k;b.textContent=t;b.setAttribute('aria-pressed',String(tag===k));b.title=`Week ${week} 標記：${t}`;tags.append(b);
  b.addEventListener('click',()=>{tag=tag===k?'':k;paint();save();});return b;});
 const input=document.createElement('input');input.type='text';input.maxLength=500;input.value=note;input.placeholder=compact?'一句備註（學生看不到）':'一句備註，例：上台講得清楚／整堂在滑手機（學生看不到）';input.setAttribute('aria-label',`Week ${week} 老師備註`);box.append(input);
 const st=document.createElement('span');st.className='trk-status';box.append(st);
 input.addEventListener('change',()=>{note=input.value;save();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
 function paint(){btns.forEach((b,i)=>b.setAttribute('aria-pressed',String(tag===REMARK_TAGS[i][0])));box.classList.toggle('trk-has',!!(tag||note.trim()));}
 async function save(){
  if(saving){pending=true;return;}
  saving=true;st.textContent='存檔中…';
  try{const r=await call({action:'teacher_remark',class_id:classId,student_id:studentId,week,tag,note});st.textContent=tag||note.trim()?'已存':'已清除';onSaved?.(r.remarks||[]);window.dispatchEvent(new CustomEvent('sjl-remarks',{detail:{classId,studentId,rows:r.remarks||[]}}));}
  catch(e){st.textContent=e.message||'存檔失敗';}
  finally{saving=false;if(pending){pending=false;save();}}
 }
 paint();
 return {box,get value(){return {tag,note};}};
}

/** 唯讀一行：「W2 沒參與：整堂在滑手機」。沒有就回 null。 */
export function remarkText(r){
 if(!r||(!r.tag&&!String(r.note||'').trim()))return '';
 return `${tagLabel(r.tag)}${r.tag&&r.note?'：':''}${r.note||''}`;
}
