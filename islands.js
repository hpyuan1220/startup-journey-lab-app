import {DIRECTIONS,ISLANDS,COMPANIES,islandById,dirById,companyById,scoreFor,boxScore,isUrl,cardText,EST_BONUS} from './islands-data.mjs?v=20261111-art';
// AI 新創群島・尋寶版（學生端）。流程：寶箱清單 → 找島 → 島上（店家／Irene／探索站）→ 三題 → 開箱。
// 進度：localStorage 當快取（依學號分開），登入的學生每次存檔同步到 Supabase（islands_save，伺服器為準）；老師頁只看紀錄，不投影。沒登入只能逛島，不能開箱。
const root=document.getElementById('harbor'),$=s=>root.querySelector(s);
let session;try{session=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
const sid=session?.student_id||'guest';
const KEY='sjl-islands:'+sid;
const freshBox=()=>({found:false,wrong:[],hints:0,clues:[],attempts:[0,0,0],scores:[0,0,0],passed:0,url:'',deep:false,insight:'',argue:'',opened:false,at:null,est:'',estOk:null});
let store={boxes:{},dir:null,candidates:[]};
try{store={...store,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{}
if(!Array.isArray(store.candidates))store.candidates=[];
const CAND_MAX=2;
const cfg=window.STARTUP_JOURNEY_CONFIG||{};
async function api(body){const r=await fetch(`${cfg.supabaseUrl}/functions/v1/week2-api`,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({...body,token:session?.token})});const b=await r.json().catch(()=>({}));if(!r.ok){const e=Error(b.error||`連線失敗 ${r.status}`);e.status=r.status;throw e;}return b;}
let syncTimer=null,syncState='';// '' | 'saving' | 'saved' | 'error'
function setSync(st){syncState=st;const w=$('#who');if(!w)return;if(!session?.token){w.textContent='未登入：進度只在這台電腦，老師看不到；要開箱請先登入';w.className='who warn';return;}w.textContent=(session.student_id||'')+(st==='saving'?' · 存檔中…':st==='error'?' · 沒存到雲端，重試中':st==='saved'?' · 已存雲端':'');w.className='who'+(st==='error'?' warn':'');}
async function syncNow(){if(!session?.token)return;clearTimeout(syncTimer);setSync('saving');try{await api({action:'islands_save',data:store});setSync('saved');}catch{setSync('error');syncTimer=setTimeout(syncNow,5000);}}
function save(){store.updated_at=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}if(session?.token){clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,700);}}
async function loadRemote(){if(!session?.token)return;try{const r=await api({action:'islands_load'});const remote=r.row?.data;
  if(remote&&typeof remote==='object'&&(!store.updated_at||!remote.updated_at||remote.updated_at>=store.updated_at)){store={boxes:{},dir:null,candidates:[],...remote};if(!Array.isArray(store.candidates))store.candidates=[];try{localStorage.setItem(KEY,JSON.stringify(store));}catch{}}
  else if(store.updated_at&&(!remote||!remote.updated_at||store.updated_at>remote.updated_at)&&Object.keys(store.boxes).length)syncNow();
  // 方向：還沒選就用組裡認的（認兩個的人先用第一個）
  myDirs=Array.isArray(r.directions)?r.directions:[];myReps=r.reps||{};myTeamId=r.team_id||null;
  if(!store.dir&&myDirs.length){store.dir=myDirs[0];}
  myDir=Number(store.dir)||0;setSync('saved');}catch(e){setSync('error');}}
const loggedIn=()=>!!session?.token;
// 我在組裡認的方向、我的代表（方向→公司），islands_load 帶回
let myDirs=[],myReps={},myTeamId=null;
async function setRep(c,d,on){const ov=overlay(on?'推薦給我的組？':'取消推薦？');el('p',on?`你替組裡挑了「${c.name}」當「${dirShort(d)}」那一家。12/4 課堂你們三個人各帶一家來比，選一家上台。Week 9 頁會自動生出這家的理由卡；之後可以換別家。`:`取消推薦「${c.name}」（理由卡會跟著收起來）。`,ov,'fine');
 el('div','',ov,'choices').append(btn(on?'確定，推薦這家':'確定取消',async()=>{try{const r=await api({action:'team_rep',direction:d,company:on?c.id:null});myReps={};for(const m of r.members||[]){if(m.student_id===session.student_id)myReps=m.reps||{};}toast(on?'推薦好了。到 Week 9 頁看理由卡。':'已取消。');showBag();}catch(e){toast(e.message);}},true),btn('先不要',showBag));}
