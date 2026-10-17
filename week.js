const weeks=[
['課程說明與創業起點','影片〈Should You Start A Startup?〉帶你從真實問題、使用者與長期動機理解創業的起點。','完成個人起點卡','教材已提供',['理解：不需要先有 App、公司名稱或完整商業計畫。','觀察：記下未修飾的原句，以及誰、何時、在哪裡發生。','辨別：把可觀察的事實和仍待驗證的假設分開。','討論：我為什麼關心？原句是什麼？哪些是事實？哪些還不知道？','準備：留下一題下週要問使用者的問題。']],
['問題探索與選題','從多個生活問題中選擇一個值得深入研究的方向。','兩個候選痛點、一個暫定選題、三位受訪者與兩題訪談問題','教材已提供',['取回 Week 1：先完成起點卡，可修改並保留版本。','比較：填寫人物、情境、工作、阻礙、頻率、代價、替代方式、證據與假設。','選題：說明理由，以及什麼證據會讓你改變選擇。','修訂：先規則檢查，再選用 AI 或同儕回饋。AI 不是成績。','準備：確認三位可接觸受訪者與兩題非引導式問題，正式提交。']],
['使用者訪談','用問題理解別人的經驗，不是推銷你的答案。','三次真實訪談的紀錄卡：原話、代價、目前做法，以及訪談後的判斷','教材已提供',['取回 Week 2：看自己的三階燈與老師指路；還沒交的先補交。','準備單：痛點陳述、三位受訪者、兩題問題，印出來或存在手機裡。','怎麼問：問上一次發生什麼、後來怎麼辦；不問「你會不會用」。','紀錄：原話欄只寫對方說的話；你的想法另外寫。受訪者只用代稱。','判斷：三次記完後選成立／調整／換題，用受訪者的用詞改寫痛點陳述。']],
["從我的痛看產業：挑戰與契機", "把你的痛放到一條產業線上，看這一行真正的挑戰在哪、有誰在付錢、契機在哪一段。", "產業挑戰卡（四格＋證據＋體檢）＝期中報告第一版", "教材準備中", ["配對：app 依你的原題配到 9 條產業線，選一條，寫一句「我的痛在這條線的哪一段」；原題找不到付錢的人，直接改選。", "問 AI 1（Gemini）：這一行的錢怎麼流、老闆卡在哪 → 填 ② 挑戰、③ 錢流。", "查證（NotebookLM）：5–10 份來源、六題提問階梯，每一點標（來源：XX）。", "問 AI 2（Gemini）：三個學生、八週，能切哪一段 → 填 ④ 契機＋第一個客戶。", "體檢：有人付錢嗎／夠頻繁夠貴嗎／為什麼沒解掉／第一個客戶是誰／八週切得了嗎（＋為什麼是現在），每題 0–2 分、各寫一句理由。"]],
["縮小與機會：期中報告、矩陣選段、組隊", "從三個切入點挑一段，寫成一句可測的假設；依產業線組隊。", "個人研究報告（期中，10/29 課前交）＋機會卡（組）", "教材準備中", ["期中：app 把 Week 4 的卡、證據表、體檢、AI 對話串成一頁個人研究報告，11/2 前可補證據。", "矩陣：三個切入點放進「對老闆的影響 × 我們做的難度」2×2，只選高影響、低難度那一格。", "組隊：最多 3 人，依產業線；同一條線多組就切不同一段。", "假設句：「如果我們幫〔第一個客戶〕做〔一段〕，他會願意〔試用／付 X／換掉現在的做法〕。」"]],
["驗證：被 AI 打臉，再去見付錢的人", "在做之前先被拒絕三次，再去問真的會付錢的人。", "驗證卡（組）：三個反對理由、我們的回應、要改什麼、對方親口的三句話", "教材準備中", ["Gemini 反方：扮「用 LINE 和 Excel 撐了十年、不想花錢的老闆」，拒絕三回合。", "見付錢的人：組員自己約機會卡上的第一個客戶（第 9 張由老手帶路；約不到的組由老師配業師）。", "只問三件事：你現在怎麼處理？一個月花多少？願不願意試兩週？", "Go／No-go：對方說得出現在怎麼處理、花多少，且願意試兩週 → go；只說「不錯」→ 回 Week 5 換一段。"]],
["做 Demo v1：agent 不是 app", "用 Google 的免費工具做一個住在老闆 LINE 旁邊的小助手，不做要人另外開的 app。", "Demo 卡 v1：五行規格、連結、三張截圖、一句話功能", "教材準備中", ["五行規格（借 AI 策略畫布三格）：解什麼痛、AI 具體做哪個任務（回覆／提醒／分類）、成功數字；加上觸發與不做什麼。", "形式對照：agent→Gemini Gem＋NotebookLM；workflow→Forms＋Sheets＋Apps Script；預約→Calendar；儀表板→Looker Studio；有畫面才用 AI Studio。", "訊息先讓老闆「複製到 LINE 發」；自動接 LINE 只給進階組。", "做完先給第一個客戶看，約下週試用。"]],
["商業模式與定價", "用 Week 6 問到的「現在花多少」算定價假設，再被反方辯一次。", "定價假設：第一年誰付、付多少、為什麼", "教材準備中", ["YC 定價要點。", "把對方現在的成本（時間×時薪、平台抽成、月費）換算成你的定價上限。", "Gemini 反方辯定價三回合。", "更新機會卡的錢流。"]],
["Demo v2 與團隊", "給第一個客戶用兩週、給兩個外組試用，收三條回饋改一版；寫團隊章程。", "Demo 卡 v2（回饋三條、改了什麼）＋團隊章程", "教材準備中", ["兩個外組試用，不解釋，看他們第一個按哪裡。", "砍掉多出來的按鈕。", "第一個客戶願不願意繼續用，是唯一的數字。", "團隊章程：角色、決策方式、分歧處理。"]],
["成果展", "用證據講，不是用點子講。", "5 分鐘 Demo＋Startup Portfolio（app 自動串 W4–W9 的卡）", "教材準備中", ["付錢的人是誰、見過面了嗎。", "挑戰的證據（來源）。", "切哪一段、Demo、對方試用後說了什麼。", "下一步要驗證什麼。"]]
];
const highlights=[['Should You Start A Startup?','創業從理解問題開始。第一週的任務是提出好問題，不是提出好解法。'],['How to Get and Evaluate Startup Ideas','選題時看具體使用者、反覆出現的困擾與可接觸的證據。'],['How To Talk To Users','用問題理解使用者的經驗，不要用問題推銷你的答案。'],["How to Get and Evaluate Startup Ideas（片段：壞掉的大產業、焦油坑）", "好題目常藏在看起來壞掉的大產業裡；人人有感但沒人付錢的，是焦油坑。"], ["How to Build An MVP（前段，選看）", "先定義一個流程、一個客戶，再談做什麼。"], ["How To Talk To Users（重播 B 端三問）", "問現在怎麼處理、花多少、願不願意試，不問會不會用。"], ["How To Build A Company With AI From The Ground Up（選看）", "AI 做一個具體任務就好；判斷與查核留給人。"], ["Startup Business Models and Pricing", "先說清楚為誰創造什麼價值，再測試價格與模式。"], ["Keys To Successful Co-Founder Relationships", "合作需要先談角色、責任、決策方式與分歧。"], ["The Best Way To Launch Your Startup", "發布是取得真實回饋的開始，下一步仍要持續測試。"]];
const n=Math.min(10,Math.max(1,Number(new URLSearchParams(location.search).get('week'))||1)); const w=weeks[n-1];
document.title=`Startup Journey Lab｜Week ${n}`;const h=highlights[n-1];document.querySelector('#video-title').textContent=h[0];document.querySelector('#video-takeaway').textContent=h[1];document.querySelector('#week-number').textContent=`WEEK ${String(n).padStart(2,'0')}`;document.querySelector('#week-title').textContent=w[0];document.querySelector('#week-summary').textContent=w[1];document.querySelector('#week-output').textContent=`本週提交：${w[2]}`;document.querySelector('#week-status').textContent=w[3];document.querySelector('#week-steps').innerHTML=w[4].map(x=>`<li>${x}</li>`).join('');document.querySelector('#week-one').hidden=n!==1;

document.querySelector("#week-two-materials").hidden=n!==2;
document.querySelector("#week-three-materials").hidden=n!==3;

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
