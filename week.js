const weeks=[
['課程說明與創業起點','影片〈Should You Start A Startup?〉帶你從真實問題、使用者與長期動機理解創業的起點。','完成個人起點卡','教材已提供',['理解：不需要先有 App、公司名稱或完整商業計畫。','觀察：記下未修飾的原句，以及誰、何時、在哪裡發生。','辨別：把可觀察的事實和仍待驗證的假設分開。','討論：我為什麼關心？原句是什麼？哪些是事實？哪些還不知道？','準備：留下一題下週要問使用者的問題。']],
['問題探索與選題','從多個生活問題中選擇一個值得深入研究的方向。','兩個候選痛點、一個暫定選題、三位受訪者與兩題訪談問題','教材已提供',['取回 Week 1：先完成起點卡，可修改並保留版本。','比較：填寫人物、情境、工作、阻礙、頻率、代價、替代方式、證據與假設。','選題：說明理由，以及什麼證據會讓你改變選擇。','修訂：先規則檢查，再選用 AI 或同儕回饋。AI 不是成績。','準備：確認三位可接觸受訪者與兩題非引導式問題，正式提交。']],
['使用者訪談','用問題理解別人的經驗，不是推銷你的答案。','三次真實訪談的紀錄卡：原話、代價、目前做法，以及訪談後的判斷','教材已提供',['取回 Week 2：看自己的三階燈與老師指路；還沒交的先補交。','準備單：痛點陳述、三位受訪者、兩題問題，印出來或存在手機裡。','怎麼問：問上一次發生什麼、後來怎麼辦；不問「你會不會用」。','紀錄：原話欄只寫對方說的話；你的想法另外寫。受訪者只用代稱。','判斷：三次記完後選成立／調整／換題，用受訪者的用詞改寫痛點陳述。']],
["從我的痛看產業：挑戰與機會", "把你的痛放到一條產業線上，用 Gemini 和 NotebookLM 找這一行真正的困難、誰在付錢，以及三個小團隊能切入的機會。", "產業研究筆記 v1：產業線、錢流、三個挑戰（附來源）、三個機會", "教材已提供：講義 PDF、簡報、研究筆記範本、課前影片", ["課堂兩題：上課日 13:00–17:00 內在 app 答完＝出席。", "選一條產業線：app 依你的痛排出最相關的兩條，也可以自己填；存進資料庫。", "卡 1 問 AI：這一行誰付錢給誰、業者最常說的困難、現在怎麼撐（Gemini／GPT 皆可）。", "卡 2 NotebookLM 查證：加 5–8 個來源，問六題，每一點要有引用。", "卡 3 要三個機會：帶著證據請 AI 給三個小團隊能切入的機會，各寫第一個付錢的人、為什麼是現在。"]],
["三個機會比一比，選最值得創業的一個", "用五問計分、讓 AI 反方拒絕三回合，寫一頁「為什麼這是好的商業痛點」。", "產業研究筆記 v2：五問分數、反方紀錄、選定的一個與理由（＝期中 PDF）", "教材已提供：課前影片、講義 PDF、簡報、研究筆記 v2 範本", ["課堂兩題。", "五問各打 0／1／2：有人在為它花錢嗎、多久一次損失多少、為什麼是現在、為什麼還沒被解好、小團隊進得去嗎。", "最高分的交給 AI 反方（撐了十年不想花錢的老闆）拒絕三回合，你逐一回應。", "寫「為什麼選它」：照五問順序，一段一個證據一個出處，最後一段寫反方與你的回應。", "這一頁加 Week 4 筆記就是期中報告；11/13 上課前上傳 TronClass。"]],
["AI 新創地圖（老師講，11/6 後半場）", "跟 Week 5 同一天：錢往哪流、4 大區 10 座島、世界模型、你的產業線在島 6 的對照組。", "課後把今天的例子對回自己的產業線", "教材已提供：課前影片、講義 PDF、AI 新創地圖簡報（PDF／PPT）", ["課堂兩題（Week 6 頁；跟 Week 5 頁的兩題分開算出席）。", "AI 原生服務公司：賣做完的工作，不賣軟體；搶的是人力與外包預算。", "agent 經濟的基礎設施：身分、協定、信任與付款。", "走進實體世界的 AI：機器人、感測、現場服務；台灣的供應鏈位置。", "課後：今天哪一個例子最接近你的產業？它搶的是誰的預算？補進期中報告。"]],
["期中：個人報告＋建組", "交兩件事：研究筆記 v2 的 PDF（11/13 13:00 前交到 TronClass），和課堂上 2 分鐘口頭報告（11/13 13:00–17:00，依學號順序）；同一天建下半學期的組。", "研究筆記 v2 PDF＋2 分鐘上台＋組卡（組名、組碼、組的產業、三個方向各由誰負責）", "期中說明已提供：PDF 九段格式、2 分鐘四段、老師看什麼；建組登記在本頁最下面（已開放）", ["到 Week 5 比較頁最下面：按「研究筆記 v2 草稿」排好 PDF 底稿，改成自己的句子、補來源。", "同一處按「2 分鐘口頭報告講稿」：四段、約 450 字，唸一遍計時。", "11/13 13:00 前把 PDF 交到 TronClass。", "11/13 13:00–17:00 課堂上依學號順序上台 2 分鐘。", "AI 回饋不是成績；看的是你的證據和判斷。", "建組（本頁最下面）：組長建組拿四碼組碼、組員輸入加入；3 人為主、最少 2；組的產業從組員 Week 4 的產業裡挑一條；三個方向（Agent 基礎設施／AI 原生服務／實體世界 AI）一人認一個。現在就可以登記，11/27 13:00 鎖定；還沒找到組按「想請老師分組」。"]],
["AI agent 工具更新（講師講座）", "講師講 AI Agent 的三個方向：基礎設施、AI 原生服務、實體世界；下課前各組對照講座，確認自己組的產業線與認領的方向。", "課堂兩題；組卡確認（產業線、三個方向）", "教材已提供：講義 PDF、教學簡報（PDF／PPT）；課堂兩題頁已開；群島尋寶 11/20 開放", ["課堂兩題（講師的選擇題＋一句理由）：11/20 13:00–17:00 內存檔＝出席。", "還沒有組的人：到 Week 7 期中報告頁最下面建組或加入（11/27 13:00 鎖定）。", "講座後 20 分鐘：進「AI 新創群島」，選你認的方向，逛島、圈 2 家候選。", "作業（11/27 前）：在家開完 2 箱——讀線索找島、聽故事、答三題，拿到兩家公司的七格卡。約 20–30 分鐘。"]],
["公司卡 v1：從開過的寶箱選一家當代表", "老師講「怎麼看一家 AI 新創」——誰付錢／怎麼收費／取代誰，直接用你們開箱拿到的七格卡當例子。然後每人從開過的 2 箱裡選 1 家按「設為我的代表」，公司卡 v1 自動生成，課堂上補 2 個來源；組內先看三家。", "公司卡 v1（代表公司：七格＋2 個來源）", "教材準備中：三把尺講義、公司卡頁", ["課堂兩題。", "上課前要開完 2 箱（11/20 的作業）；沒開完的先開。", "每人在情報袋按「設為我的代表」→ 公司卡 v1 自動生成。", "補 2 個來源：官網定價頁＋一篇新聞，貼網址。", "組內三個方向各一家，先互相看一眼，下週比。"]],
["三家比一比、選一家、拿到期末框架", "老師講「怎麼判斷一家新創好不好」（五問公司版＋反方）；組內把三個方向各一家候選用五問比一比、選一家上台；發統一框架：PPT 6 頁、講稿、PDF 五段。", "比較表＋選定一家；PPT 初稿", "教材準備中：五問公司版、比較頁（組）、PPT／講稿範本", ["課堂兩題。", "每人帶自己方向的候選公司（公司卡 v1 寫最完整的那家）。", "五問各 0／1／2：市場痛多強、付費頻率與金額、為什麼是現在、為什麼別人沒做好、小公司怎麼打進去。", "AI 反方三回合：對選定那家最狠的一刀。", "期末框架：6 頁每人至少講 2 頁；第 4 頁固定「為什麼不是另外兩家」。"]],
["預演", "每組上台 6 分鐘＋老師講評 3 分鐘；課後照講評修 PPT 與講稿。", "PPT、講稿修訂版", "教材準備中：預演順序、講評表", ["課堂兩題。", "依組號上台 6 分鐘，照正式分工講。", "老師講評三件事：誰付錢講清楚了嗎、為什麼不是另外兩家站不站得住、反方那頁有沒有老實講。", "課後修：每頁 60 秒、每頁一個數字。"]],
["期末：小組報告", "上台 6 分鐘＋繳 PDF：三家公司卡（各人寫自己方向那家）＋三家比較表＋選定那家為什麼是好新創。", "小組研究報告 PDF（12/18 13:00 前交到 TronClass）＋PPT", "教材準備中", ["12/18 13:00 前由組長把 PDF 交到 TronClass。", "每組 6 分鐘、6 頁、每人至少講 2 頁。", "評分：個人分＝自己那張公司卡（七格有幾格有來源）；組分＝比較與選定那家的論證＋上台。", "AI 回饋不是成績。", "期中＋期末兩份 PDF 就是你的作品集。"]],
];
const highlights=[['Should You Start A Startup?','創業從理解問題開始。第一週的任務是提出好問題，不是提出好解法。'],['How to Get and Evaluate Startup Ideas','選題時看具體使用者、反覆出現的困擾與可接觸的證據。'],['How To Talk To Users','用問題理解使用者的經驗，不要用問題推銷你的答案。'],["課前影片：這週要教什麼——從我的痛看產業（18 分鐘，可 1.25 倍速）","學長先把八段講一遍：個人痛怎麼變產業痛、九條線怎麼選、兩個以上來源才算、Gemini 跟 NotebookLM 各做什麼。看完做影片下的三題。"],["課前影片：Week 5 課前預習：這週要做什麼（13 分半）","六段：為什麼要比、五問各問什麼、0 分和 2 分的差別、故意找 AI 反駁、可以選非最高分、一頁六段與期中。看完做影片下的三題，進教室直接打分。"],["課前影片：Week 6 課前預習：AI 新創地圖（9 分半）","六段：AI 拿走多少錢、錢先流到最底層、發電廠／引擎／零件／汽車、4 大區 10 座島、世界模型、你的產業線在島 6 的對照組。這週沒有影片題目。"],["本週沒有課前影片","期中報告週。"],["本週沒有課前影片","老師講課＋建組。"],["課前影片：三個方向各 3 分鐘（準備中）","agent 基礎設施／AI 原生服務／實體世界 AI 各是什麼、怎麼認出來。"],["本週沒有課前影片","工作坊。"],["本週沒有課前影片","比較與預演。"],["本週沒有課前影片","期末報告週。"]];
const n=Math.min(12,Math.max(1,Number(new URLSearchParams(location.search).get('week'))||1)); const w=weeks[n-1];
document.title=`Startup Journey Lab｜Week ${n}`;const h=highlights[n-1];document.querySelector('#video-title').textContent=h[0];document.querySelector('#video-takeaway').textContent=h[1];document.querySelector('#week-number').textContent=`WEEK ${String(n).padStart(2,'0')}`;document.querySelector('#week-title').textContent=w[0];document.querySelector('#week-summary').textContent=w[1];document.querySelector('#week-output').textContent=`本週提交：${w[2]}`;document.querySelector('#week-status').textContent=w[3];document.querySelector('#week-steps').innerHTML=w[4].map(x=>`<li>${x}</li>`).join('');document.querySelector('#week-one').hidden=n!==1;


