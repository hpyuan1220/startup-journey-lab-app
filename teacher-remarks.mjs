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
export function listenRemarks(getData,reload){
 window.addEventListener('sjl-remarks',e=>{const {classId,studentId,rows}=e.detail||{};mergeRemarks(getData(),classId,studentId,rows);});
 // 整批存完（把推算存成標記）之後，兩區都重新載入一次，CSV 和收合列才會是最新的。
 if(reload)window.addEventListener('sjl-remarks-reload',()=>{if(getData())reload();});
}

/** Week 1–3 沒有課堂兩題，出席無從得知；系統只能從作業推算一個「建議標記」，老師沒點之前用虛線顯示，點了任何一個就以老師的為準。
 * 規則（寫死、可查）：
 *  W1 起點卡：已交＝普通；草稿＝沒參與；沒有＝缺席
 *  W2 痛點卡：老師已確認＝積極；已交＝普通；草稿＝沒參與；沒有＝缺席
 *  W3 訪談卡：已交且三次都記完＝積極；有記至少一次＝普通；開了頁沒記＝沒參與；沒有＝缺席 */
export function suggestTag(week,{w1,w2,w3,interviews}={}){
 if(week===1){if(!w1)return {tag:'absent',why:'沒有 Week 1 紀錄'};return w1.status==='submitted'?{tag:'normal',why:'Week 1 已交'}:{tag:'passive',why:'Week 1 停在草稿'};}
 if(week===2){if(!w2)return {tag:'absent',why:'沒開始 Week 2'};if(w2.review_status==='approved')return {tag:'active',why:'Week 2 老師已確認'};return (w2.status==='submitted'||w2.submitted_at)?{tag:'normal',why:'Week 2 已交'}:{tag:'passive',why:'Week 2 停在草稿'};}
 if(week===3){if(!w3)return {tag:'absent',why:'沒開始 Week 3'};const n=Number(interviews||0);if(w3.status==='submitted'&&n>=3)return {tag:'active',why:'Week 3 已交、三次都記完'};return n>=1?{tag:'normal',why:`Week 3 記了 ${n} 次`}:{tag:'passive',why:'Week 3 開了頁沒記'};}
 return null;
}

/** Week 4 起有課堂兩題，推算用出席＋三張卡：出席且三張卡都貼回＝積極；出席＝普通；沒出席但有做（課後補答或貼了卡）＝沒參與；什麼都沒有＝缺席。 */
export function suggestTagResearch(week,{present,cards,answered}={}){
 const n=Number(cards||0);
 if(present&&n>=3)return {tag:'active',why:`Week ${week} 出席、三張卡都貼回`};
 if(present)return {tag:'normal',why:`Week ${week} 出席（卡 ${n}/3）`};
 if(answered||n>=1)return {tag:'passive',why:`Week ${week} 沒在課堂時段答兩題，但有做（卡 ${n}/3）`};
 return {tag:'absent',why:`Week ${week} 沒有任何紀錄`};
}

/** 評分參考用：老師點的優先，沒點就用系統推算。回 {tag, source:'teacher'|'system'|''}。 */
export function effectiveTag(remark,suggested){
 if(remark?.tag)return {tag:remark.tag,source:'teacher'};
 if(suggested?.tag)return {tag:suggested.tag,source:'system'};
 return {tag:'',source:''};
}

/** 把推算存成標記（只填老師還沒點的）。items=[{classId,studentId,week,tag}]；一次最多 4 個請求並行。 */
export async function freezeSuggestions(items,call,onProgress){
 let done=0,failed=0;const queue=[...items];
 async function worker(){while(queue.length){const it=queue.shift();try{await call({action:'teacher_remark',class_id:it.classId,student_id:it.studentId,week:it.week,tag:it.tag,note:it.note||''});done++;}catch{failed++;}onProgress?.(done,failed,items.length);}}
 await Promise.all([0,1,2,3].map(worker));
 window.dispatchEvent(new CustomEvent('sjl-remarks-reload'));
 return {done,failed,total:items.length};
}

/** 一格編輯器：標記四選一（再點一次取消）＋一行備註。call＝教師端的 API 呼叫函式。 */
export function remarkEditor(parent,{classId,studentId,week,current,call,onSaved,compact=false,suggested=null}){
 const box=document.createElement('div');box.className='trk'+(compact?' trk-compact':'');parent.append(box);
 let tag=current?.tag||'',note=current?.note||'',saving=false,pending=false;
 const tags=document.createElement('div');tags.className='trk-tags';box.append(tags);
 const btns=REMARK_TAGS.map(([k,t])=>{const b=document.createElement('button');b.type='button';b.className='trk-tag trk-tag-'+k;b.textContent=t;b.setAttribute('aria-pressed',String(tag===k));b.title=`Week ${week} 標記：${t}`;tags.append(b);
  b.addEventListener('click',()=>{tag=tag===k?'':k;paint();save();});return b;});
 const input=document.createElement('input');input.type='text';input.maxLength=500;input.value=note;input.placeholder=compact?'一句備註（學生看不到）':'一句備註，例：上台講得清楚／整堂在滑手機（學生看不到）';input.setAttribute('aria-label',`Week ${week} 老師備註`);box.append(input);
 const st=document.createElement('span');st.className='trk-status';box.append(st);
 input.addEventListener('change',()=>{note=input.value;save();});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
 function paint(){btns.forEach((b,i)=>{const k=REMARK_TAGS[i][0];b.setAttribute('aria-pressed',String(tag===k));const sug=!tag&&suggested&&suggested.tag===k;b.classList.toggle('trk-suggest',sug);if(sug)b.title=`系統推算：${suggested.why}（老師沒點就只是建議，不會存）`;});box.classList.toggle('trk-has',!!(tag||note.trim()));
  if(!tag&&!note.trim()&&suggested&&!st.textContent)st.textContent='推算';}
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
