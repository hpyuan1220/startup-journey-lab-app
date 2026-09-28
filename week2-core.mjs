// Shared browser/server contract. No identity fields belong in this document.
export const sourceOptions=[['observation','自己的親身經驗或觀察'],['conversation','與他人的非正式聊天'],['reference','網路或其他資料'],['hypothesis','尚無直接觀察，目前是假設']];
export const RULES_VERSION='w2-20260927';
export const fields=[['people','受到影響的人'],['context','何時何地發生'],['job','想完成的事情'],['problem','遇到的阻礙'],['frequency','頻率或待驗證'],['cost','代價或待驗證'],['workaround','目前處理方法'],['evidence','已有觀察與來源'],['assumption','待驗證假設']];
export const challengeFields=[['non_user','誰沒有這個問題'],['counterexample','最大的反例'],['acceptance','為何仍接受現在的方法'],['payer','使用者、受益者與付費者'],['risky_test','最危險的假設與低成本測試']];
export const emptyCard=()=>({mode:'guided',candidates:[Object.fromEntries(fields.map(([k])=>[k,''])),Object.fromEntries(fields.map(([k])=>[k,'']))],selected:0,reason:'',reconsider:'',statement:'',interviewees:['','',''],questions:['',''],challenge:{},source:'我的親身觀察',ai_response:'',contact_confirmed:false,questions_checked:false});
export function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('學習卡格式不正確。');
 const clean=(v,max=600)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error(`文字請保持在 ${max} 字以內。`);return v.trim();};
 if(!['guided','standard','challenge'].includes(input.mode))throw Error('請選擇引導方式。');
 if(!Array.isArray(input.candidates)||input.candidates.length<2||input.candidates.length>3)throw Error('請保留二至三個候選痛點。');
 const d={mode:input.mode,candidates:input.candidates.map(c=>Object.fromEntries(fields.map(([k])=>[k,clean(c?.[k])]))),selected:input.selected,reason:clean(input.reason),reconsider:clean(input.reconsider),statement:clean(input.statement),interviewees:[0,1,2].map(i=>clean(input.interviewees?.[i],200)),questions:[0,1].map(i=>clean(input.questions?.[i],300)),challenge:Object.fromEntries(challengeFields.map(([k])=>[k,clean(input.challenge?.[k])])),source:clean(input.source,60),source_types:sourceOptions.map(([k])=>k).filter(k=>Array.isArray(input.source_types)&&input.source_types.includes(k)),source_reference:clean(input.source_reference,200),external_ai:clean(input.external_ai,200),ai_response:clean(input.ai_response),contact_confirmed:input.contact_confirmed===true,questions_checked:input.questions_checked===true};
 if(!Number.isInteger(d.selected)||!d.candidates[d.selected])throw Error('請選擇一個候選痛點。');
 return d;
}
export function check(d){
 const errors=[],warnings=[];
 if(JSON.stringify(d).includes('＿＿'))warnings.push('內容仍含範例空格，請填入自己的觀察。');
 if(d.statement==='在午休情境中，學生想要吃飯，但是因為排隊而遇到時間不足，目前只能用便利商店處理；我仍需驗證頻率。')warnings.push('這段與教學範例相同，請確認已改成自己的真實事件。');
 if(!d.contact_confirmed)errors.push('請確認三位受訪者符合暫定對象，且有實際接觸方式。');
 if(!d.questions_checked)errors.push('請確認兩題訪談問題詢問真實經驗，不暗示答案或推銷產品。');
 d.candidates.forEach((c,i)=>fields.forEach(([k,label])=>{if(!c[k])errors.push(`候選 ${i+1}：請填寫${label}`);else if(c[k].length<4)warnings.push(`候選 ${i+1}「${label}」較短，請確認是否足夠具體。`);}));
 for(const [k,label] of [['reason','選題理由'],['reconsider','會改變選擇的證據'],['statement','修訂後的痛點陳述']])if(!d[k])errors.push(`請填寫${label}`);
 d.interviewees.forEach((v,i)=>{if(!v)errors.push(`請填寫受訪者 ${i+1} 的角色與接觸方式（不寫姓名或電話）`);});
 if(d.interviewees.every(Boolean)&&new Set(d.interviewees).size<3)errors.push('請描述三位不同的受訪者。');
 d.questions.forEach((v,i)=>{if(!v)errors.push(`請填寫訪談問題 ${i+1}`);if(/會不會.*(使用|買)|是不是|你同意|願不願意.*(付|用)/.test(v))warnings.push(`訪談問題 ${i+1} 可能引導答案，請改問最近一次經驗。`);});
 if(d.questions.every(Boolean)&&d.questions[0]===d.questions[1])errors.push('兩個訪談問題請勿重複。');
 if(d.candidates.some(c=>/我要做|想做|開發.*(App|平台|系統)/i.test(c.problem)))warnings.push('問題可能直接描述產品，請確認具體阻礙。這項提示不會阻擋提交。');
 if(d.candidates[0].problem&&d.candidates[0].problem===d.candidates[1].problem)errors.push('兩個候選痛點請描述不同問題。');
 if(d.mode==='challenge'&&challengeFields.some(([k])=>!d.challenge[k]))warnings.push('進階挑戰尚未全部完成，可繼續補充；不影響共同最低成果。');
 return {ok:!errors.length,errors,warnings,rules_version:RULES_VERSION};
}
export function aiInput(d,kind,identifiers=[]){
 // Allowlist excludes identity, interviewee contact descriptions and previous AI prose.
 const selected=d.candidates[d.selected];
 const value=kind==='explore'?{context:selected.context,problem:selected.problem,evidence:selected.evidence}: {candidates:d.candidates,selected:d.selected,reason:d.reason,reconsider:d.reconsider,statement:d.statement,questions:d.questions,challenge:d.mode==='challenge'?d.challenge:{}};
 let text=JSON.stringify(value).normalize('NFKC').replace(/\s+/g,' ');
 for(const id of identifiers.filter(x=>typeof x==='string'&&x.length>1))text=text.split(id).join('[已移除身分資訊]');
 return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[Email 已移除]').replace(/(?:\+?886[-\s]?)?09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g,'[電話已移除]').replace(/https?:\/\/[^\s"\\]+/g,'[連結已移除]');
}
export function readiness(row){if(!row||row.status!=='submitted')return '尚未提交';if(row.review_status==='hold')return '請先與老師討論';return row.review_status==='revision'?'請修訂，同時可準備訪談':row.review_status==='approved'?'教師已確認，可準備 Week 3 訪談':'已提交／待教師抽查，可準備 Week 3 訪談';}
export function priority(row){return row.ai_help?0:row.review_status==='hold'?1:row.attempts>=3&&row.review_status!=='approved'?2:row.ai_conflict?3:row.review_status==='revision'?4:row.status==='submitted'&&row.review_status==='pending'?5:6;}

export function validFeedback(f){
 const text=v=>typeof v==='string'&&v.length<=1200;
 const list=(v,min,max)=>Array.isArray(v)&&v.length>=min&&v.length<=max&&v.every(text);
 return !!f&&['ready','revise','help'].includes(f.status)&&text(f.strength)&&text(f.next_action)&&list(f.gaps,0,3)&&list(f.assumptions,0,3)&&list(f.questions,2,2)&&list(f.directions,0,3)&&JSON.stringify(f).length<=6000;
}
export function privacyRisk(text){return /(?:姓名|身分證|身份證|地址|電話|學號)\s*[:：]|[A-Z][12]\d{8}|\b0[2-8][- ]?\d{6,8}\b/.test(text);}