// 每一週頁的上方都有「學號 · 離開」：共用電腦或換裝置時才找得到登出（原本只有首頁起點卡有）。
(function(){
 let s=null;try{s=JSON.parse(localStorage.getItem('sjl-student-session')||'null');}catch{}
 const nav=document.querySelector('.topbar nav');if(!s||!s.student_id||!nav)return;
 const who=document.createElement('span');who.className='topbar-who';who.textContent=`學號 ${s.student_id}`;
 const out=document.createElement('button');out.type='button';out.className='quiet';out.textContent='離開';out.title='登出這台裝置；資料都在雲端，下次用學號和邀請碼再進來';
 out.addEventListener('click',()=>{localStorage.removeItem('sjl-student-session');location.href='index.html#student';});
 who.append(out);nav.append(who);
})();

// 每一週頁上下各一組「← 上一週 ／ 下一週 →」：學生要回看前幾週的卡就按這個，不在同一頁堆好幾週。
(function(){
 const main=document.querySelector('main');if(!main)return;
 const hash=location.hash==='#card'||/^#week-/.test(location.hash)?'#card':'';
 const make=()=>{
  const nav=document.createElement('nav');nav.className='week-pager';nav.setAttribute('aria-label','上一週與下一週');
  if(n>1){const a=document.createElement('a');a.href=`week.html?week=${n-1}${hash}`;a.className='button-link';a.textContent=`← Week ${n-1}：${weeks[n-2][0]}`;nav.append(a);}
  const span=document.createElement('span');span.textContent=`Week ${n} / ${weeks.length}`;nav.append(span);
  if(n<weeks.length){const a=document.createElement('a');a.href=`week.html?week=${n+1}${hash}`;a.className='button-link';a.textContent=`Week ${n+1}：${weeks[n][0]} →`;nav.append(a);}
  return nav;
 };
 main.prepend(make());main.append(make());
})();

