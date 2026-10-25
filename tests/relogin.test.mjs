// 重新進入後要回哪一頁：只接受白名單，其他一律不跳（避免被帶去任意網址）。
import test from 'node:test';import assert from 'node:assert/strict';
import {returnTarget,RETURN_PAGES} from '../relogin.mjs';
import {week2StatusText} from '../prior-view.mjs';

test('returnTarget：week2／week3 回到該週的卡', ()=>{
 assert.equal(returnTarget('?return=week2'),'week.html?week=2#card');
 assert.equal(returnTarget('?return=week3'),'week.html?week=3#card');
});
test('returnTarget：沒有參數、亂填、原型鍵、外部網址都不跳', ()=>{
 for(const q of ['','?return=','?return=week9','?return=constructor','?return=__proto__','?return=toString','?return=https://evil.example','?return=//evil.example'])
  assert.equal(returnTarget(q),null,q);
 assert.equal(Object.keys(RETURN_PAGES).length,4);// week2、week3、week4、week5
});
test('week2StatusText：講清楚交了沒、老師怎麼說', ()=>{
 assert.equal(week2StatusText(null),'還沒開始');
 assert.equal(week2StatusText({status:'submitted',submitted_at:'x',review_status:'approved',version:2}),'已交 · 老師已確認 · 版本 2');
 assert.equal(week2StatusText({status:'draft',submitted_at:'x',review_status:'revision',version:5}),'交過，之後改成草稿 · 老師請你小幅修訂 · 版本 5');
 assert.equal(week2StatusText({status:'draft',review_status:'pending',version:1}),'草稿 · 老師還沒看 · 版本 1');
});
