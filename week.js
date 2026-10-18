const weeks=[
['課程說明與創業起點','影片〈Should You Start A Startup?〉帶你從真實問題、使用者與長期動機理解創業的起點。','完成個人起點卡','教材已提供',['理解：不需要先有 App、公司名稱或完整商業計畫。','觀察：記下未修飾的原句，以及誰、何時、在哪裡發生。','辨別：把可觀察的事實和仍待驗證的假設分開。','討論：我為什麼關心？原句是什麼？哪些是事實？哪些還不知道？','準備：留下一題下週要問使用者的問題。']],
['問題探索與選題','從多個生活問題中選擇一個值得深入研究的方向。','兩個候選痛點、一個暫定選題、三位受訪者與兩題訪談問題','教材已提供',['取回 Week 1：先完成起點卡，可修改並保留版本。','比較：填寫人物、情境、工作、阻礙、頻率、代價、替代方式、證據與假設。','選題：說明理由，以及什麼證據會讓你改變選擇。','修訂：先規則檢查，再選用 AI 或同儕回饋。AI 不是成績。','準備：確認三位可接觸受訪者與兩題非引導式問題，正式提交。']],
['使用者訪談','用問題理解別人的經驗，不是推銷你的答案。','三次真實訪談的紀錄卡：原話、代價、目前做法，以及訪談後的判斷','教材已提供',['取回 Week 2：看自己的三階燈與老師指路；還沒交的先補交。','準備單：痛點陳述、三位受訪者、兩題問題，印出來或存在手機裡。','怎麼問：問上一次發生什麼、後來怎麼辦；不問「你會不會用」。','紀錄：原話欄只寫對方說的話；你的想法另外寫。受訪者只用代稱。','判斷：三次記完後選成立／調整／換題，用受訪者的用詞改寫痛點陳述。']],
["從我的痛看產業：挑戰與機會", "把你的痛放到一條產業線上，用 Gemini 和 NotebookLM 找這一行真正的困難、誰在付錢，以及三個小團隊能切入的機會。", "產業研究筆記 v1：產業線、錢流、三個挑戰（附來源）、三個機會", "教材準備中", ["課堂兩題：上課日 13:30–18:00 內在 app 答完＝出席。", "選一條產業線：app 依你的痛排出最相關的兩條，也可以自己填；存進資料庫。", "卡 1 問 AI：這一行誰付錢給誰、業者最常說的困難、現在怎麼撐（Gemini／GPT 皆可）。", "卡 2 NotebookLM 查證：加 5–8 個來源，問六題，每一點要有引用。", "卡 3 要三個機會：帶著證據請 AI 給三個小團隊能切入的機會，各寫第一個付錢的人、為什麼是現在。"]],
["三個機會比一比，選最值得創業的一個", "用五問計分、讓 AI 反方拒絕三回合，寫一頁「為什麼這是好的商業痛點」。", "產業研究筆記 v2：五問分數、反方紀錄、選定的一個與理由", "教材準備中", ["課堂兩題。", "五問各打 0／1／2：有人在為它花錢嗎、多久一次損失多少、為什麼是現在、為什麼還沒被解好、小團隊進得去嗎。", "最高分的交給 AI 反方（撐了十年不想花錢的老闆）拒絕三回合，你逐一回應。", "寫「為什麼選它」：照五問順序，一段一個證據一個出處，最後一段寫反方與你的回應。", "這一頁加 Week 4 筆記就是期中報告；11/13 上課前上傳 PDF。"]],
["AI 新創現況（老師講）", "現在誰在做什麼、錢往哪流、台灣在哪裡：三個方向的現況、例子與風險。", "課堂兩題；課後把今天的例子對回自己的題目", "教材準備中", ["課堂兩題。", "AI 原生服務公司：賣做完的工作，不賣軟體；搶的是人力與外包預算。", "agent 經濟的基礎設施：身分、協定、信任與付款。", "走進實體世界的 AI：機器人、感測、現場服務；台灣的供應鏈位置。", "課後：今天哪一個例子最接近你的產業？它搶的是誰的預算？補進期中報告。"]],
["期中：個人報告", "上台＋繳 PDF。順序：產業一句話、錢流、三個挑戰與來源、三個機會、五問比較、選定的一個與為什麼、反方與回應。", "個人研究報告 PDF（11/13 上課前上傳）", "教材準備中", ["11/13 13:30 前在 app 上傳 PDF（10 MB 內）。", "上台方式見課堂公告。", "評分比重見課堂公告（草案：證據與來源、錢流、機會與為什麼是現在、五問理由、AI 使用紀錄）。", "AI 回饋不是成績；看的是你的證據和判斷。", "下週建組：3 人為主、最少 2 人。"]],
["AI agent 工具更新（老師講）＋建組", "agent 是什麼、現在能做到哪、哪些產業先被改；課堂最後 30 分鐘建組、選組的產業、認領方向。", "組卡：組名、組的產業、三個方向各由誰負責", "教材準備中", ["課堂兩題。", "agent 與協定、付款、記憶：2024–2026 的時間軸。", "建組：組長建組拿四碼組碼、組員輸入加入；3 人為主、最少 2。", "選組的產業：從組員第一輪的產業裡挑一個，之後全組只用這一個。", "認領方向：agent 基礎設施／AI 原生服務／實體世界 AI，一人一個；兩人組一人認兩個。"]],
["第二輪研究開跑：三個方向", "每個人依認領的方向，在組的產業裡找一個題目：跑同樣的三張卡。", "個人方向卡 v1", "教材準備中", ["課堂兩題。", "卡 1 問 AI：這個方向在這個產業裡能切什麼、現在誰在做。", "卡 2 NotebookLM 查證：5 個以上可靠來源。", "卡 3 整理成一個題目：第一個客戶、搶誰的預算、為什麼是現在。", "討論題：agent 基礎設施和 AI 原生服務在台灣找不到可查證的新創——是機會還是警訊？"]],
["第二輪研究工作坊", "NotebookLM 深挖、補來源，把三個人的題目寫到能用同一把尺比。", "個人方向卡 v2", "教材準備中", ["課堂兩題。", "來源怎麼補：政府統計、產業報告、近一年新聞、業者訪談、論壇。", "常見錯誤：只有 AI 說、沒有引用；題目太大、說不出第一個客戶。", "組內互看：三張卡能不能用同一把尺比。", "課後完成 v2。"]],
["三題比較、選一個、預演", "六準則計分、反方、寫組的結論；預演期末。", "期末報告初稿", "教材準備中", ["課堂兩題。", "六準則各打 0／1／2：誰的預算、資料優勢、可及性、為什麼是現在、台灣位置、可研究性。", "AI 反方拒絕三回合。", "結論：為什麼選它、它解的是哪個產業痛、另外兩個為什麼不選。", "預演：每組 6 分鐘。"]],
["期末：小組報告", "上台＋繳 PDF：三個方向各一段（各人寫自己的）＋比較與結論。", "小組研究報告 PDF（12/18 上課前上傳）", "教材準備中", ["12/18 13:30 前由組長在 app 上傳 PDF。", "每組 6 分鐘。", "評分比重見課堂公告（草案：三個方向各自的證據、比較與結論、為什麼現在與為什麼新創、AI 使用紀錄）。", "AI 回饋不是成績。", "期中＋期末兩份 PDF 就是你的作品集。"]]
];
const highlights=[['Should You Start A Startup?','創業從理解問題開始。第一週的任務是提出好問題，不是提出好解法。'],['How to Get and Evaluate Startup Ideas','選題時看具體使用者、反覆出現的困擾與可接觸的證據。'],['How To Talk To Users','用問題理解使用者的經驗，不要用問題推銷你的答案。'],["課前影片：怎麼問 Gemini、怎麼餵 NotebookLM（約 10 分鐘，準備中）","理論在課堂講；影片只教操作：貼 prompt、建筆記本、加來源、問六題。"],["課前影片：五問怎麼打（約 7 分鐘，準備中）","看完進教室直接打分。"],["本週沒有課前影片","老師講課；課後可看簡報。"],["本週沒有課前影片","期中報告週。"],["本週沒有課前影片","老師講課＋建組。"],["課前影片：三個方向各 3 分鐘（準備中）","agent 基礎設施／AI 原生服務／實體世界 AI 各是什麼、怎麼認出來。"],["本週沒有課前影片","工作坊。"],["本週沒有課前影片","比較與預演。"],["本週沒有課前影片","期末報告週。"]];
const n=Math.min(12,Math.max(1,Number(new URLSearchParams(location.search).get('week'))||1)); const w=weeks[n-1];
document.title=`Startup Journey Lab｜Week ${n}`;const h=highlights[n-1];document.querySelector('#video-title').textContent=h[0];document.querySelector('#video-takeaway').textContent=h[1];document.querySelector('#week-number').textContent=`WEEK ${String(n).padStart(2,'0')}`;document.querySelector('#week-title').textContent=w[0];document.querySelector('#week-summary').textContent=w[1];document.querySelector('#week-output').textContent=`本週提交：${w[2]}`;document.querySelector('#week-status').textContent=w[3];document.querySelector('#week-steps').innerHTML=w[4].map(x=>`<li>${x}</li>`).join('');document.querySelector('#week-one').hidden=n!==1;

document.querySelector("#week-two-materials").hidden=n!==2;
document.querySelector("#week-three-materials").hidden=n!==3;
const w4m=document.querySelector("#week-four-materials"); if(w4m) w4m.hidden=n!==4;

// Switch views without rebuilding the form: unsaved answers remain in memory.
if(n===2||n===3){
 const navigation=document.querySelector(n===2?'#week-two-navigation':'#week-three-navigation');
 const materials=document.querySelector(n===2?'#week-two-materials':'#week-three-materials');
 const cardSection=document.querySelector(n===2?'#week-two':'#week-three');
 navigation.hidden=false;
 function showWeekView(){
  const cardView=['#card','#week-two','#week-three'].includes(location.hash);
  document.querySelector('#week-blueprint').hidden=cardView;
  materials.hidden=cardView;
  cardSection.hidden=!cardView;
  navigation.querySelectorAll('[data-week-view]').forEach(link=>{
   if(link.dataset.weekView===(cardView?'card':'learning'))link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  });
 }
 window.addEventListener('hashchange',showWeekView);
 showWeekView();
}
