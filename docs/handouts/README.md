# 講義原始檔（HTML → PDF）

這裡放講義、一頁說明的 HTML 原始檔。改內容就改 HTML，再轉成 PDF：

```
# 需要 Node＋Playwright（或用 Chrome 打開 HTML → 列印 → 另存為 PDF，紙張 A4、勾「背景圖形」）
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+process.argv[1]);await p.pdf({path:process.argv[2],format:'A4',printBackground:true,preferCSSPageSize:true});await b.close();})()" "$PWD/docs/handouts/WEEK6_HANDOUT.html" materials/Week6_講義.pdf
```

| HTML | 產出的 PDF |
|---|---|
| WEEK6_HANDOUT.html | materials/Week6_講義.pdf |
| WEEK8_HANDOUT.html | materials/Week8_講義.pdf |
| WEEK8_SPEAKER_BRIEF.html | 116/Week8/Week8_給講師的課程說明.pdf |
| WEEK4_SUMMARY_GROUP.html | 116/Week4/Week4_進度總結_20261104.pdf（群組版，無名單） |
| WEEK4_ONEPAGE_MISMATCH.html | 116/Week4/Week4_痛對不上產業線怎麼辦_一頁.pdf |

有學生姓名學號的版本（Week 4 全班名單）原始檔在 `docs/private/`，不進 git。
Week 4、Week 5 講義的原始檔當初沒有存進專案（只有 PDF）。簡報的原始檔是 `docs/WEEK*_SLIDES_SOURCE.json`，用 `scripts/build-slides.py` 產生。