const dirShort=d=>DIRECTIONS.find(x=>x.id===Number(d))?.name.split('｜')[0]||('方向'+d);
function needLogin(){say('teacher','Irene 老師','開箱要先登入。','沒登入的進度不會存，老師也看不到你開了哪一箱。逛島可以；開箱請先回首頁用學號和邀請碼進入，再回來。',[['回首頁登入',()=>{location.href='index.html';},true],['先逛島',renderBrowse,false],['回港口',renderHub,false]]);}
let current=null;const box=()=>store.boxes[current]||(store.boxes[current]=freshBox());
const company=()=>companyById(current);
let busy=false,mode='hub',timer,walkingToken=0;
// 我的方向：從建組資料來（team.js 存的 sjl-team-dir，沒有就讓學生點）
let myDir=Number(store.dir)||Number(localStorage.getItem('sjl-team-dir'))||0;
// 已有島圖的島；其他島先用島 6 的圖（之後每島一張）
// 美術素材（2026-11-11 接入）：每島一張島景、一位職人 NPC（店家）、一隻夥伴（Lv1 開箱、Lv2 探索站／找碴後）。
// 原檔在 materials/islands/_source（不進 repo），repo 放縮小版：scene 1200×675 jpg、npc ≤440×640 png、pet ≤320 png。
const ART='materials/islands/';const pad2=id=>String(id).padStart(2,'0');
const sceneSrc=id=>`${ART}scene_island${pad2(id)}.jpg`;const npcSrc=id=>`${ART}npc_island${pad2(id)}.png`;const petSrc=(id,lv)=>`${ART}pet_island${pad2(id)}_lv${lv===2?2:1}.png`;
function setPet(img,islandId,evolved){img.src=petSrc(islandId,evolved?2:1);img.closest('.pet-art')?.classList.add('real');}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const el=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;if(parent)parent.append(e);return e;};
function btn(text,fn,primary=false){const b=el('button',text,null,'ui'+(primary?' primary':''));b.type='button';b.disabled=busy;b.addEventListener('click',fn);return b;}
function show(view){for(const v of ['hub','find','island','browse'])$('#view-'+v).hidden=v!==view;mode=view;root.classList.toggle('port',view!=='island');refreshTop();}
function toast(t){clearTimeout(timer);const x=$('#toast');x.textContent=t;x.hidden=false;timer=setTimeout(()=>x.hidden=true,2400);}
function openedCount(){return Object.values(store.boxes).filter(b=>b.opened).length;}
function refreshTop(){
 const c=company(),b=current?box():null;
 const stage=!current?0:!b.found?1:b.passed<3?(b.clues.length?3:2):!b.opened?4:5;
 root.querySelectorAll('#steps [data-step]').forEach(x=>{const n=Number(x.dataset.step);x.classList.toggle('active',n===Math.min(stage,4));x.classList.toggle('done',n<stage);});
 $('#journey-loc').innerHTML=c?`<b>${dirById(c.dir).name.split('｜')[0]}</b>　${b.found?islandById(c.island).name+' › '+c.name:'線索卡 › 找島'}`:`<b>尋寶</b>　先選一個寶藏`;
 $('#box-score').textContent=(b?boxScore(b.scores):0)+'/30';$('#opened-count').textContent=openedCount();$('#bag-count').textContent=openedCount();
 const lv2=COMPANIES.filter(x=>store.boxes[x.id]?.opened&&store.boxes[x.id]?.deep).length;$('#pet-count').textContent=openedCount()+(lv2?'（Lv.2 ×'+lv2+'）':'');const repN=Object.keys(myReps||{}).length;$('#rep-count').textContent=myDirs.length?repN+'/'+myDirs.length:String(repN);
 setSync(syncState);
}
// 下一箱：先候選、再自己方向、再任何做好的箱
function nextBox(){const ready=COMPANIES.filter(c=>c.ready!==false&&!store.boxes[c.id]?.opened);const cands=store.candidates.map(companyById).filter(Boolean);return cands.find(c=>ready.includes(c))||ready.find(c=>c.dir===myDir)||ready[0]||null;}
function goBox(c){if(!loggedIn()){needLogin();return;}current=c.id;if(box().found)enterIsland();else renderFind();}
// ---------- 視圖 1：寶箱清單 ----------
// ---------- 開場（第一次進來三張卡；港口「怎麼玩？」隨時再看） ----------
const INTRO=[
 ['你是新創探險者',`期末你們一組要上台講「一家值得認識的 AI 新創」。這座群島有 10 座島、15 家 2026 年的 AI 新創——都是真的公司、真的錢。你的任務：替組裡找出你那個方向最值得講的一家。`,'🧭'],
 ['怎麼玩（四步）',`① 選方向：三個方向，認一個（組裡三個人各認一個）。
② 逛島、圈候選：到你方向的島看看住哪些公司，圈 2 家。
③ 開箱：一箱＝一家公司。讀線索找到島 → 聽店家講故事 → Irene 幫你整理 → 答三題 → 寶箱開。
④ 推薦給組：開完的公司裡挑最喜歡的一家「推薦給我的組」，三個人湊 3 家，12/4 比一比選一家上台。`,'🗺️'],
 ['你會得到什麼',`每開一箱：一張七格公司卡（誰付錢、怎麼收費、取代誰、為什麼是現在、數字、風險、台灣同層）——期末直接用。
一隻夥伴（做探索站或找碴會升級 Lv.2）。
分數只是紀錄，不算成績；答錯不扣，第三次直接給提示。任何島都能開，多開多理解。`,'✦'],
];
function showIntro(onDone){let i=0;const render=()=>{closeOverlay();const ov=overlay('怎麼玩？（'+(i+1)+'／'+INTRO.length+'）');const [t,body,icon]=INTRO[i];const card=el('div','',ov,'intro-card');el('div',icon,card,'intro-icon');el('h3',t,card);const p=el('p','',card,'intro-body');p.textContent=body;
  const dots=el('div','',card,'intro-dots');INTRO.forEach((_,k)=>{const d=el('i','',dots);if(k===i)d.className='on';});
  const row=el('div','',ov,'choices');if(i>0)row.append(btn('上一張',()=>{i--;render();}));
  row.append(btn(i<INTRO.length-1?'下一張 →':'開始尋寶 →',()=>{if(i<INTRO.length-1){i++;render();}else{store.intro_seen=true;save();closeOverlay();if(onDone)onDone();}},true));
  if(i<INTRO.length-1)row.append(btn('跳過',()=>{store.intro_seen=true;save();closeOverlay();if(onDone)onDone();}));};render();}
