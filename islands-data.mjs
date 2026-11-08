// AI 新創群島・尋寶版 資料（2026-11-08 定案，規則見 docs/GAME_AI_ISLANDS.md）
// 一個寶箱＝一家公司。線索卡不寫公司名；學生判斷在哪座島 → 登島讀材料 → 答對三題 → 開箱拿七格卡＋夥伴。
// 事實標記：〔實證〕有可查來源；〔據報〕媒體／第三方整理；〔待查〕請學生自己查。數字寫「截至」日期，避免過期。
export const DIRECTIONS=[
 {id:1,name:'方向一｜Agent 經濟基礎設施',short:'賣鏟子',blurb:'協定、算力、資料、監控：賣給做 AI 的公司'},
 {id:2,name:'方向二｜AI 原生服務',short:'賣結果',blurb:'直接把事做完、按件或按月收費：搶的是人力預算'},
 {id:3,name:'方向三｜AI 進入實體世界',short:'進現場',blurb:'感測器進、派工出：讓人與機器在現場動起來'},
];
export const ISLANDS=[
 {id:1,name:'島 1 基礎模型',dir:1,hint:'做大模型本身、賣 API 與授權的公司'},
 {id:2,name:'島 2 算力',dir:1,hint:'蓋資料中心、租 GPU 給 AI 公司'},
 {id:3,name:'島 3 資料平台',dir:1,hint:'資料庫、後端服務，開發者按用量付'},
 {id:5,name:'島 5 Agent 基礎設施',dir:1,hint:'做 Agent 的框架、流程工具、監控'},
 {id:4,name:'島 4 AI 寫程式',dir:2,hint:'用 AI 幫人寫軟體、做 app'},
 {id:6,name:'島 6 垂直 Agent',dir:2,hint:'幫某一行（餐飲、網拍、租屋）把事做完'},
 {id:7,name:'島 7 消費創意',dir:2,hint:'聲音、音樂、影像生成，一般人也付錢'},
 {id:8,name:'島 8 實體 AI',dir:3,hint:'機器人：倉庫、工廠、家裡'},
 {id:9,name:'島 9 世界模型',dir:3,hint:'讓 AI 理解 3D 空間與物理，給遊戲、機器人用'},
 {id:10,name:'島 10 AI for Science',dir:3,hint:'材料、藥物：只看不出題'},
];
export const islandById=id=>ISLANDS.find(i=>i.id===Number(id));
export const dirById=id=>DIRECTIONS.find(d=>d.id===Number(id));

