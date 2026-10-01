// 驗收用：單一伺服器，Week 1 與 Week 2 共用同一組記憶體資料表，
// 兩個 handler 都是從 supabase/functions/ 直接載入的真實程式碼。
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
import fsSync from 'node:fs';import {fileURLToPath} from 'node:url';import {stripTypeScriptTypes} from 'node:module';
import * as core from '../week2-core.mjs';

// 專案根目錄：路徑含空白時 URL.pathname 會是 %20，必須用 fileURLToPath 還原。
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), port=Number(process.env.PORT||4210);
const tables={classes:[{id:'class-a',name:'驗收班'}],teacher_classes:[],student_sessions:[],
 week1_submissions:[],week2_submissions:[],week1_ai_feedback:[],week1_ai_feedback_latest:[],
 learning_versions:[],week2_ai_requests:[],week2_settings:[]};
let seq=0;
const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');

const db={
 auth:{getUser:async()=>({data:{user:null},error:'no'})},
 from(name){let filter=()=>true,op='select',values,one=false,sortKey,asc=true,limit=Infinity;
  const chain={
   select(){return chain},
   eq(k,v){return chain.match({[k]:v})},
   match(o){const old=filter;filter=r=>old(r)&&Object.entries(o).every(([k,v])=>r[k]===v);return chain},
   in(k,v){const old=filter;filter=r=>old(r)&&v.includes(r[k]);return chain},
   order(k,o={}){sortKey=k;asc=o.ascending!==false;return chain},
   limit(n){limit=n;return chain},
   maybeSingle(){one=true;return chain},single(){one=true;return chain},
   insert(v){op='insert';values=v;return chain},
   upsert(v){op='upsert';values=v;return chain},
   update(v){op='update';values=v;return chain},
   then(res,rej){try{
    const t=tables[name];if(!t)throw Error('unknown table '+name);
    let rows=t.filter(filter);
    if(op==='insert'||op==='upsert'){
     const key=values.student_id!==undefined?['class_id','student_id']:['class_id'];
     const found=op==='upsert'?t.find(r=>key.every(k=>r[k]===values[k])):null;
     if(found){const before=JSON.stringify(found);Object.assign(found,structuredClone(values));
      if(JSON.stringify(found)!==before)found.version=(found.version||1)+1;rows=[found];}
     else{const r={id:'id'+(++seq),version:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...structuredClone(values)};t.push(r);rows=[r];}
    }
    if(op==='update')rows.forEach(r=>Object.assign(r,structuredClone(values),{version:(r.version||0)+1,updated_at:new Date().toISOString()}));
    if(name==='week2_submissions'&&op!=='select')rows.forEach(r=>tables.learning_versions.push({class_id:r.class_id,student_id:r.student_id,week:2,version:r.version,snapshot:structuredClone(r),created_at:new Date().toISOString()}));
    if(sortKey)rows.sort((a,b)=>String(a[sortKey]).localeCompare(String(b[sortKey]))*(asc?1:-1));
    rows=rows.slice(0,limit);
    return Promise.resolve({data:structuredClone(one?rows[0]||null:rows),error:null}).then(res,rej);
   }catch(e){return Promise.reject(e).then(res,rej);}}};
  return chain;},
 async rpc(name,a){
  if(name==='validate_class_invite')return {data:a.p_invite_code==='GOOD-CODE'?'class-a':null};
  if(name==='reserve_week2_ai'){const t=tables.week2_ai_requests,scope=t.filter(r=>r.class_id===a.cid&&r.student_id===a.sid);
   if(scope.some(r=>r.content_hash===a.h)||scope.length>=a.lim)return {data:null};
   const id='ai'+(++seq);t.push({id,class_id:a.cid,student_id:a.sid,content_hash:a.h,kind:a.k,state:'pending',created_at:new Date().toISOString()});return {data:id};}
  return {data:null};}
};
const load=(file,extraNames=[],extraVals=[])=>{
 let src=fsSync.readFileSync(new URL(file,import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 src=stripTypeScriptTypes(src).replace('Deno.serve(','return (');
 return new Function('createClient','Deno','fetch',...extraNames,src)(()=>db,{env:{get:k=>k==='OPENAI_API_KEY'?'test':'test'}},
   async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({status:'revise',strength:'清楚',gaps:['補一次事件'],assumptions:['頻率未驗證'],questions:['上次何時發生？','當時怎麼處理？'],next_action:'記錄一次事件',directions:[]})}}],usage:{total_tokens:10}}),{status:200}),
   ...extraVals);
};
const studentApi=load('../supabase/functions/student-api/index.ts');
const names=Object.keys(core);
const week2Api=load('../supabase/functions/week2-api/index.ts',names,names.map(n=>core[n]));

const AI_FB={readiness:{problem_clarity:{score:3,reason:'清楚'},evidence_quality:{score:3,reason:'有事實'},user_specificity:{score:3,reason:'具體'},next_validation_step:{score:3,reason:'有行動'},total_readiness:12},
 strengths:['情境具體'],gaps:['可再補一次事件'],follow_up_questions:['上次何時發生？'],next_small_action:'記錄一次事件',overall_feedback:'方向清楚，請補一次真實事件。'};

const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,`http://127.0.0.1:${port}`);
 const send=(o,s=200)=>{res.writeHead(s,{'Content-Type':'application/json'});res.end(JSON.stringify(o));};
 if(u.pathname==='/config.js'){res.setHeader('Content-Type','text/javascript');
  return res.end(`window.STARTUP_JOURNEY_CONFIG={supabaseUrl:'http://127.0.0.1:${port}',supabaseAnonKey:'local'};`);}
 if(u.pathname==='/_state'){return send({week1:tables.week1_submissions.map(r=>({sid:r.student_id,status:r.status,ver:r.version})),
   week2:tables.week2_submissions.map(r=>({sid:r.student_id,status:r.status,ver:r.version})),sessions:tables.student_sessions.length});}
 if(u.pathname==='/functions/v1/Student-api'||u.pathname==='/functions/v1/week2-api'){
  let raw='';for await(const c of req)raw+=c;
  const h=u.pathname.endsWith('week2-api')?week2Api:studentApi;
  const r=await h(new Request(u,{method:req.method,headers:req.headers,body:raw}));
  res.writeHead(r.status,{'Content-Type':'application/json'});return res.end(await r.text());}
 if(u.pathname==='/functions/v1/ai-feedback'){let raw='';for await(const c of req)raw+=c;
  const b=JSON.parse(raw||'{}');
  if(b.action==='latest')return send({feedback:null});
  return send({feedback:AI_FB,cached:false,content_hash:await sha(JSON.stringify(b.submission||{}))});}
 const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!f.startsWith(root)){res.writeHead(403);return res.end();}
 const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
 res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');
 res.end(await fs.readFile(f));
}catch(e){
 // 不存在的路徑（例如 /favicon.ico）回 404，不要回 500 ——
 // 否則測試報告會出現假的伺服器錯誤，掩蓋真正的問題。
 const notFound=e&&(e.code==='ENOENT'||/ENOENT/.test(String(e.message)));
 res.writeHead(notFound?404:500);res.end(String(e&&e.message));}});
server.listen(port,'127.0.0.1',()=>console.log('acceptance server on '+port));
