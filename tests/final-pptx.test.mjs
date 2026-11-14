import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDeckSpec} from '../final-pptx.mjs';
test('期末 PPT 初稿 spec：封面＋六頁、每頁講者與備忘稿、檔名安全',()=>{
 const f={name:'Owner',pages:[1,2,3,4,5,6].map(n=>({n,title:'T'+n,speaker:n<4?'S1':'S2、S3',body:`a${n}\n\nb${n}`})),scripts:{}};
 const spec=buildDeckSpec(f,{name:'比較/隊'},[{student_id:'S1'},{student_id:'S2'},{student_id:'S3'}],{S1:'甲',S2:'乙'});
 assert.equal(spec.slides.length,7);assert.equal(spec.slides[0].kind,'cover');assert.match(spec.slides[0].lines[0],/甲、乙、S3/);
 assert.equal(spec.slides[1].title,'1｜T1');assert.deepEqual(spec.slides[1].lines,['a1','b1']);assert.equal(spec.slides[1].footer,'講：甲 · 約 90 秒');
 assert.equal(spec.slides[4].footer,'講：乙、S3 · 約 90 秒');assert.match(spec.slides[4].notes,/第 4 頁 T4/);
 assert.equal(spec.file,'比較隊_Owner_六頁初稿.pptx');
});