function renderHub(){
 show('hub');current=null;refreshTop();closeOverlay();
 if(!store.intro_seen){showIntro(renderHub);}
 $('#chapter-small').textContent='HARBOR · 群島港口';$('#chapter-title').textContent='AI 新創群島';$('#mission').textContent='已開寶箱 '+openedCount();
 put(person(),[30,72]);put(teacher(),[60,60]);
 const ready=COMPANIES.filter(c=>c.ready!==false);
 const cands=store.candidates.map(companyById).filter(Boolean);
 const next=cands.find(c=>c.ready!==false&&!store.boxes[c.id]?.opened)||ready.find(c=>!store.boxes[c.id]?.opened&&(!myDir||c.dir===myDir))||ready.find(c=>!store.boxes[c.id]?.opened)||ready[0];
 if(!myDir){
  say('teacher','Irene 老師 · 港口','先告訴我：你在組裡認的是哪個方向？','之後我會優先帶你去你方向的島。還沒建組也沒關係，先選一個，之後可以改。'+(store.intro_seen?'':'\n（右上角「怎麼玩？」隨時可以再看一次說明。）'),
   DIRECTIONS.map(d=>[d.name,()=>{myDir=d.id;store.dir=d.id;save();renderHub();},false]));
 }else{
  const candLine=cands.length?`\n你的候選（${cands.length}／${CAND_MAX}）：${cands.map(c=>c.name).join('、')}。`:'\n你還沒圈候選：先去「逛島」，在自己方向圈 2 家，再開箱。';
  say('teacher','Irene 老師 · 港口','怎麼玩：先逛島圈候選，再開箱。','① 逛島：到你方向那一區看看每座島住哪些公司，圈 2 家候選。\n② 開箱：一箱＝一家公司，讀線索找島、聽故事、答三題，開箱拿七格卡。\n③ 開完挑 1 家「推薦給我的組」；三個人湊 3 家，12/4 比一比，期末講 1 家。'+candLine,
   [['逛島、圈候選 →',renderBrowse,!cands.length],...(next?[[store.boxes[next.id]?.found?'繼續：'+next.name:'開箱：'+(cands.includes(next)?next.name:'第 '+(COMPANIES.indexOf(next)+1)+' 箱'),()=>goBox(next),!!cands.length]]:[]),
    ['換方向',()=>{myDir=0;store.dir=0;save();renderHub();},false]]);
 }
 $('#dir-tabs').hidden=true;
 const list=$('#treasures');list.replaceChildren();
 const section=(title,items,hidden)=>{
  if(!items.length)return;
  const h=el('h3',title,list,'t-section');if(hidden)h.classList.add('collapsed');
  const wrap=el('div','',list,'t-wrap');if(hidden){wrap.hidden=true;h.style.cursor='pointer';h.addEventListener('click',()=>{wrap.hidden=!wrap.hidden;h.classList.toggle('collapsed',wrap.hidden);});}
  for(const c of items){
   const b=store.boxes[c.id];const ready=c.ready!==false;const no=COMPANIES.indexOf(c)+1;
   const card=el('div','',wrap,'treasure'+(b?.opened?' opened':'')+(ready?'':' locked'));
   const head=el('div','',card,'t-head');el('b',(b?.opened?c.name:'第 '+no+' 箱')+(c.demo?'（示範）':''),head);
   el('span',b?.opened?'已開箱 '+boxScore(b.scores)+'/30'+bonus(b):ready?(b?.found?'研究中':'可以玩'):'準備中',head,'badge'+(b?.opened?' gold':ready?' go':''));
   const ul=el('ul','',card,'clue-list');for(const k of c.clues)el('li',k,ul);
   const foot=el('div','',card,'t-foot');el('small',islandById(c.island)?dirById(c.dir).short:'',foot);
   const go=btn(b?.opened?'再看這一箱':b?.found?'回到島上':'出發找島 →',()=>goBox(c),!b?.opened);go.disabled=!ready;foot.append(go);
  }
 };
 // 先列可以玩的；準備中的按三個方向分段收起
 // 先列候選；再列做好的箱（少於 4 箱不分段）。準備中且非候選的不顯示。
 if(cands.length)section('你的候選（'+cands.length+'／'+CAND_MAX+'）',cands,false);
 const open=COMPANIES.filter(c=>c.ready!==false&&!cands.includes(c));
 if(open.length<4)section('可以玩的寶箱（'+open.length+'）',open,false);
 else for(const d of DIRECTIONS){const items=open.filter(c=>c.dir===d.id);section(d.name+'（'+items.length+' 箱）',items,false);}
}
// ---------- 逛島、圈候選 ----------
function renderBrowse(){
 show('browse');current=null;refreshTop();closeOverlay();
 $('#chapter-small').textContent='SEA CHART · 海圖';$('#chapter-title').textContent='逛島';$('#mission').textContent=`候選 ${store.candidates.length}／${CAND_MAX}`;
 put(person(),[30,72]);put(teacher(),[60,60]);
 const d=dirById(myDir);
 say('teacher','Irene 老師 · 海圖','逛島：看每座島住哪些公司，圈 2 家候選。',`你的方向是${d.name}。候選只能圈自己方向的公司（別的方向可以看、可以開箱，但不算組的分工）。點一座島上去看看。`,[['回港口',renderHub,false]]);
 const map=$('#browse-map');map.replaceChildren();
 for(const dd of DIRECTIONS){
  const r=el('div','',map,'region'+(dd.id===myDir?' mine':''));el('b',dd.name,r);el('h3',dd.short+'：'+dd.blurb,r);
  for(const i of ISLANDS.filter(x=>x.dir===dd.id)){
   const cs=COMPANIES.filter(c=>c.island===i.id);
   const ib=el('button','',r,'island-btn');ib.type='button';ib.append(i.name+'　');const sm=el('small','',ib);sm.textContent=cs.length?cs.map(c=>store.candidates.includes(c.id)?'☆ '+c.name:c.name).join('・'):i.hint;
   if(!cs.length)ib.disabled=true;
   ib.addEventListener('click',()=>browseIsland(i.id));
  }
 }
}
function browseIsland(id){
 const i=islandById(id),cs=COMPANIES.filter(c=>c.island===id);
 $('#chapter-small').textContent='CHAPTER '+String(id).padStart(2,'0');$('#chapter-title').textContent=i.name.replace(/^島 \d+ /,'');
 $('#scenery').src=sceneSrc(id);$('#owner-art').src=npcSrc(id);$('#owner-art').alt=i.name+'的店家';
 $('#mission').textContent=`候選 ${store.candidates.length}／${CAND_MAX}`;
 const d=dirById(i.dir),mine=i.dir===myDir;
 say('teacher','Irene 老師 · 島長介紹',i.name+'：'+i.hint,`這座島屬於${d.name}（${d.short}：${d.blurb}）。島上 ${cs.length} 家公司如下${mine?'，是你的方向，可以圈候選。':'，不是你的方向：可以看、可以開箱，但不能圈候選。'}`,[['回海圖',renderBrowse,false],['回港口',renderHub,false]]);
 const ov=overlay(i.name+' 的公司');
 for(const c of cs){
  const b=store.boxes[c.id];const card=el('article','',ov,'treasure'+(b?.opened?' opened':'')+(c.ready===false?' locked':''));card.style.marginBottom='10px';
  const head=el('div','',card,'t-head');el('b',c.name+(c.demo?'（示範）':''),head);el('span',c.ready===false?'材料準備中':b?.opened?'已開箱':'可以開箱',head,'badge'+(c.ready===false?'':' go'));
  el('p',c.tagline,card,'fine').style.padding='0';
  const ul=el('ul','',card,'clue-list');for(const k of c.clues)el('li',k,ul);
  const row=el('div','',card,'t-foot');
  const isC=store.candidates.includes(c.id);
  const star=btn(isC?'★ 已是候選（取消）':'☆ 設為候選',()=>{
   if(isC){store.candidates=store.candidates.filter(x=>x!==c.id);}
   else{if(!mine){toast('候選只能圈自己方向的公司。');return;}if(store.candidates.length>=CAND_MAX){toast(`最多 ${CAND_MAX} 家，先取消一家。`);return;}store.candidates.push(c.id);}
   save();browseIsland(id);},isC);
  if(!mine&&!isC)star.disabled=true;
  row.append(star);
  if(c.ready!==false){row.append(btn(b?.opened?'再看這一箱':'開這一箱 →',()=>goBox(c)));}
 }
 el('div','',ov,'choices').append(btn('回海圖',renderBrowse),btn('回港口，開始開箱',renderHub,true));
 refreshTop();
}
// ---------- 視圖 2：找島 ----------
function renderFind(){
 show('find');const c=company(),b=box();refreshTop();closeOverlay();
 $('#chapter-small').textContent='SEA CHART · 海圖';$('#chapter-title').textContent='找島';$('#mission').textContent='線索卡';
 say('teacher','Irene 老師 · 海圖','這家公司在哪座島？','讀三句線索，想它賣什麼、賣給誰，點一座島。猜錯不扣分，我會提示。');
 const ul=$('#find-clues');ul.replaceChildren();for(const k of c.clues)el('li',k,ul);
 $('#find-hint').textContent=b.hints>=2?'（二選一）我把範圍縮到亮框的兩座島了。':b.hints===1?c.islandHints[0]:'這家公司在哪座島？想想它賣什麼、賣給誰。點一座島。';
 const map=$('#find-map');map.replaceChildren();
 const candidates=b.hints>=2?[c.island,ISLANDS.filter(i=>i.dir===c.dir&&i.id!==c.island)[0]?.id].filter(Boolean):[];
 for(const d of DIRECTIONS){
  const r=el('div','',map,'region'+(d.id===myDir?' mine':''));el('b',d.name,r);el('h3',d.short+'：'+d.blurb,r);
  for(const i of ISLANDS.filter(x=>x.dir===d.id)){
   const ib=el('button','',r,'island-btn'+(b.wrong.includes(i.id)?' wrong':'')+(candidates.includes(i.id)?' candidate':''));ib.type='button';
   ib.append(i.name);el('small',i.hint,ib);
   if(i.id===10){ib.disabled=true;}
   ib.addEventListener('click',()=>pickIsland(i.id));
  }
 }
}
function pickIsland(id){
 const c=company(),b=box();
 if(id===c.island){b.found=true;b.at=b.at||new Date().toISOString();save();toast('找到了：'+islandById(id).name);enterIsland(true);return;}
 if(!b.wrong.includes(id))b.wrong.push(id);
 b.hints=Math.min(2,b.hints+1);save();
 $('#find-hint').textContent=(b.hints===1?'不在這座島。'+c.islandHints[0]:'還不是。'+c.islandHints[1]+' 我把範圍縮到亮框的兩座島。');
 renderFind();$('#find-hint').textContent=(b.hints===1?'不在這座島。'+c.islandHints[0]:'還不是。'+c.islandHints[1]+' 我把範圍縮到亮框的兩座島。');
}
// ---------- 視圖 3：島上 ----------
const points={start:[11,84],bridge:[22,76],landing:[35,66],hub:[52,63],shop:[43,49],station:[59,43],house:[79,58],teacher:[73,57],chest:[49,68]};
const links=[['start','bridge'],['bridge','landing'],['landing','hub'],['landing','shop'],['hub','station'],['hub','house'],['hub','teacher'],['hub','chest']];
let location='start';
const person=()=>$('#player'),teacher=()=>$('#npc-teacher');
function put(e,p){e.style.left=p[0]+'%';e.style.top=p[1]+'%';}
function route(to){const q=[[location]],seen=new Set([location]);while(q.length){const p=q.shift(),last=p[p.length-1];if(last===to)return p;for(const [a,b2] of links){const n=a===last?b2:b2===last?a:null;if(n&&!seen.has(n)){seen.add(n);q.push([...p,n]);}}}return [location,to];}
function animate(e,a,b2,dur){return new Promise(res=>{if(reduced()){put(e,b2);res();return;}const s=performance.now(),tok=walkingToken;function f(t){if(tok!==walkingToken){res();return;}const k=Math.min(1,(t-s)/dur);put(e,[a[0]+(b2[0]-a[0])*k,a[1]+(b2[1]-a[1])*k]);if(k<1)requestAnimationFrame(f);else res();}requestAnimationFrame(f);});}
function say(role,name,title,body,actions=[]){root.dataset.speaker=role;$('#role-chip').textContent={student:'探索筆記',owner:'店家故事',teacher:'Irene 老師',robot:'AI 探索站'}[role];$('#portrait').className='sprite '+role;const pi=$('#portrait-img');const useArt=role==='owner'&&current;if(useArt){pi.src=npcSrc(company().island);pi.alt=name;}pi.hidden=!useArt;$('#portrait').hidden=!!useArt;$('#speaker').textContent=name;$('#d-title').textContent=title;$('#d-speech').textContent=body;$('#choices').replaceChildren(...actions.map(a=>btn(...a)));}
function refreshIsland(){
 const c=company(),b=box();
 $('#chapter-small').textContent='CHAPTER '+String(c.island).padStart(2,'0')+' · '+islandById(c.island).name.replace(/^島 \d+ /,'');$('#chapter-title').textContent=c.name;
 $('#scenery').src=sceneSrc(c.island);$('#owner-art').src=npcSrc(c.island);$('#owner-art').alt=c.story.speaker;
 root.querySelectorAll('[data-clue]').forEach(x=>x.classList.toggle('done',b.clues.includes(x.dataset.clue)));
 root.querySelectorAll('[data-destination]').forEach(x=>{x.classList.toggle('visited',b.clues.includes(x.dataset.destination));x.disabled=busy;});
 ['#btn-quiz','#chest','#btn-reset'].forEach(id=>$(id).disabled=busy);
 $('#chest').classList.toggle('ready',b.passed===3&&!b.opened);$('#chest').classList.toggle('open',b.opened);
 $('#chest-label').textContent=b.opened?'已開箱':b.passed===3?'可以開箱！':'寶箱';
 $('#owner-marker').textContent=b.clues.includes('shop')?'✓':'!';$('#robot-marker').textContent=b.deep?'★':'?';
 $('#mission').textContent=b.opened?'已開箱 '+boxScore(b.scores)+'/30'+bonus(b):'三題 '+b.passed+'/3';
 $('#island-pet').hidden=!b.opened;$('#island-pet').classList.toggle('evolved',b.deep);setPet($('#island-pet img'),c.island,b.deep);$('#pet-name').textContent=c.pet.name+(b.deep?' · 研究員':'');
 refreshTop();
}
function enterIsland(fresh=false){
 show('island');const c=company(),b=box();closeOverlay();
 location='start';put(person(),points.start);put(teacher(),[85,52]);walkingToken++;busy=false;refreshIsland();
 if(b.opened){const n=nextBox();say('student','你 · 探索進度','這一箱已經開過了。','可以再看店家故事、公司卡，或開下一箱。',[...(n?[['開下一箱：'+n.name,()=>goBox(n),true]]:[]),['看公司卡與夥伴',showBag,!n],['回寶箱清單',renderHub,false]]);}
 else if(b.passed===3)say('teacher','Irene 老師','三題都對了，去開寶箱。',estPending(c,b)?'也可以先做估價題（+'+EST_BONUS+'，選填）。':'',[['走到寶箱',openChest,true],...(estPending(c,b)?[['估價加分 +'+EST_BONUS,estimateForm,false]]:[])]);
 else say('student','你 · 新創探險者',fresh?'登島成功：'+islandById(c.island).name:'回到 '+c.name+' 島','先去店家聽故事，再到 Irene 研究屋整理；探索站是加分。三題都對才能開箱。',[['走過木橋，去店家',()=>visit('shop'),true],['直接找 Irene',()=>visit('house'),false]]);
}
async function walk(to,arrival){if(busy)return;closeOverlay();busy=true;refreshIsland();const path=route(to);const p=person();say('student','你 · 新創探險者','沿著石徑出發…','');p.classList.add('walking');for(let i=1;i<path.length;i++){const a=points[path[i-1]],b2=points[path[i]];p.querySelector('.sprite').style.scale=b2[0]<a[0]?'-1 1':'1 1';await animate(p,a,b2,Math.max(260,Math.min(650,Math.hypot(b2[0]-a[0],b2[1]-a[1])*24)));}p.classList.remove('walking');p.querySelector('.sprite').style.scale='1';location=to;busy=false;refreshIsland();arrival();}
function visit(id){walk(id,()=>{const b=box();if(!b.clues.includes(id))b.clues.push(id);save();refreshIsland();if(id==='shop')story();else if(id==='house')irene();else station();});}
function story(i=-1){const c=company(),s=c.story;const acts=s.lines.map((l,j)=>[l[0],()=>story(j),false]).concat([['去 Irene 研究屋',()=>visit('house'),true]]);
 if(i<0)say('owner',s.speaker,s.open,'先認識這家公司在做什麼；聽完再去 Irene 研究屋整理。',acts);else say('owner',s.speaker,s.lines[i][0],s.lines[i][1],acts);}
