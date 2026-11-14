# 群島總覽地圖：一張圖畫出港口＋10 座島（給 ChatGPT 生圖）

用途：群島遊戲進來第一眼看到整片群島，每座島可點。島的位置是固定的（下面的格子圖），Claude 會照這個位置標熱區，所以**島的相對位置不要改**。

## 存檔位置與檔名

```
/Users/ireneyuan/Desktop/2026 class/116 AI start up class/Startup Journey Lab Project/materials/islands/map_overview.jpg
```
ChatGPT 下載通常是 PNG、尺寸不一定剛好——改名丟進去就好，Claude 會統一轉 JPG、裁成 1600×1000。放好跟 Claude 說「總覽圖放好了」。

## 位置格子（島在圖上的哪裡；左上為 0,0，右下為 100,100）

```
方向一（左邊）         方向二（中間）              方向三（右邊）
島 1 (14, 22)          島 4 (40, 14)               島 8 (82, 20)
島 2 (10, 50)          島 5 (50, 38)   島 6 (64, 26) 島 9 (86, 48)
島 3 (18, 74)          島 7 (56, 62)               島 10 (80, 76)
                       港口 HARBOR (46, 88)  ← 畫面下方正中
```

## 提示詞（整段貼進 ChatGPT）

```
A hand-painted nautical chart style overview map of an archipelago, 16:10, 1600x1000, clean stylized game art, same painterly style and palette as a bright turquoise-sea isometric island game, soft daylight, vivid but not neon, no text, no labels, no numbers, no people, no logos, no UI, no compass rose text.

Top-down 3/4 view. Bright turquoise sea with light wave texture, a few whitecaps, faint dotted sailing routes between islands, a few tiny sailboats. Eleven landmasses in fixed positions (percent of width, height from top-left):

HARBOR at (46, 88), bottom-center, the largest: a round island with a wooden pier, a small lighthouse, warm-colored houses with terracotta roofs and a bustling little dock — this is the starting port.

LEFT GROUP (three "infrastructure" islands, cooler slate-blue and steel palette):
- Island 1 at (14, 22): tidy hardware island with colorful pipes and conveyor tubes linking small boxes, antenna masts.
- Island 2 at (10, 50): watchtower island with a round radar dish, a striped barrier gate, a searchlight tower.
- Island 3 at (18, 74): bank island with a small vault-like building with a round steel door and a bronze scale sign.

CENTER GROUP (four "AI service" islands, warm and lively palette):
- Island 4 at (40, 14): toy-studio island with giant colorful building blocks stacked outside.
- Island 5 at (50, 38): restaurant island with a cafe with striped awning, outdoor tables, a two-storey white house with balcony flowers (this one matches the reference restaurant island).
- Island 6 at (64, 26): post-office island with rows of colorful mailboxes and a speech-bubble shaped sign.
- Island 7 at (56, 62): library/archive island with a glass-walled archive building and stacks of document boxes.

RIGHT GROUP (three "physical world" islands, earthy and industrial palette):
- Island 8 at (82, 20): cargo island with a loading dock, shipping containers, a small crane and a truck-stop diner.
- Island 9 at (86, 48): care-home island with a warm pharmacy-cafe, rocking chairs on a porch, soft green lawns.
- Island 10 at (80, 76): robot-lab island with a hangar, a small robot test track and a robot-arm sculpture.

Each island is small (about 10–14% of the image width), clearly separated by sea, each with its own silhouette so they are recognizable at a glance. Keep generous empty sea around every island (labels will be overlaid later). Slightly darker sea at the edges, light vignette. Consistent lighting from the upper left.
```

## 如果一次生不準

- 島跑位：回它「Keep every island exactly at the positions listed; move Island N to (x, y).」
- 太擠或文字出現：加「no text at all, more empty sea between islands」。
- 風格不像現有島景：把 `materials/islands/scene_island06.jpg` 上傳給它當參考，加「match this reference style」。
