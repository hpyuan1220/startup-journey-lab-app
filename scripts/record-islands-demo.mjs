// 群島示範影片：用假資料庫的本機伺服器，手機直式錄一整輪（開場→選方向→逛島→找島→店家→Irene→三題→估價→開箱→推薦給組），
// 字幕直接畫在頁面上（錄進影片），游標用假的圓點。先啟動：SJL_WRITE_OPEN_AT=2000-01-01T00:00:00Z PORT=4261 node tests/serve-acceptance.mjs
// 用法：node scripts/record-islands-demo.mjs [outDir]   → outDir/islands-demo.webm ＋ captions.json（每段字幕的秒數，給後製配音用）
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)(process.env.PW_PATH||'/home/claude/node_modules/playwright/index.js');
import fs from 'node:fs';import path from 'node:path';
const BASE=process.env.BASE||'http://127.0.0.1:4261';const OUT=process.argv[2]||'/tmp/islands-demo';fs.mkdirSync(OUT,{recursive:true});
const SID='A1139900'+String(Date.now()%100).padStart(2,'0');
const post=(p,body)=>fetch(`${BASE}/functions/v1/${p}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
const TOKEN=(await post('Student-api',{action:'login',student_id:SID,invite_code:'GOOD-CODE',confirm_new:true})).token;
await post('week2-api',{action:'team_create',token:TOKEN,name:'示範組'});// 方向等遊戲裡選完再認（讓影片看得到 Irene 問方向）
// 版型：DESKTOP=1 → 1040×880（錄成 1920×1625，字幕大，適合投影／YouTube）；預設手機直式 414×896（錄成 828×1792）
const DESK=process.env.DESKTOP==='1';const W=DESK?1040:414,H=DESK?880:896,SCALE=DESK?1920/1040:2;
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:SCALE,isMobile:!DESK,hasTouch:!DESK,recordVideo:{dir:OUT,size:{width:Math.round(W*SCALE),height:Math.round(H*SCALE)}}});
await ctx.addInitScript(([t,s])=>{localStorage.setItem('sjl-student-session',JSON.stringify({token:t,class_id:'class-a',student_id:s}));},[TOKEN,SID]);
const p=await ctx.newPage();
const t0=Date.now();const caps=[];
const SLOW=Number(process.env.SLOW||1);// 1.3＝整體慢 30%
const sleep=ms=>p.waitForTimeout(ms*SLOW);
// 字幕條＋假游標
async function overlayInit(){await p.evaluate((DESK)=>{
 const s=document.createElement('style');s.textContent=`#demo-cap{position:fixed;left:50%;transform:translateX(-50%);width:min(94vw,${DESK?800:600}px);${DESK?'top:14px':'bottom:22px'};z-index:9999;background:#102b33f0;color:#fff;font:700 ${DESK?24:17}px/1.45 "Noto Sans CJK TC",sans-serif;padding:${DESK?16:12}px ${DESK?22:14}px;border-radius:14px;box-shadow:0 6px 20px #0008;pointer-events:none;opacity:0;transition:opacity .25s;text-align:left}#demo-cap.on{opacity:1}${DESK?'html{zoom:1.28}body{padding-top:96px!important}':''}#demo-cap small{display:block;font-weight:500;font-size:${DESK?18:13}px;opacity:.9;margin-top:4px}
 #demo-cur{position:fixed;z-index:10000;width:${DESK?34:26}px;height:${DESK?34:26}px;border-radius:50%;background:#ff6b35cc;border:3px solid #fff;box-shadow:0 2px 8px #0008;pointer-events:none;transform:translate(-50%,-50%);left:200px;top:400px;transition:left .45s ease,top .45s ease,transform .12s}#demo-cur.tap{transform:translate(-50%,-50%) scale(.7)}`;
 document.head.append(s);const c=document.createElement('div');c.id='demo-cap';document.body.append(c);const k=document.createElement('div');k.id='demo-cur';document.body.append(k);},DESK);}
