// 課前預習的互動區：影片下方「做三題」＋（Week 3）「寫下你要問的第一個問題」。
// 三題只在畫面上給解釋、不計分、可以重選；存進卡的只有「選了什麼」和那一句問題，老師端看得到誰做了預習。
// 沒登入也能做三題；要存問題才需要先進班級。
import {PRECLASS_QUIZ} from './week3-core.mjs?v=20261025-w5';

const el=(tag,text,parent)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(parent)parent.append(e);return e;};

/**
 * mountPreclass(container, week, opts)
 *  opts.initial   已存的 preclass（{question, answers}）
 *  opts.canSave   能不能存（有登入且有 Week 2 卡）
 *  opts.onSave    async (preclass) => void；沒有就不顯示問題框
 *  opts.loginHref 沒登入時導去哪
 */
export function mountPreclass(container,week,opts={}){
 if(!container)return null;
 const quiz=PRECLASS_QUIZ[week];if(!quiz)return null;
 const old=container.querySelector('.preclass-quiz');if(old)old.remove();
 const box=el('section','',container);box.className='preclass-quiz';
 el('h3',quiz.title,box);
 el('p','選一個就會看到解釋，選錯可以重選。這不算成績，是幫你檢查有沒有看懂。',box).className='preclass-hint';
 const answers=[...(opts.initial?.answers||['','',''])];
 const items=quiz.items.map((item,i)=>{
  const fs=el('fieldset','',box);fs.className='preclass-item';fs.dataset.index=String(i);
  el('legend',`${i+1}. ${item.q}`,fs);
  const why=el('p','',fs);why.className='preclass-why';why.hidden=true;
  const radios=[];
  for(const [v,label] of quiz.options){
   const l=el('label','',fs);const r=el('input','',l);r.type='radio';r.name=`preclass-${week}-${i}`;r.value=v;l.append(document.createTextNode(' '+label));radios.push(r);
   r.addEventListener('change',()=>{answers[i]=v;const ok=v===item.answer;why.hidden=false;why.textContent=(ok?'對。':'再想一下。')+item.why;why.dataset.state=ok?'right':'wrong';fs.dataset.state=why.dataset.state;refreshSummary();});
  }
  fs.append(why);
  if(answers[i]){const r=radios.find(x=>x.value===answers[i]);if(r){r.checked=true;const ok=answers[i]===item.answer;why.hidden=false;why.textContent=(ok?'對。':'再想一下。')+item.why;why.dataset.state=ok?'right':'wrong';fs.dataset.state=why.dataset.state;}}
  return {fs,radios,item};
 });
 const summary=el('p','',box);summary.className='preclass-summary';
 function refreshSummary(){const n=answers.filter(Boolean).length;const right=items.filter((it,i)=>answers[i]===it.item.answer).length;summary.textContent=n<3?`還有 ${3-n} 題`:right===3?'三題都對，去問人吧。':`${right}/3 對；錯的那題再看一次解釋，影片裡那一段也可以回去看。`;}
 refreshSummary();

 let question=null,save=null,msg=null;
 if(opts.onSave){
  const wrap=el('label','',box);wrap.className='preclass-question';
  el('span',week===3?'寫下你這週要問受訪者的第一個問題（會存進你的訪談卡，老師看得到）':'寫下你看完影片最想先改的那一格，以及要改成什麼',wrap);
  question=el('textarea','',wrap);question.maxLength=300;question.placeholder=week===3?'例：上次你排隊排最久那次，後來怎麼辦？':'例：「受到影響的人」要從「學生」改成「午休只有一小時的大二生」';
  question.value=opts.initial?.question||'';
  const bar=el('div','',box);bar.className='workspace-actions preclass-actions';
  save=el('button','存進我的卡',bar);save.type='button';save.className='primary-action';
  msg=el('p','',bar);msg.className='message preclass-msg';
  if(!opts.canSave){save.disabled=true;msg.textContent=opts.loginHref?'三題不用登入就能做；要存問題請先進入班級。':'先填 Week 2 痛點卡，才有訪談卡可以存。';if(opts.loginHref){const a=el('a','前往學生入口 →',msg);a.href=opts.loginHref;}}
  save.addEventListener('click',async()=>{
   const q=question.value.trim();
   if(q.length<6){msg.textContent='至少寫一句完整的問題（6 個字以上）。';question.focus();return;}
   if(/(會不會|是不是|你同意|願不願意|想不想|如果有)/.test(q)&&week===3){msg.textContent='這句像是非題或假設題。改問上一次發生的事：「上次……的時候，後來怎麼辦？」改好再存。';question.focus();return;}
   save.disabled=true;msg.textContent='儲存中…';
   try{await opts.onSave({question:q,answers:[...answers],done_at:new Date().toISOString()});msg.textContent='存進去了。週四帶著這句去問。';}
   catch(e){msg.textContent='沒有存進去：'+(e.message||'')+' 你打的字還在，再按一次。';}
   finally{save.disabled=!opts.canSave;}
  });
 }
 return {box,answers:()=>[...answers],question:()=>question?question.value.trim():''};
}
