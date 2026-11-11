# 群島美術素材（repo 內為縮小版）

| 用途 | 檔名 | 尺寸 | 用在哪 |
|---|---|---|---|
| 島景 | `scene_islandNN.jpg` | 1200×675 | `#scenery`（三個按鈕固定在 39%/29%、65.5%/23%、84%/36%，所以構圖要一致） |
| 店家 NPC | `npc_islandNN.png` | ≤440×640 透明 | 島上站立（`.npc-owner`）＋店家說話時的對話頭像（`#portrait-img`，上半身裁切） |
| 夥伴 Lv.1 | `pet_islandNN_lv1.png` | ≤320 透明 | 開箱後出現在島上與情報袋 |
| 夥伴 Lv.2 | `pet_islandNN_lv2.png` | ≤320 透明 | 做完探索站或找碴（`box.deep`）後切換 |
| 其他 | `cast.png`（學生／Irene／機器人精靈圖）、`teacher.svg`、`pet.svg`（舊版，保留） | | |

NN＝島號 01–10（島 6 的島景是客服島，不是餐館；餐館是島 5）。同一座島的兩家公司共用同一組 NPC／夥伴圖，夥伴名字在 `islands-data.mjs` 的 `pet` 各自不同。

原始 ChatGPT 產出的大檔（1–2 MB／張）、素材包 zip、對照表與提示詞放在 `_source/`（gitignore，只在老師電腦）。要重做縮圖：原檔 → 去邊 → NPC thumbnail 440×640、夥伴 320×320、島景 JPEG q82。