document.querySelector("#week-two-materials").hidden=n!==2;
document.querySelector("#week-three-materials").hidden=n!==3;
const w4m=document.querySelector("#week-four-materials"); if(w4m) w4m.hidden=n!==4;
const w5m=document.querySelector("#week-five-materials"); if(w5m) w5m.hidden=n!==5;
const w6m=document.querySelector("#week-six-materials"); if(w6m) w6m.hidden=n!==6;
const w7m=document.querySelector("#week-seven-materials"); if(w7m) w7m.hidden=n!==7;
const w8m=document.querySelector("#week-eight-materials"); if(w8m) w8m.hidden=n!==8;
// Week 6（11/5 起）有自己的課堂兩題頁（classq.js），跟 Week 2–5 一樣走下面的「學習藍圖／作答頁」切換。

// Switch views without rebuilding the form: unsaved answers remain in memory.
if(n===2||n===3||n===4||n===5||n===6||n===8){
 const ids={2:['#week-two-navigation','#week-two-materials','#week-two'],3:['#week-three-navigation','#week-three-materials','#week-three'],4:['#week-four-navigation','#week-four-materials','#week-four'],5:['#week-five-navigation','#week-five-materials','#week-five'],6:['#week-six-navigation','#week-six-materials','#week-six'],8:['#week-eight-navigation','#week-eight-materials','#week-eight']}[n];
 const navigation=document.querySelector(ids[0]);
 const materials=document.querySelector(ids[1]);
 const cardSection=document.querySelector(ids[2]);
 navigation.hidden=false;
 // 課前預習（影片＋三題）搬到標題和一句摘要的正下方、影片放最前面，學生一進頁就看到；有影片時「本週影片重點」那塊（內容重複）藏起來。等 module 把三題掛進 .preclass 之後再搬（DOMContentLoaded 在 module 之後）。
 // 影片 iframe 等到學習藍圖真的顯示時才載入（搬動 iframe 會重新載入；卡片頁也不用先載影片）。
 const pre=materials.querySelector('.preclass');
 if(pre){pre.querySelectorAll('iframe[src]').forEach(f=>{f.dataset.src=f.getAttribute('src');f.removeAttribute('src');});}
 let moved=false;
 document.addEventListener('DOMContentLoaded',()=>{
  const lead=document.querySelector('#week-blueprint .lead'),vh=document.querySelector('#week-blueprint .video-highlight');
  if(pre&&lead){lead.after(pre);const vid=pre.querySelector('.preclass-video'),eb=pre.querySelector('.eyebrow');if(vid&&eb)eb.after(vid);if(vid&&vh)vh.hidden=true;}
  moved=true;loadVideo();});
 function loadVideo(){if(!pre||!moved||document.querySelector('#week-blueprint').hidden)return;pre.querySelectorAll('iframe[data-src]').forEach(f=>{f.src=f.dataset.src;delete f.dataset.src;});}
 function showWeekView(){
  const cardView=['#card','#week-two','#week-three','#week-four','#week-five','#week-six','#week-eight'].includes(location.hash);
  document.querySelector('#week-blueprint').hidden=cardView;
  materials.hidden=cardView;
  cardSection.hidden=!cardView;
  if(!cardView)loadVideo();
  navigation.querySelectorAll('[data-week-view]').forEach(link=>{
   if(link.dataset.weekView===(cardView?'card':'learning'))link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  });
 }
 window.addEventListener('hashchange',showWeekView);
 showWeekView();
}
