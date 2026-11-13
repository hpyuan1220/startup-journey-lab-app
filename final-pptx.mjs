// 期末六頁 PPT 初稿（選配）：把 compare-core.buildFramework 的六頁＋每人講稿變成 .pptx（講稿放在備忘稿）。
// 純前端：按下去才載 PptxGenJS（jsdelivr，備用 cdnjs），沒網路或擋掉就提示改用「複製整份框架」貼進投影片。
// buildDeckSpec 是純函式（可測）；makePptx 只負責把 spec 餵給 PptxGenJS。
const LIBS=['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js','https://cdnjs.cloudflare.com/ajax/libs/PptxGenJS/3.12.0/pptxgen.bundle.min.js'];
export function buildDeckSpec(f,team,members,names){
 const nm=id=>names?.[id]||id;
 const people=(members||[]).map(m=>nm(m.student_id)).filter(Boolean);
 const slides=[{kind:'cover',title:`${f.name}`,sub:`${team?.name||''}｜為什麼它是好新創`,lines:[people.join('、'),'Startup Journey Lab · 期末 6 分鐘'],notes:'第 0 頁不用講：上台直接從第 1 頁開始。'}];
 for(const p of f.pages){
  const speaker=String(p.speaker||'').split('、').filter(Boolean).map(nm).join('、');
  const lines=String(p.body||'').split('\n').map(s=>s.trim()).filter(Boolean);
  slides.push({kind:'page',n:p.n,title:`${p.n}｜${p.title}`,lines,footer:`講：${speaker||'（還沒分到）'} · 60 秒`,notes:`【第 ${p.n} 頁 ${p.title}｜60 秒】\n${p.body}\n\n（改成自己的話；每個數字標來源。）`});
 }
 return {file:`${(team?.name||'期末').replace(/[\\/:*?"<>|]/g,'')}_${f.name}_六頁初稿.pptx`,slides};
}
function loadLib(){
 if(window.PptxGenJS)return Promise.resolve(window.PptxGenJS);
 return LIBS.reduce((p,src)=>p.catch(()=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>window.PptxGenJS?res(window.PptxGenJS):rej(Error('lib'));s.onerror=()=>rej(Error('lib'));document.head.append(s);})),Promise.reject(Error('start')));
}
export async function makePptx(spec){
 const Pptx=await loadLib();
 const pptx=new Pptx();pptx.layout='LAYOUT_16x9';
 const FONT='Microsoft JhengHei';
 for(const s of spec.slides){
  const sl=pptx.addSlide();sl.background={color:'FFFFFF'};
  if(s.kind==='cover'){
   sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:10,h:5.625,fill:{color:'1F3B4D'}});
   sl.addText(s.title,{x:0.6,y:1.4,w:8.8,h:1.2,fontFace:FONT,fontSize:40,bold:true,color:'FFFFFF'});
   sl.addText(s.sub,{x:0.6,y:2.6,w:8.8,h:0.6,fontFace:FONT,fontSize:20,color:'CDE3EE'});
   sl.addText(s.lines.join('\n'),{x:0.6,y:3.5,w:8.8,h:1.2,fontFace:FONT,fontSize:16,color:'FFFFFF',valign:'top'});
  }else{
   sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:10,h:0.9,fill:{color:'1F3B4D'}});
   sl.addText(s.title,{x:0.5,y:0.1,w:9,h:0.7,fontFace:FONT,fontSize:24,bold:true,color:'FFFFFF',valign:'middle'});
   sl.addText(s.lines.map(t=>({text:t,options:{bullet:true,breakLine:true}})),{x:0.5,y:1.1,w:9,h:3.7,fontFace:FONT,fontSize:16,color:'222222',valign:'top',paraSpaceAfter:6});
   sl.addText(s.footer,{x:0.5,y:4.95,w:9,h:0.4,fontFace:FONT,fontSize:12,color:'6E7A72',align:'right'});
  }
  if(s.notes)sl.addNotes(s.notes);
 }
 const blob=await pptx.write({outputType:'blob'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=spec.file;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
 return spec.file;
}
