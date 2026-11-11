# 群島尋寶：10 座島的島圖提示詞（給 ChatGPT 生圖）

現在 10 座島共用 `materials/islands/scene_island06.jpg`（餐館島）。要各島不同圖，請在 ChatGPT 用下面的提示詞一座一座生，存成 `materials/islands/scene_island01.jpg` … `scene_island10.jpg`（**1200×675，JPG**），放進專案資料夾後告訴 Claude，Claude 把島號加進 `islands.js` 的 `SCENES` 就會換圖。

## 為什麼構圖要一樣

遊戲把三個按鈕疊在圖上，位置是固定的百分比：
- **店家**（左上，約 39%／29%）
- **AI 探索站**（中上，約 65%／23%）
- **Irene 研究屋**（右，約 84%／36%）
- 底下中央是沙地廣場（寶箱、角色站的地方），左下是木棧橋。

所以每座島**只換建築風格、植物、顏色、小物**，不換佈局。提示詞最前面那段「共同底稿」每次都要貼。

## 共同底稿（每次都貼在最前面）

```
Isometric-ish 3/4 top-down view of a small round island in bright turquoise sea, 16:9, 1200x675, clean stylized game art, soft daylight, vivid but not neon colors, no text, no people, no logos, no UI.
Fixed layout (keep exactly): a rocky island with green grass; LEFT-UPPER a shop building with an awning and a small terrace; CENTER-UPPER a workshop building with a blue metal roof and big glass windows; RIGHT a two-storey white house with balcony and flowers; a large empty flat sand plaza in the lower-center; a wooden pier with rope railings reaching the sea at the lower-left; small rocks and coral around; a tiny lighthouse buoy at the far left.
Keep the plaza empty (characters and a treasure chest will be placed there later). Camera, horizon and island size identical to a reference "restaurant island" scene.
```

接著貼該島的「風格段」：

## 島 1 插座與流程（Ampersand、n8n）— 方向一
```
Theme: "connectors and pipelines". The shop is a tidy hardware/electronics store with cable spools and plugs as decoration; the workshop has visible colorful pipes and conveyor tubes linking small boxes; the house has a rooftop of neat antenna masts. Palette: slate grey, electric blue, orange accents. Tropical plants replaced by tidy hedges and a few pines.
```

## 島 2 授權與監控（Arcade、Baselayer）— 方向一
```
Theme: "gatekeeper and watchtower". The shop is a small customs/ticket booth with a striped barrier gate; the workshop has a round radar dish and a tall watchtower with a searchlight; the house is a stone guardhouse with a heavy wooden door and lanterns. Palette: navy, cream, brass. Low shrubs, a few cypress trees.
```

## 島 3 Agent 結算（Natural）— 方向一
```
Theme: "money and ledgers". The shop is a tiny old-fashioned bank counter with a bronze scale sign; the workshop is a clean modern vault-like building with a round steel door; the house is a cozy accountant's cottage with stacks of ledgers visible in windows. Palette: forest green, gold, ivory. Olive trees and neat flower beds.
```

## 島 4 AI 寫程式（Lovable）— 方向二
```
Theme: "building blocks". The shop is a bright toy-store-like studio with giant colorful building blocks stacked outside; the workshop has a wall of screens showing abstract app wireframes (no readable text); the house is a modern white cube house with a pastel gradient roof. Palette: coral pink, lavender, mint. Playful round topiary trees.
```

## 島 5 餐飲零售（Owner、Palona）— 方向二
```
Use the existing restaurant island look: a Chinese-style diner with red tiled roof and striped awning, outdoor tables, a glasshouse workshop with blue roof, a white Mediterranean house with bougainvillea; palm trees and coral. (This is the reference scene; if regenerating, keep it nearly identical.)
```

## 島 6 客服訊息（Gorgias、Respond.io）— 方向二
```
Theme: "messages and mailboxes". The shop is a small post office with rows of colorful mailboxes and a speech-bubble shaped sign; the workshop is a call-center style building with headsets hanging outside and many small windows; the house has a dovecote with white pigeons on the roof. Palette: sky blue, white, warm yellow. Tidy lawns, a few flowering trees.
```

## 島 7 財務後台（Clark）— 方向二
```
Theme: "paper and audit". The shop is a stationery shop with a quill-and-ink sign and piles of document boxes; the workshop is a glass-walled library/archive with tall shelves of binders visible; the house is a classic brick townhouse with a green door and a small brass plaque. Palette: burgundy, cream, dark green. Maple trees with autumn leaves.
```

## 島 8 物流派工（HappyRobot、Cargofy）— 方向三
```
Theme: "trucks and cargo". The shop is a truck-stop diner with a big truck-shaped sign; the workshop is a loading dock warehouse with shipping containers and a small crane; the house is a dispatcher's office with a weather vane and a tall radio antenna. Palette: safety orange, charcoal, steel blue. Sparse dry grass and a few acacia trees; pier has a small cargo barge moored.
```

## 島 9 長照現場（Sage）— 方向三
```
Theme: "care home". The shop is a warm pharmacy/café with a green cross sign and rocking chairs on the porch; the workshop is a calm nursing-station building with large soft-lit windows and a bell tower; the house is a cozy wooden cottage with a ramp, railings and a garden bench. Palette: sage green, peach, soft white. Lavender beds, willow trees, a small pond.
```

## 島 10 機器人（Alloy Robotics）— 方向三
```
Theme: "robot lab". The shop is a sleek metallic garage with a robot-arm sculpture; the workshop is a hangar-like testing lab with a rolling door and a small robot test track outside; the house is a futuristic dome house with solar panels. Palette: gunmetal, white, cyan accents. Minimal vegetation, some geometric rock gardens.
```

## 生完之後
1. 存成 `scene_island01.jpg` … `scene_island10.jpg`，1200×675。
2. 放到 `Startup Journey Lab Project/materials/islands/`。
3. 跟 Claude 說「島圖放好了」，Claude 會把島號加進 `SCENES`、檢查三個按鈕有沒有蓋到建築、再 commit。

小技巧：先生島 5（參考島）確認風格，再用「same style and layout as the previous image, but …」接著生其他島，一致性最好。