// 每家公司（寶箱）的欄位：見 Owner 這一筆的註解。其他家先放線索與名字，材料「準備中」。
export const COMPANIES=[
 {
  id:'owner',name:'Owner',island:6,dir:2,
  demo:true, // 11/27 第一個寶藏，線索直接
  tagline:'幫獨立餐廳做自己的網站與線上點餐，不抽成',
  // ① 線索卡：不寫公司名，3 句生意特徵（學生用這個判斷哪座島）
  clues:['客戶是「獨立餐廳」，不是連鎖；一家店就能買','收月費，不從每張訂單抽成——跟外送平台相反','創辦人高中沒念完，2018 年在美國開始做餐廳的網站'],
  // 去哪座島的提示（Irene）：第一次給方向，第二次縮到二選一
  islandHints:['想想 Week 6 的 4 大區：一家餐廳付月費買「幫我把事做完」，是賣鏟子、賣結果、還是進現場？','在方向二裡：它不是幫人寫程式，也不是做音樂影像——是幫「某一行」把事做完。'],
  // ② 店家故事（阿晴）：生活場景開頭
  story:{
   speaker:'阿晴 · 雞腿飯店老闆',
   open:'「你在外送 app 點一份 180 元的雞腿飯，我實拿 125——另外 55 元去哪了？」',
   lines:[
    ['它幫誰？','幫像我這種只有一兩家店的獨立餐廳。連鎖店有自己的 IT 部門，不需要它。'],
    ['產品做什麼？','幫餐廳做自己的網站、線上點餐、App，還會寄行銷簡訊。熟客直接在我的網站點，不經過外送平台。'],
    ['舉個例子','我把自家點餐網址印在收據上。老客人下次直接在網站點，我不用被抽三成；平台留著接新客就好。（示意情境，不是真實客戶案例）'],
   ],
  },
  // Irene 研究屋：兩件事
  irene:['客戶是獨立餐廳（不是連鎖）；它收的是月費，不抽成。','看一家公司就看三件事：誰付錢、怎麼收費、以前誰在做。答三題前先想清楚這三個。'],
  // AI 探索站：三個延伸問題 + 找碴
  deepQuestions:['餐廳有外送平台了，為什麼還願意另外付月費做自己的網站？','什麼樣的餐廳不適合用它？為什麼？','如果你是餐廳老闆，簽約前最想確認哪一個數字？'],
  deepPrompt:q=>`我正在上 AI 新創課，研究 Owner（owner.com）。課程資料：它服務美國的獨立餐廳，提供餐廳自己的網站、線上點餐與 App，收月費、不抽成。我的問題是：${q} 請用大學生能理解的方式回答，舉一個例子，分清楚「已知事實」和「你的推論」，附可以查證的來源網址；不確定的價格或數字請明說，不要猜。`,
  argue:`你是 Owner（幫美國獨立餐廳做自有網站與線上點餐、收月費不抽成的新創）的業務。我是台北一家月營業額 60 萬、八成訂單來自外送平台的雞腿飯店老闆，不太想再花錢。請你用三回合說服我，每回合我會反駁。第一回合先講一句你最有把握的理由，不要超過 60 字，講完等我回。`,
  // ③ 三題（四選一）；第三題要貼來源網址，附「去哪找」
  questions:[
   {q:'誰付錢給 Owner？',opts:['一般消費者（點餐的人）','獨立餐廳老闆','麥當勞這種連鎖集團','外送平台'],answer:1,why:'付月費的是獨立餐廳；點餐的消費者不付 Owner 錢。連鎖有自己的系統，不是它的客群。',hint:'回想阿晴說的「它幫誰」。'},
   {q:'Owner 怎麼收費？',opts:['每張訂單抽成 25–30%','月費制，不抽成','賣硬體（點餐機）','免費，靠廣告'],answer:1,why:'月費制、不抽成，正好是外送平台的相反；這是它對餐廳最大的賣點。',hint:'線索卡第二句。'},
   {q:'Owner 取代的是誰／以前誰在做這件事？貼一個來源網址。',opts:['外送平台的抽成（Uber Eats、DoorDash）','餐廳的廚師','POS 收銀機','Google 地圖'],answer:0,why:'餐廳以前把熟客的訂單也交給外送平台、被抽成；Owner 把熟客訂單拉回餐廳自己的網站。',hint:'阿晴那 55 元去哪了？',
    needUrl:true,sources:[['Owner 官網定價頁','https://www.owner.com/pricing'],['Restaurant Business：Owner 募 1.2 億美元、估值 10 億','https://www.restaurantbusinessonline.com/technology/tech-supplier-ownercom-raises-120m-giving-it-1b-valuation'],['Wikipedia：Owner.com','https://en.wikipedia.org/wiki/Owner.com']]},
  ],
  // 「哇」數字：答完三題揭曉
  wow:{label:'一年多估值漲幾倍？',value:'10 億 → 23 億美元',note:'2025/5 C 輪估值 10 億美元；2026/8 D 輪 2.4 億美元、估值 23 億（公司公告，〔據報〕）。'},
  // ④ 七格全圖卡（開箱拿到，一鍵貼進公司卡）
  card:[
   ['誰付錢','美國獨立餐廳（一到幾家店的老闆）〔實證：官網〕'],
   ['怎麼收費','月費制、不抽成；官網 2026 年顯示月費方案約 249／499 美元，另有實施費〔據報：第三方整理，簽約前請自己查官網〕'],
   ['以前誰在做','外送平台（抽成 15–30%）＋餐廳自己請人做網站；Owner 把熟客訂單拉回餐廳自有通路'],
   ['為什麼是現在','疫情後線上點餐變習慣；外送抽成漲到餐廳撐不住；AI 讓行銷簡訊、網站內容可以自動生成'],
   ['數字','2022 年服務 1,500+ 家餐廳〔據報〕；2025/5 C 輪 1.2 億美元、估值 10 億；2026/8 D 輪 2.4 億美元、估值 23 億〔據報〕'],
   ['風險','餐廳倒閉率高、客戶流失；外送平台也推「自有網站」功能；AI 讓做網站變便宜，月費撐不撐得住'],
   ['台灣同層','〔待查〕台灣幫餐廳做自有點餐的業者：請學生查 2 家、比收費方式'],
  ],
  pet:{name:'糰糰',kind:'海獺',desc:'守在餐館旁的點餐小幫手'},
  links:[['官網','https://www.owner.com/'],['Wikipedia','https://en.wikipedia.org/wiki/Owner.com']],
 },
 // ---- 以下先放線索與名字；材料準備中（寫完一家就把 ready:true）----
 {id:'gorgias',name:'Gorgias',island:6,dir:2,tagline:'幫網拍賣家做客服 AI',clues:['客戶是開網店的賣家（Shopify 那種），不是大企業','按「處理了幾張客服單」收錢','以前這件事是賣家自己或工讀生在客服信箱裡做'],ready:false},
 {id:'eliseai',name:'EliseAI',island:6,dir:2,tagline:'幫租屋管理公司回覆租客',clues:['客戶是管理幾千戶的租屋公司','租客半夜問「可以養貓嗎」，它回答、約看房','以前是租屋公司的客服人員在回'],ready:false},
 {id:'lovable',name:'Lovable',island:4,dir:2,tagline:'用聊天就把網站／app 做出來',clues:['客戶是不會寫程式、想做 app 的人','月費，按你用了多少「次」生成算','以前要找工程師或外包公司，幾十萬起跳'],ready:false},
 {id:'cognition',name:'Cognition（Devin）',island:4,dir:2,tagline:'AI 軟體工程師',clues:['客戶是軟體公司的工程團隊','按「Agent 工作時數」計費','取代的是初階工程師的例行工作'],ready:false},
 {id:'elevenlabs',name:'ElevenLabs',island:7,dir:2,tagline:'AI 配音與聲音',clues:['一般人（YouTuber）和企業都付錢','按生成的字數／分鐘計費','以前要請配音員、進錄音室'],ready:false},
 {id:'suno',name:'Suno',island:7,dir:2,tagline:'打字就出一首歌',clues:['付錢的是一般人：月費','生成的歌可以商用（付費版）','唱片公司告它侵權'],ready:false},
 {id:'mistral',name:'Mistral AI',island:1,dir:1,tagline:'歐洲的大模型公司（示範寶箱，不計分）',clues:['法國公司，做大模型本身','賣 API（按用量）＋把模型授權給企業部署','跟 OpenAI 做一樣的事，但強調「開放權重」與歐洲主權'],ready:false,demo:true},
 {id:'crusoe',name:'Crusoe',island:2,dir:1,tagline:'用多餘能源蓋 AI 資料中心',clues:['客戶是要訓練模型的 AI 公司','簽長約租 GPU 算力','以前這件事是 AWS／Google 這種雲端大廠在做'],ready:false},
 {id:'supabase',name:'Supabase',island:3,dir:1,tagline:'開發者的後端與資料庫（我們這門課的 app 就用它）',clues:['客戶是開發者與小團隊','免費起步、按用量付費','開源，對手是 Firebase'],ready:false},
 {id:'langchain',name:'LangChain',island:5,dir:1,tagline:'做 Agent 的框架與監控',clues:['客戶是做 AI 應用的工程團隊','框架免費開源，監控平台按用量收費','以前每家公司自己寫膠水程式'],ready:false},
 {id:'n8n',name:'n8n',island:5,dir:1,tagline:'拉線就能做自動化流程',clues:['客戶是中小企業和自動化愛好者','自己架免費、雲端版月費','對手是 Zapier'],ready:false},
 {id:'figure',name:'Figure AI',island:8,dir:3,tagline:'人形機器人進工廠',clues:['客戶是 BMW 這種製造業','賣機器人或按工時出租','取代的是生產線上的重複體力活'],ready:false},
 {id:'skild',name:'Skild AI',island:8,dir:3,tagline:'機器人的「大腦」',clues:['客戶是做機器人的公司，不是工廠','賣模型授權','讓一個模型控制不同廠牌的機器人'],ready:false},
 {id:'worldlabs',name:'World Labs',island:9,dir:3,tagline:'從一張圖生出一個 3D 世界',clues:['李飛飛創辦','客戶是遊戲工作室、影視、機器人公司','賣的是「空間智慧」模型'],ready:false},
 {id:'odyssey',name:'Odyssey',island:9,dir:3,tagline:'互動式影片世界模型',clues:['每一幀即時生成，可以走進去','客戶是遊戲與娛樂','沒有公開估值'],ready:false},
];
export const companyById=id=>COMPANIES.find(c=>c.id===id);
export const SCORE_BY_ATTEMPT=[10,7,5]; // 第 1／2／3 次以上答對
export const scoreFor=attempts=>SCORE_BY_ATTEMPT[Math.min(attempts-1,2)];
export const boxScore=scores=>scores.reduce((a,b)=>a+(b||0),0);
export const isUrl=s=>/^https?:\/\/[^\s]+\.[^\s]+/.test(String(s||'').trim());
/** 七格卡 → 可貼進公司卡的純文字 */
export const cardText=c=>`【${c.name}】${c.tagline}\n`+c.card.map(([k,v])=>`${k}：${v}`).join('\n');
