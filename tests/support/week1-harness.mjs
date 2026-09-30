// 以記憶體資料表跑真正的 student-api handler。不驗證 PostgreSQL/RLS。
// 寫這個是因為「已提交的卡被清空」只能用行為測出來，讀原始碼測不到。
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

export const FIELDS=['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
export const fullCard=()=>Object.fromEntries(FIELDS.map(k=>[k,`${k} 的內容`]));
export const blankCard=()=>Object.fromEntries(FIELDS.map(k=>[k,'']));

export async function harness(){
 const tables={week1_submissions:[],student_sessions:[],classes:[{id:'class-a'},{id:'class-b'}]};
 const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(i=>i.toString(16).padStart(2,'0')).join('');
 async function student(id='TEST-1',classId='class-a'){
  const token='fixture-'+classId+'-'+id;
  tables.student_sessions.push({class_id:classId,student_id:id,expires_at:'2099-01-01T00:00:00Z',token_hash:await hash(token)});
  return token;
 }
 const db={from(name){let filter=()=>true,op='select',values,one=false;const chain={
  select(){return chain},eq(k,v){const old=filter;filter=r=>old(r)&&r[k]===v;return chain},
  maybeSingle(){one=true;return chain},single(){one=true;return chain},
  upsert(v){op='upsert';values=v;return chain},
  then(res,rej){try{const t=tables[name];if(!t)throw Error('unknown table '+name);
   let rows=t.filter(filter);
   if(op==='upsert'){
    const found=t.find(r=>r.class_id===values.class_id&&r.student_id===values.student_id);
    if(found){const before=JSON.stringify(found);Object.assign(found,structuredClone(values));
     if(JSON.stringify(found)!==before)found.version=(found.version||1)+1;rows=[found];}
    else{const r={version:1,created_at:new Date().toISOString(),...structuredClone(values)};t.push(r);rows=[r];}
   }
   return Promise.resolve({data:structuredClone(one?rows[0]||null:rows),error:null}).then(res,rej);
  }catch(e){return Promise.reject(e).then(res,rej);}}};return chain;},
  async rpc(){return {data:'class-a'};}};
 let src=fs.readFileSync(new URL('../../supabase/functions/student-api/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 src=stripTypeScriptTypes(src).replace('Deno.serve(','return (');
 const handler=new Function('createClient','Deno',src)(()=>db,{env:{get:()=>'test'}});
 async function call(body){
  const r=await handler(new Request('http://localhost/functions/v1/Student-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
  return {status:r.status,body:await r.json()};
 }
 return {tables,student,call};
}
