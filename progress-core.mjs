// 「我的進度」：學生端（課程地圖最上面一條）和老師端（之後的全班總表）共用同一套判定。
// 輸入是各週那一列（可為 null）；輸出每週 {week, state, label, detail, next, href}。
// state：done（做完）／partial（做了一部分）／revise（老師退回）／none（沒開始）。
import {normalizeRecord,doneCount} from './week3-core.mjs';
import {normalizeWeek4,week4Progress} from './week4-core.mjs';
import {normalizeWeek5,week5Progress} from './week5-core.mjs';

export const PROGRESS_RULES='progress-20261029';
const REVIEW={approved:'老師已確認',revision:'老師退回「請修訂」',hold:'請先與老師討論',pending:'已交，老師審核中'};

export function progressWeek1(w1){
 if(!w1)return {week:1,state:'none',label:'還沒開始',detail:'',next:'填 Week 1 起點卡',href:'index.html#student'};
 if(w1.status==='submitted')return {week:1,state:'done',label:'已提交',detail:'',next:'',href:'index.html#student'};
 return {week:1,state:'partial',label:'草稿',detail:'還沒按提交',next:'回 Week 1 按「提交」',href:'index.html#student'};
}
export function progressWeek2(w2){
 if(!w2)return {week:2,state:'none',label:'還沒開始',detail:'',next:'填 Week 2 痛點卡',href:'week.html?week=2#card'};
 if(w2.status!=='submitted')return {week:2,state:'partial',label:'草稿',detail:'還沒按提交',next:'回 Week 2 按「提交」',href:'week.html?week=2#card'};
 const rv=w2.review_status||'pending';
 if(rv==='revision')return {week:2,state:'revise',label:'請修訂',detail:REVIEW.revision,next:'看老師備註，改好再提交一次',href:'week.html?week=2#card'};
 if(rv==='hold')return {week:2,state:'revise',label:'請先討論',detail:REVIEW.hold,next:'找老師談一下再繼續',href:'week.html?week=2#card'};
 return {week:2,state:'done',label:rv==='approved'?'老師已確認':'已提交',detail:REVIEW[rv]||'',next:'',href:'week.html?week=2#card'};
}
export function progressWeek3(w3){
 if(!w3)return {week:3,state:'none',label:'還沒開始',detail:'',next:'填訪談準備單，訪談 3 個人',href:'week.html?week=3#card'};
 const rec=normalizeRecord(w3.record||{});const n=doneCount(rec);
 if(w3.status==='submitted')return {week:3,state:'done',label:'已提交',detail:`${n} 次訪談`,next:'',href:'week.html?week=3#card'};
 if(n>=3)return {week:3,state:'partial',label:'3 次都記了',detail:'只差按「正式提交」',next:'回 Week 3 拉到最下面按提交',href:'week.html?week=3#card'};
 return {week:3,state:'partial',label:`訪談 ${n}/3`,detail:n?`還差 ${3-n} 次`:'開了頁但還沒記',next:'補到 3 次訪談再提交',href:'week.html?week=3#card'};
}
export function progressWeek4(w4){
 if(!w4)return {week:4,state:'none',label:'還沒開始',detail:'',next:'選產業線，做三張卡',href:'week.html?week=4#card'};
 const p=week4Progress(normalizeWeek4(w4.data||{}));
 if(p.cards===3)return {week:4,state:'done',label:'三張卡完成',detail:'',next:'',href:'week.html?week=4#card'};
 const missing=[!p.industry&&'選產業線',!p.card1&&'卡 1',!p.card2&&'卡 2',!p.card3&&'卡 3'].filter(Boolean);
 return {week:4,state:'partial',label:`三張卡 ${p.cards}/3`,detail:'還差：'+missing.join('、'),next:'回 Week 4 補'+missing.join('、'),href:'week.html?week=4#card'};
}
export function progressWeek5(w5){
 if(!w5)return {week:5,state:'none',label:'還沒開始',detail:'',next:'打開比較頁：計分、選一個、反方、一頁',href:'week.html?week=5#card'};
 const p=week5Progress(normalizeWeek5(w5.data||{}));
 if(p.done)return {week:5,state:'done',label:'比較頁完成',detail:'',next:'',href:'week.html?week=5#card'};
 return {week:5,state:'partial',label:'做了一部分',detail:'還差：'+p.missing.join('、'),next:'回 Week 5 補'+p.missing[0],href:'week.html?week=5#card'};
}
export function studentProgress({week1=null,week2=null,week3=null,week4=null,week5=null}={}){
 const weeks=[progressWeek1(week1),progressWeek2(week2),progressWeek3(week3),progressWeek4(week4),progressWeek5(week5)];
 const todo=weeks.filter(w=>w.state!=='done');
 return {rules:PROGRESS_RULES,weeks,doneCount:weeks.length-todo.length,next:todo[0]?`Week ${todo[0].week}：${todo[0].next}`:'到 Week 5 為止都做完了'};
}