async function irene(){const c=company();if(busy)return;busy=true;refreshIsland();const t=teacher();t.classList.add('walking');await animate(t,[parseFloat(t.style.left)||85,parseFloat(t.style.top)||52],[73,57],450);t.classList.remove('walking');busy=false;refreshIsland();
 say('teacher','Irene 老師 · 研究屋','先整理，再答題。',c.irene.join('\n')+'\n三題各 10 分：第 1 次答對 10、第 2 次 7、之後 5。第三題要貼一個來源網址。',[['我準備好了，答三題',quiz,true],['先去 AI 探索站（加分）',()=>visit('station'),false],['再聽一次店家故事',()=>visit('shop'),false]]);}
const bonus=b=>b?.estOk?' +'+EST_BONUS:'';
const estPending=(c,b)=>!!c.estimate&&!b.est;
// ---------- 三題 ----------
function quiz(){const c=company(),b=box();if(busy)return;closeOverlay();if(!b.clues.includes('shop')&&!b.clues.includes('house')){say('teacher','Irene 老師','先聽店家故事，或到研究屋。','沒讀材料就答，猜對也不會懂。',[['去店家',()=>visit('shop'),true]]);return;}
 if(b.passed>=3){say('teacher','Irene 老師','三題都對了。','去開寶箱。',[['走到寶箱',openChest,true]]);return;}
 const n=b.passed,q=c.questions[n],tries=b.attempts[n];
 const ov=overlay(`第 ${n+1} 題／3 · 這次答對 ${scoreFor(tries+1)} 分`);
 el('h3',q.q,ov);
 const opts=el('div','',ov,'opts');let chosen=-1;
 q.opts.forEach((o,i)=>{const ob=el('button',String.fromCharCode(65+i)+'　'+o,opts,'opt');ob.type='button';ob.setAttribute('aria-pressed','false');ob.addEventListener('click',()=>{chosen=i;opts.querySelectorAll('.opt').forEach((x,j)=>x.setAttribute('aria-pressed',String(j===i)));});});
 let urlIn=null;
 if(q.needUrl){el('label','貼一個來源網址（證明你查過）',ov).htmlFor='q-url';urlIn=el('input','',ov);urlIn.type='url';urlIn.id='q-url';urlIn.placeholder='https://…';urlIn.value=b.url||'';
  const p=el('p','去哪找：',ov,'fine');p.style.padding='6px 0 0';const links=el('div','',ov,'src-links');for(const [t,u] of q.sources){const a=el('a',t,links,'ui');a.href=u;a.target='_blank';a.rel='noopener noreferrer';}}
 const err=el('p','',ov,'err');err.setAttribute('role','alert');
 const row=el('div','',ov,'choices');
 row.append(btn('送出答案',()=>{
  if(chosen<0){err.textContent='先選一個答案。';return;}
  if(q.needUrl&&!isUrl(urlIn.value)){err.textContent='第三題要貼一個以 http 開頭的網址（上面「去哪找」任一個都可以）。';urlIn.focus();return;}
  b.attempts[n]++;
  if(chosen!==q.answer){save();err.textContent='不對。Irene：'+q.hint+'（下次答對 '+scoreFor(b.attempts[n]+1)+' 分）';opts.querySelectorAll('.opt')[chosen].classList.add('wrong');return;}
  if(q.needUrl)b.url=urlIn.value.trim();
  b.scores[n]=scoreFor(b.attempts[n]);b.passed++;save();refreshIsland();closeOverlay();
  if(b.passed===3&&estPending(c,b))say('teacher','Irene 老師 · 第 3 題','答對，+'+b.scores[n]+' 分。三題全過！',q.why+'\n加碼：這家不公開價格，我擺兩個數字給你，你估一個區間，答對 +'+EST_BONUS+'（選填，不影響開箱）。',[['估價加分 +'+EST_BONUS,estimateForm,true],['直接開寶箱',openChest,false]]);
  else say('teacher','Irene 老師 · 第 '+(n+1)+' 題','答對，+'+b.scores[n]+' 分。',q.why,[[b.passed===3?'去開寶箱':'下一題',b.passed===3?openChest:quiz,true]]);
 },true),btn('Irene 提示',()=>{err.textContent='Irene：'+q.hint;}),btn('先回島上',closeOverlay));
}
// ---------- 估價題（選填加分） ----------
function estimateForm(){const c=company(),b=box(),e=c.estimate;if(!e||busy)return;closeOverlay();
 const ov=overlay('估價題 · 選填 +'+EST_BONUS+' 分');
 el('h3','這家不公開價格。'+e.unit+'，大概多少（美元）？',ov);
 const dl=el('dl','',ov,'facts');el('dt','它取代的人力',dl);el('dd',e.labor[0]+'：'+e.labor[1],dl);el('dt','原本的軟體',dl);el('dd',e.software[0]+'：'+e.software[1],dl);
 el('p','Irene：AI 公司收的錢，通常落在「原本軟體」和「取代的人力」之間——比軟體貴，比人便宜。',ov,'fine');
 const opts=el('div','',ov,'opts');let chosen=-1;
 e.ranges.forEach((o,i)=>{const ob=el('button',String.fromCharCode(65+i)+'　'+o,opts,'opt');ob.type='button';ob.setAttribute('aria-pressed','false');ob.addEventListener('click',()=>{chosen=i;opts.querySelectorAll('.opt').forEach((x,j)=>x.setAttribute('aria-pressed',String(j===i)));});});
 const err=el('p','',ov,'err');err.setAttribute('role','alert');
 const row=el('div','',ov,'choices');
 row.append(btn('送出估價',()=>{if(chosen<0){err.textContent='先選一個區間。';return;}
  b.est=e.ranges[chosen];b.estOk=e.answer.includes(chosen);save();refreshIsland();closeOverlay();
  const acts=[[b.opened?'看七格卡':'去開寶箱',b.opened?showReward:openChest,true]];
  if(b.estOk)say('teacher','Irene 老師 · 估價','估得準，+'+EST_BONUS+' 分。',e.why+'\n你的估價會填進七格卡「怎麼收費」。',acts);
  else say('teacher','Irene 老師 · 估價','這次沒對，但估價已經填進七格卡。',e.why,acts);},true),btn('先不估，直接開箱',b.opened?showReward:openChest));
}
// ---------- 探索站 ----------
function station(){const c=company(),b=box();say('robot','小潮 · AI 探索站','想追問，還是想找碴？','挑一題複製到 Gemini／ChatGPT，回來寫一句你的理解（加分，夥伴升級）。或者扮演不想買的老闆，跟業務吵三回合。',
 c.deepQuestions.map(q=>[q,()=>deepForm(q),false]).concat([['我要找碴（扮老闆跟業務吵）',argueForm,false],['先去答三題',quiz,true]]));}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true;}catch{const ta=document.createElement('textarea');ta.value=t;document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;}}
