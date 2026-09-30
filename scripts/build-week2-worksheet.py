from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
pdfmetrics.registerFont(TTFont('TC','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
c=canvas.Canvas('materials/Week2_學生學習單.pdf',pagesize=(595.28,841.89));c.setTitle('Week 2 問題探索與選題｜學生學習單')
page=0
def txt(text,x,y,size=12):
 c.setFillColor(HexColor('#17251F'));c.setFont('TC',size);c.drawString(x,y,text)
def new(title,sub):
 global page
 page+=1;c.setFillColor(HexColor('#F5F1E9'));c.rect(0,0,595.28,841.89,fill=1,stroke=0)
 txt('STARTUP JOURNEY LAB  /  WEEK 02',40,801,10);txt(title,40,764,23);txt(sub,40,733,11)
 txt(f'姓名／學號：____________________    日期：____________    {page} / 5',40,31,10)
def question(label,y,lines=2):
 txt(label,40,y,12);c.setStrokeColor(HexColor('#B2B9AE'))
 for i in range(lines):c.line(40,y-22-i*22,555,y-22-i*22)
new('兩個候選痛點：候選一','先完成 Week 1。所有例子只用來理解，請填寫自己的真實觀察。')
labels=['受到影響的人（角色代稱，不寫姓名）','何時何地發生（最近一次事件）','想完成的事情','遇到的阻礙（先不要描述 App 功能）','頻率或待驗證','代價或待驗證（時間／金錢／機會／情緒）','目前處理方法','你什麼時候、在哪裡，親眼看到這件事？（真實事件、時間、來源；沒親眼看過就寫「還沒親眼看過」）','待驗證假設（不要把猜測寫成事實）']
for i,l in enumerate(labels):question(l,692-i*65,1)
c.showPage();new('兩個候選痛點：候選二','每個候選題都填相同欄位。不確定頻率或代價時，可明確寫「待驗證」。')
for i,l in enumerate(labels):question(l,692-i*65,1)
c.showPage();new('選題與修訂','這是可以繼續訪談的暫定方向，不是已獲驗證的 MVP 題目。')
question('我暫定選擇：候選一／候選二／另附候選三',691,1)
question('為什麼先選這一題？其他題目為什麼暫緩？',621,4)
question('什麼證據會讓我改變選擇？',481,3)
txt('修訂後的痛點陳述',40,351,14)
for i,l in enumerate(['在＿＿情境中，＿＿類型的人想要＿＿，','但是因為＿＿而遇到＿＿，目前只能用＿＿處理；','我仍需驗證＿＿。']):txt(l,40,321-i*24)
question('用你自己的文字寫出來：',221,4)
c.showPage();new('準備真實訪談','填角色及接觸方式，不寫姓名、Email、電話或敏感身分。')
for i in range(3):question(f'受訪者 {i+1}：角色與接觸方式',691-i*79,2)
question('訪談問題 1：詢問上一次真實經驗',426,3)
question('訪談問題 2：追問目前方法、代價或反例',307,3)
for i,l in enumerate(['□ 我確認三位受訪者符合暫定對象，且可實際接觸。','□ 我確認兩題詢問真實經驗，不暗示答案或推銷產品。','必要欄位通過即可提交；AI 或教師尚未回覆不影響保存。','老師標記安全、隱私或倫理風險時，先討論再進行訪談。']):txt(l,40,160-i*23,11)
c.showPage();new('進階挑戰與學習紀錄','挑戰題可選填；所有路徑共享同一份核心成果。')
for i,l in enumerate(['誰沒有這個問題？最大的反例是什麼？','使用者為什麼仍接受現在的方法？','使用者、受益者與付費者是否相同？','最危險的假設是什麼？最低成本怎麼驗證？']):question(l,691-i*85,2)
question('內容來源與 AI 使用說明',341,2);question('我如何回應 AI 建議？沒有使用可留白',251,2)
for i,l in enumerate(['AI 只提供待驗證方向，不代寫證據、不決定成績。','引導模式每週最多 3 次；標準／挑戰 2 次，老師可調整。','同內容回用已保存建議；AI 無法使用時仍可保存、提交。','交件：將本單內容填入 Week 2 卡並按正式提交；紙本依老師安排。']):txt(l,40,145-i*22,10)
c.save()
