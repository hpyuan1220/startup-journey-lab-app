// 學生登入失效時的「重新進入」。
// 起因（2026-10-16 重現）：同一學號在第二台裝置登入，第一台的登入立刻作廢（一人只留一組）；登入 14 天也會過期。
// 舊畫面：Week 3 只剩一行小字「登入已過期」，下面預習區還寫「先填 Week 2 痛點卡」；
// Week 2 顯示「可按重新載入」，但重新載入永遠卡在同一個畫面。學生因此以為作業不見了。
// 這裡：講清楚資料都在，給一顆按了就能走的按鈕；清掉作廢的登入，登入後自動回到原本那一週。

export const RETURN_PAGES={week2:'week.html?week=2#card',week3:'week.html?week=3#card'};

/** 學生入口登入成功後要去哪裡；只接受白名單，不接受任意網址。 */
export function returnTarget(search){
 const key=new URLSearchParams(search||'').get('return');
 return Object.prototype.hasOwnProperty.call(RETURN_PAGES,key)?RETURN_PAGES[key]:null;
}

/** 畫一張「重新進入」卡；week 是 'week2' 或 'week3'。回傳那張卡。 */
export function showRelogin(container,week,before=null){
 const box=document.createElement('section');box.className='video-learning-card relogin-card';box.setAttribute('role','alert');
 const h=document.createElement('h2');h.textContent='請重新進入一次（你的資料都在）';box.append(h);
 const p=document.createElement('p');
 p.textContent='你的登入已經失效：可能是在另一台手機或電腦登入過，或是太久沒有進來。作業都存在雲端，沒有不見。按下面的按鈕，用學號和班級邀請碼再進入一次，就會自動回到這一頁。';
 box.append(p);
 const a=document.createElement('a');a.className='primary-link relogin-go';a.textContent='重新進入 →';
 a.href=`index.html?return=${encodeURIComponent(week)}#student`;
 // 作廢的登入留著的話，學生入口會先用它試一次再報錯；先清掉，入口直接顯示登入格。
 a.addEventListener('click',()=>{try{localStorage.removeItem('sjl-student-session');}catch{}});
 box.append(a);
 if(before&&before.parentNode===container)container.insertBefore(box,before);else container.prepend(box);
 try{box.scrollIntoView({block:'center'});a.focus({preventScroll:true});}catch{}
 return box;
}