function aiBox(ov,prompt,backFn){const ta=el('textarea',null,ov);ta.value=prompt;ta.rows=5;ta.readOnly=true;ta.setAttribute('aria-label','帶去問 AI 的問題');
 const row=el('div','',ov,'choices');const st=el('p','',ov,'fine');st.setAttribute('role','status');
 row.append(btn('複製，開 Gemini',async()=>{const ok=await copyText(ta.value);window.open('https://gemini.google.com/app','_blank','noopener');st.textContent=ok?'已複製。Gemini 開起來是空的是正常的：在輸入框按 ⌘V（Windows：Ctrl+V）送出，聊完回來填下面。':'這個瀏覽器不讓網頁複製：請在上面框全選（⌘A）再複製。';},true));
 const g=el('a','開 ChatGPT',row,'ui');g.href='https://chatgpt.com/';g.target='_blank';g.rel='noopener noreferrer';
 return st;}
function deepForm(q){const c=company(),b=box();const ov=overlay('AI 深問');el('h3',q,ov);aiBox(ov,c.deepPrompt(q));
 el('label','回來寫：我多理解了什麼？（一句話就好，至少 8 字）',ov).htmlFor='deep-insight';const ta=el('textarea',null,ov);ta.id='deep-insight';ta.value=b.insight||'';ta.rows=3;ta.maxLength=600;
 const err=el('p','',ov,'err');const row=el('div','',ov,'choices');
 row.append(btn(b.deep?'更新筆記':'提交，夥伴升級',()=>{if(ta.value.trim().length<8){err.textContent='再多寫一點（至少 8 字），用自己的話就好。';return;}b.insight=ta.value.trim();const first=!b.deep;b.deep=true;save();refreshIsland();closeOverlay();if(first)confetti();say('robot','小潮 · 探索筆記',first?'探索完成！夥伴升級到 Lv.2。':'筆記已更新。','筆記留給老師看；理解對不對，Irene 會在老師頁確認。',[['去答三題',quiz,true],['回島上',()=>enterIsland(),false]]);},true),btn('換一題',station),btn('回島上',closeOverlay));}