async function cap(text,sub){const at=(Date.now()-t0)/1000;caps.push({at:+at.toFixed(1),text,sub:sub||''});await p.evaluate(([t,s])=>{const c=document.getElementById('demo-cap');c.innerHTML=t+(s?'<small>'+s+'</small>':'');c.classList.add('on');},[text,sub||'']);}
async function capOff(){await p.evaluate(()=>document.getElementById('demo-cap')?.classList.remove('on'));}
// 把元素捲到畫面中、游標移過去、點
async function tap(getEl,holdMs=900){
 try{await p.waitForFunction((src)=>!!(new Function('return ('+src+')()'))(),getEl.toString(),{timeout:8000});}catch{}
 const box=await p.evaluate((src)=>{const el=(new Function('return ('+src+')()'))();if(!el)return null;el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},getEl.toString());
 if(!box){console.log('tap: not found',getEl.toString().replace(/\s+/g,' ').slice(0,160));return false;}
 await p.evaluate(([x,y])=>{const k=document.getElementById('demo-cur');k.style.left=x+'px';k.style.top=y+'px';},[box.x,box.y]);await sleep(520);
 await p.evaluate(()=>document.getElementById('demo-cur').classList.add('tap'));await sleep(120);
 await p.evaluate((src)=>{(new Function('return ('+src+')()'))()?.click();},getEl.toString());
 await p.evaluate(()=>document.getElementById('demo-cur').classList.remove('tap'));await sleep(holdMs);return true;
}
const byText=(sel,re)=>new Function(`return [...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>${re}.test(x.textContent)&&!x.disabled)`);
const pin=name=>new Function(`return [...document.querySelectorAll('.ov-pin')].find(x=>${new RegExp(name)}.test(x.getAttribute('aria-label')||''))`);
const scrollTop=async()=>{await p.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await sleep(600);};
const scrollTo=async(sel)=>{await p.evaluate(s=>document.querySelector(s)?.scrollIntoView({block:'center',behavior:'smooth'}),sel);await sleep(700);};

