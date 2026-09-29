import {fields,normalize,check} from './week2-core.mjs';
export const steps=[['0','痛點 1','補充第一個困擾的人物、情境與證據。'],['1','痛點 2','描述另一個不同困擾，供比較選題。'],['choice','比較與選題','選一題，說明理由及什麼證據會改變選擇。'],['interview','準備訪談','找三位可接觸的人，準備兩題真實經驗問題。'],['source','來源確認','勾選來源；補充說明可留白。'],['ai','AI 建議與修訂','可取得建議再修訂，也可略過。'],['submit','檢查與提交','確認缺項與保存狀態，再正式交件。']];
export const sameCard=(a,b)=>{try{return JSON.stringify(normalize(a))===JSON.stringify(normalize(b));}catch{return false;}};
export const progressKey=(s)=>`sjl-week2-progress-${s.class_id}-${s.student_id}`;
export function stepState(card,row,{ai=false,skipped=false}={}){
 const c=normalize(card),result=check(c);
 const state=(values,labels)=>{const missing=values.map((v,i)=>v?null:labels[i]).filter(Boolean);return {state:missing.length?(values.some(Boolean)?'incomplete':'empty'):'complete',missing};};
 const all=c.candidates.map(x=>state(fields.map(([k])=>x[k]),fields.map(([,l])=>l)));
 const data={'0':all[0],'1':all[1],'2':all[2],choice:state([c.reason,c.reconsider,c.statement],['選題理由','改變選擇的證據','痛點陳述']),interview:state([...c.interviewees,...c.questions,c.contact_confirmed,c.questions_checked],['受訪者 1','受訪者 2','受訪者 3','訪談問題 1','訪談問題 2','確認可接觸受訪者','確認問題不引導']),source:{state:c.source_types.length||c.source_reference||c.external_ai||(c.source&&c.source!=='我的親身觀察')?'complete':'optional',missing:[]},ai:{state:ai?'reviewed':skipped?'skipped':'optional',missing:[]},submit:{state:row?.status==='submitted'&&sameCard(c,row.card)?'submitted':result.ok?'ready':'incomplete',missing:result.errors},challenge:{state:'optional',missing:[]}};
 return data;
}

export function cardDifferences(a,b){
 const left=normalize(a),right=normalize(b),out=[];
 const compare=(label,x,y)=>{if(JSON.stringify(x)!==JSON.stringify(y))out.push({label,local:x,cloud:y});};
 for(let i=0;i<Math.max(left.candidates.length,right.candidates.length);i++)for(const [key,label]of fields)compare(`痛點 ${i+1}：${label}`,left.candidates[i]?.[key]||'',right.candidates[i]?.[key]||'');
 for(const [key,label]of [['mode','填答模式'],['selected','暫定選題（0 為痛點 1）'],['reason','選題理由'],['reconsider','改變選擇的證據'],['statement','痛點陳述'],['interviewees','受訪者'],['questions','訪談問題'],['contact_confirmed','接觸確認'],['questions_checked','問題確認'],['source_types','來源勾選'],['source_reference','資料來源'],['external_ai','其他 AI'],['source','原來源說明'],['ai_response','AI 回應'],['challenge','進階探索']])compare(label,left[key],right[key]);
 return out;
}
