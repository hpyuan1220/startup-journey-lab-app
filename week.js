const weeks=[
['課程說明與創業起點','影片〈Should You Start A Startup?〉帶你從真實問題、使用者與長期動機理解創業的起點。','完成個人起點卡','教材已提供',['理解：不需要先有 App、公司名稱或完整商業計畫。','觀察：記下未修飾的原句，以及誰、何時、在哪裡發生。','辨別：把可觀察的事實和仍待驗證的假設分開。','討論：我為什麼關心？原句是什麼？哪些是事實？哪些還不知道？','準備：留下一題下週要問使用者的問題。']],
['問題探索與選題','從多個生活問題中選擇一個值得深入研究的方向。','問題機會清單與選題理由','教材準備中',['整理多個問題觀察。','比較誰最常遇到與困擾成本。','選一個方向並寫下理由。']],
['使用者訪談','學習用開放式問題理解使用者的真實經驗。','訪談紀錄與原話','教材準備中',['完成訪談題綱。','訪談真實使用者。','整理原話與發現。']],
['AI-native 創業','思考 AI 可以協助哪些工作，也知道哪些判斷應由人負責。','AI 使用情境與限制','教材準備中',['定義使用者工作。','找出可信資料來源。','寫下人類檢查方式。']],
['產品與 MVP','用最低成本做出可讓使用者測試的原型。','MVP 原型','教材準備中',['畫出使用流程。','做出可測試版本。','準備觀察問題。']],
['第一批使用者','找到第一批願意測試與給回饋的使用者。','測試計畫','教材準備中',['定義測試對象。','安排接觸方式。','記錄測試回饋。']],
['產品數據與留存','用使用者行為資料決定下一步改什麼。','行為圖表與改版決策','教材準備中',['整理匿名測試資料。','辨識卡關點。','提出下一輪假設。']],
['商業模式與定價','說清楚價值、客戶、成本與初步定價假設。','商業模式初稿','教材準備中',['定義客戶與價值。','列出成本與替代方案。','寫下初步定價假設。']],
['團隊合作','建立角色、合作原則與分歧處理方式。','團隊章程','教材準備中',['確認角色分工。','建立決策方式。','討論衝突處理。']],
['發布與成果展','統整十週證據、原型與下一步。','Startup Portfolio 與 Demo','教材準備中',['整理證據與修改歷程。','準備五分鐘展示。','說明下一步驗證。']]
];
const highlights=[['Should You Start A Startup?','創業從理解問題開始。第一週的任務是提出好問題，不是提出好解法。'],['How to Get and Evaluate Startup Ideas','選題時看具體使用者、反覆出現的困擾與可接觸的證據。'],['How To Talk To Users','用問題理解使用者的經驗，不要用問題推銷你的答案。'],['How To Build A Company With AI From The Ground Up','AI 應協助特定工作流程，並保留人類判斷與查核。'],['How to Build An MVP','MVP 的目的是學習，不是一次完成所有功能。'],['How to Get Your First 10 Customers','先接觸少量真正可能受影響的人，從回應中修正。'],['Dot Plots: How to Actually See What Your Users Are Doing','用行為資料辨識卡關點，再決定改什麼。'],['Startup Business Models and Pricing','先說清楚為誰創造什麼價值，再測試價格與模式。'],['Keys To Successful Co-Founder Relationships','合作需要先談角色、責任、決策方式與分歧。'],['The Best Way To Launch Your Startup','發布是取得真實回饋的開始，下一步仍要持續測試。']];
const n=Math.min(10,Math.max(1,Number(new URLSearchParams(location.search).get('week'))||1)); const w=weeks[n-1];
document.title=`Startup Journey Lab｜Week ${n}`;const h=highlights[n-1];document.querySelector('#video-title').textContent=h[0];document.querySelector('#video-takeaway').textContent=h[1];document.querySelector('#week-number').textContent=`WEEK ${String(n).padStart(2,'0')}`;document.querySelector('#week-title').textContent=w[0];document.querySelector('#week-summary').textContent=w[1];document.querySelector('#week-output').textContent=`本週提交：${w[2]}`;document.querySelector('#week-status').textContent=w[3];document.querySelector('#week-steps').innerHTML=w[4].map(x=>`<li>${x}</li>`).join('');document.querySelector('#week-one').hidden=n!==1;