await p.goto(`${BASE}/islands.html`);await sleep(1500);await overlayInit();
// ① 開場
await cap('① 這是「AI 新創群島」：十座島、三個方向，每座島住著真的 AI 新創。','先看三張「怎麼玩」卡');
await sleep(2500);await scrollTo('#overlay .overlay-head');await sleep(2500);
await tap(byText('#overlay .ui','/下一張/'),2600);await tap(byText('#overlay .ui','/下一張/'),2600);await tap(byText('#overlay .ui','/開始尋寶/'),1200);
// ② 選方向
await scrollTop();await cap('② Irene 先問你在組裡認的方向。選了之後，你方向的島會變綠點。','這次示範選「方向二｜AI 原生服務」');
await sleep(1500);await scrollTo('#choices');await tap(byText('#choices .ui','/方向二/'),1800);await post('week2-api',{action:'team_claim',token:TOKEN,directions:[2]});await scrollTop();await sleep(1500);
// ③ 逛島、圈候選
await cap('③ 按「逛島、圈候選」，點一座綠島——船會開過去。','到你方向的島看看住哪些公司');
await scrollTo('#choices');await tap(byText('#choices .ui','/逛島/'),1000);await scrollTop();await sleep(800);
await tap(pin('餐飲零售'),2400);
await cap('這座島住兩家公司。圈最多 2 家候選，再按「開這一箱」。','候選＝你想研究的公司');
await scrollTo('#overlay .treasure');await sleep(800);
await tap(byText('#overlay .ui','/設為候選/'),1200);await tap(byText('#overlay .ui','/開這一箱/'),1200);
// ④ 找島
await scrollTop();await cap('④ 找島：讀三句線索，想它賣什麼、賣給誰，點一座島。','猜錯不扣分，Irene 會提示');
await sleep(1500);await scrollTo('#find-clues');await sleep(2500);await scrollTop();
await tap(pin('財務後台'),2200);
await cap('猜錯了：船開過去、那座島劃掉，Irene 在對話框給提示。','再想一次：餐廳訂餐 → 餐飲零售');
await scrollTo('#d-title');await sleep(2200);await scrollTop();
await tap(pin('餐飲零售'),2200);
// ⑤ 島上
await cap('⑤ 登島！照順序：店家 → Irene 研究屋 → 答三題。','AI 探索站是加分，做了夥伴升 Lv.2');
await sleep(1200);await tap(new Function("return document.querySelector('[data-destination=\"shop\"]')"),3200);
await scrollTo('#d-title');await cap('店家講這家公司解決什麼痛。可以多問兩句。','店家故事＝七格卡的材料');
await sleep(1200);await tap(byText('#choices .ui','/幫誰|做什麼|例子/'),2600);
await tap(byText('#choices .ui','/去 Irene/'),3200);await scrollTo('#d-title');
await cap('Irene 幫你整理重點，也講計分：三題各 10 分，第 1 次對 10、第 2 次 7。','第三題要貼一個來源網址');
await sleep(3200);
await tap(byText('#choices .ui','/答三題/'),1000);await scrollTo('#overlay .overlay-head');
await cap('⑥ 答三題。選錯會給提示、下次答對 7 分；沒選就送出會說「先選一個答案」。','');
await sleep(1200);
await tap(new Function("return document.querySelectorAll('#overlay .opt')[0]"),600);await tap(byText('#overlay .ui','/送出答案/'),1800);
await tap(new Function("return document.querySelectorAll('#overlay .opt')[1]"),600);await tap(byText('#overlay .ui','/送出答案/'),1500);
await scrollTo('#d-title');await sleep(900);await tap(byText('#choices .ui','/下一題/'),800);await scrollTo('#overlay .overlay-head');
await tap(new Function("return document.querySelectorAll('#overlay .opt')[1]"),600);await tap(byText('#overlay .ui','/送出答案/'),1500);
await scrollTo('#d-title');await tap(byText('#choices .ui','/下一題/'),800);await scrollTo('#overlay .overlay-head');
await cap('第 3 題要貼來源網址——題目下面有「去哪找」三個連結。','');
await tap(new Function("return document.querySelectorAll('#overlay .opt')[0]"),600);
await p.evaluate(()=>document.querySelector('#q-url')?.scrollIntoView({block:'center'}));await p.fill('#q-url','https://www.owner.com/pricing');await sleep(900);
await tap(byText('#overlay .ui','/送出答案/'),1500);await scrollTo('#d-title');
// ⑦ 估價＋開箱
await cap('⑦ 三題過了！不公開價格的公司會多一題「估價加分 +5」（選填）。','估在 Irene 給的兩個錨之間就加 5 分');
await sleep(2500);await tap(byText('#choices .ui','/去開寶箱|直接開寶箱/'),3000);
await scrollTop();await cap('寶箱開了：拿到七格卡＋一隻夥伴。','七格卡就是期末要用的材料');
await sleep(2200);await scrollTo('#overlay .reward-card, #overlay .overlay-head');await sleep(1200);
await p.evaluate(()=>window.scrollBy({top:300,behavior:'smooth'}));await sleep(1800);await p.evaluate(()=>window.scrollBy({top:300,behavior:'smooth'}));await sleep(1800);
// ⑧ 推薦給組
await cap('⑧ 開完兩箱，到「情報袋」挑一家按「推薦給我的組」。','三個人各推一家，12/4 比一比');
await p.reload();await sleep(1500);await overlayInit();await cap('⑧ 開完兩箱，到「情報袋」挑一家按「推薦給我的組」。','三個人各推一家，12/4 比一比');await scrollTop();await tap(new Function("return document.querySelector('#btn-bag')"),1500);await scrollTo('#overlay .rep-btn');
await tap(byText('#overlay .rep-btn','/推薦|代表/'),1200);await tap(byText('#overlay .ui','/確定，推薦這家/'),2200);
await cap('離開教室前對一下：有組、認了方向、開了兩箱、推薦了一家、理由卡補兩個來源。','12/4 前要齊');
await sleep(4500);await capOff();await sleep(800);
await ctx.close();await b.close();
const files=fs.readdirSync(OUT).filter(f=>f.endsWith('.webm'));const src=path.join(OUT,files[0]);fs.renameSync(src,path.join(OUT,'islands-demo.webm'));
fs.writeFileSync(path.join(OUT,'captions.json'),JSON.stringify(caps,null,1));
console.log('done',path.join(OUT,'islands-demo.webm'),'segments',caps.length,'duration~',((Date.now()-t0)/1000).toFixed(0)+'s');