function argueForm(){const c=company(),b=box();const ov=overlay('我要找碴：你是不想買的老闆');el('p','Gemini 扮這家公司的業務，你扮不想花錢的老闆，吵三回合。回來只要貼一句：業務最站不住腳的話。',ov,'fine').style.padding='0 0 6px';aiBox(ov,c.argue);
 el('label','業務最站不住腳的一句（貼回來）',ov).htmlFor='argue-line';const ta=el('textarea',null,ov);ta.id='argue-line';ta.value=b.argue||'';ta.rows=2;ta.maxLength=400;
 const err=el('p','',ov,'err');const row=el('div','',ov,'choices');
 row.append(btn('存起來（夥伴升級）',()=>{if(ta.value.trim().length<6){err.textContent='貼一句（至少 6 字）。';return;}b.argue=ta.value.trim();const first=!b.deep;b.deep=true;save();refreshIsland();closeOverlay();if(first)confetti();say('robot','小潮 · 找碴紀錄','存好了。這一句就是期末「風險與反方」那一頁的材料。','',[['去答三題',quiz,true],['回島上',()=>enterIsland(),false]]);},true),btn('回島上',closeOverlay));}
// ---------- 開箱 ----------
function confetti(){if(reduced())return;const burst=el('div','',$('#scene'),'burst');for(let i=0;i<16;i++){const p=el('i','',burst);p.style.setProperty('--dx',(Math.cos(i/16*Math.PI*2)*95)+'px');p.style.setProperty('--dy',(Math.sin(i/16*Math.PI*2)*75-35)+'px');}setTimeout(()=>burst.remove(),1300);}
function openChest(){const b=box();if(busy)return;if(b.opened){showBag();return;}walk('chest',()=>{if(b.passed<3){say('teacher','Irene 老師','還差 '+(3-b.passed)+' 題。','三題都對，寶箱才會開。',[['去答題',quiz,true]]);return;}b.opened=true;b.at=new Date().toISOString();save();refreshIsland();confetti();const c=company();say('owner',c.story.speaker,'開箱！'+c.pet.name+'加入你的探索隊。','七格卡收進情報袋了，可以一鍵貼進公司卡。'+(b.deep?'探索也做完，夥伴已經 Lv.2。':'去探索站或找碴，牠會升級到 Lv.2（選填）。'),(()=>{const n=nextBox();return [['看七格卡',showReward,true],...(n?[['開下一箱：'+n.name,()=>goBox(n),false]]:[]),['回寶箱清單',renderHub,false]];})());showReward();});}
function showReward(){const c=company(),b=box();const ov=overlay('開箱！');
 const card=el('article','',ov,'reward-card');const h=el('div','',card,'reward-heading');el('span','✦',h,'reward-emblem');const t=el('div','',h);el('small','TREASURE · '+islandById(c.island).name,t);el('h3',c.name+'：'+c.tagline,t);
 const w=el('div','',card,'wow');el('span',c.wow.label,w,'fine').style.padding='0';el('b',c.wow.value,w);el('span',c.wow.note,w,'fine').style.padding='0';
 const dl=el('dl','',card,'facts');c.card.forEach(([k,v],i)=>{el('dt',k,dl);el('dd',v+(i===1&&b.est?'｜我的估價：'+b.est+(b.estOk?'（+'+EST_BONUS+'）':''):''),dl);});
 const pet=el('div','',card,'companion-card');pet.innerHTML=`<div class="pet-art real ${b.deep?'evolved':''}"><span class="pet-cape"></span><img src="${petSrc(c.island,b.deep?2:1)}" alt="${c.pet.name}"><span class="pet-star">✦</span></div><div><p class="eyebrow">夥伴</p><h3 style="font-size:16px">${c.pet.name} · ${c.pet.kind}${b.deep?' · 研究員':''}</h3><p class="fine" style="padding:0">${c.pet.desc}。${b.deep?'探索站做完，夥伴已升級到 Lv.2。':'做完探索站或找碴，牠會升級到 Lv.2。'}</p></div>`;
 const row=el('div','',card,'choices');const st=el('p','',card,'fine');st.style.padding='4px 0 0';
 const n=nextBox();row.append(btn('複製七格，貼進公司卡',async()=>{st.textContent=(await copyText(cardText(c,b.est)))?'已複製，到 Week 9 公司卡貼上。':'複製失敗，請手動選取。';}),...(estPending(c,b)?[btn('估價加分 +'+EST_BONUS,estimateForm)]:[]),...(n?[btn('開下一箱：'+n.name,()=>goBox(n),true)]:[]),btn('回寶箱清單',renderHub));
}
// ---------- 情報袋 ----------
function closeOverlay(){$('#overlay').hidden=true;$('#overlay').replaceChildren();}
function overlay(title){const o=$('#overlay');o.replaceChildren();o.hidden=false;const h=el('div','',o,'overlay-head');el('h2',title,h);h.append(btn('收起',closeOverlay));const sc=$('#scene');if(sc)sc.scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'});return o;}
function showBag(){const ov=overlay('情報袋：開過的寶箱');
 const opened=COMPANIES.filter(c=>store.boxes[c.id]?.opened);
 if(!opened.length)el('p','還沒開過寶箱。答對三題，公司的七格卡會收在這裡。',ov,'fine');
 for(const c of opened){const b=store.boxes[c.id];const a=el('article','',ov,'reward-card');a.style.margin='0 0 12px';const h=el('div','',a,'reward-heading');const pim=el('img','',h,'bag-pet');pim.src=petSrc(c.island,b.deep?2:1);pim.alt=c.pet.name+(b.deep?' Lv.2':' Lv.1');pim.title=c.pet.name+(b.deep?' · Lv.2':' · Lv.1');const t=el('div','',h);el('small',islandById(c.island).name+' · '+boxScore(b.scores)+'/30'+bonus(b)+(b.deep?' · 探索完成 · 夥伴 Lv.2':' · 夥伴 Lv.1'),t);el('h3',c.name,t);
  const dl=el('dl','',a,'facts');c.card.forEach(([k,v],i)=>{el('dt',k,dl);el('dd',v+(i===1&&b.est?'｜我的估價：'+b.est+(b.estOk?'（+'+EST_BONUS+'）':''):''),dl);});
  if(b.argue){el('dt','找碴',dl);el('dd','業務最站不住腳：'+b.argue,dl);}if(b.insight){el('dt','我的理解',dl);el('dd',b.insight,dl);}if(b.url){el('dt','我貼的來源',dl);el('dd',b.url,dl);}
  const row=el('div','',a,'choices');const st=el('span','',row,'fine');row.append(btn('複製七格',async()=>{st.textContent=(await copyText(cardText(c,b.est)))?'已複製':'複製失敗';}));
  // 設為我的代表：只有我認的方向、而且有組才會出現；同方向一次一家
  const d=islandById(c.island).dir;if(loggedIn()&&myTeamId&&myDirs.includes(d)){const isRep=myReps[d]===c.id;const rb=btn(isRep?'✓ 我推薦的（'+dirShort(d)+'）— 取消':'推薦給我的組（'+dirShort(d)+'）',()=>setRep(c,d,!isRep),!isRep&&!myReps[d]);rb.classList.add('rep-btn');if(isRep)rb.classList.add('is-rep');row.append(rb);if(!isRep&&myReps[d])el('span','這個方向你已推薦：'+(companyById(myReps[d])?.name||myReps[d])+'（可以換成這家）',row,'fine');}
  else if(loggedIn()&&!myTeamId)el('span','有組之後才能推薦給組（Week 9 頁建組）。',row,'fine');
  else if(loggedIn()&&!myDirs.includes(d))el('span','這家在'+dirShort(d)+'，不是你認的方向；可以學，推薦要選自己方向的。',row,'fine');}
 if(loggedIn()&&myTeamId&&myDirs.length){const done=myDirs.filter(d=>myReps[d]);el('p','我推薦給組的：'+(done.length?done.map(d=>dirShort(d)+'＝'+(companyById(myReps[d])?.name||'')).join('、'):'還沒推薦')+(myDirs.length>done.length?'（'+myDirs.filter(d=>!myReps[d]).map(dirShort).join('、')+' 還缺一家）':'　✓ 推薦好了，到 Week 9 頁看理由卡'),ov,'fine rep-summary');}
 el('div','',ov,'choices').append(btn('回寶箱清單',renderHub,true));
}
// ---------- 事件 ----------
root.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>visit(b.dataset.destination)));
$('#btn-quiz').addEventListener('click',quiz);$('#chest').addEventListener('click',openChest);$('#island-pet').addEventListener('click',showBag);
$('#btn-hub').addEventListener('click',renderHub);$('#btn-intro').addEventListener('click',()=>showIntro());$('#btn-bag').addEventListener('click',showBag);
$('#btn-reset').addEventListener('click',()=>{if(!current){toast('先選一個寶箱。');return;}const ov=overlay('重設這一箱？');el('p','會清掉這一箱的找島、三題、探索筆記（其他寶箱不動）。',ov,'fine');el('div','',ov,'choices').append(btn('確定重設',()=>{delete store.boxes[current];save();renderFind();},true),btn('保留',closeOverlay));});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlay();});
(async()=>{setSync('');await loadRemote();renderHub();})();
// 測試用：?debug=1 時把跳島函式掛到 window（截圖檢查按鈕對位）
if(new URLSearchParams(window.location.search).get('debug'))window.__sjl={goBox,companyById,enterIsland,say,store:()=>store,save};
