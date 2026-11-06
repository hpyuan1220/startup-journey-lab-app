// Week 8 建組：共用規則（瀏覽器與 Edge Function 都用）。
// 組：3 人為主、最少 2 人、最多 3 人；一組一個產業線；三個方向各由一人認領（兩人組一人認兩個）。
// 11/27 13:00 前學生可自己建組／加入／離開／改產業／認方向；之後只有老師能改。老師也可以提前鎖住某一組或全部。
import {cardById} from './week4-core.mjs';
export const TEAM_MAX=3,TEAM_MIN=2;
export const TEAM_LOCK_AT='2026-11-27T13:00:00+08:00';
export const TEAM_LOCK_LABEL='11/27 13:00';
export const DIRECTIONS=[[1,'方向一｜Agent 經濟基礎設施','賣鏟子：協定、授權、監控、結算，賣給做 Agent 的公司'],[2,'方向二｜AI 原生服務','賣做完的結果：按件收費，搶的是老闆的人力預算'],[3,'方向三｜AI 進入實體世界','感測器進、派工出：讓現場的人與機器動起來']];
export const directionName=n=>(DIRECTIONS.find(d=>d[0]===Number(n))||[])[1]||'';
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 I／O／0／1
export function makeCode(rand=Math.random){let s='';for(let i=0;i<4;i++)s+=CODE_ALPHABET[Math.floor(rand()*CODE_ALPHABET.length)];return s;}
export const normalizeCode=s=>String(s||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
export const normalizeTeamName=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,30);
export function normalizeIndustry(input){const i=input&&typeof input==='object'?input:{};if(i.card==='custom')return {card:'custom',custom:String(i.custom||'').trim().slice(0,40)};const c=cardById(i.card);return c?{card:c.id,custom:''}:{card:null,custom:''};}
export const industryLabel=ind=>ind?.card==='custom'?(ind.custom||'（自填）'):(cardById(ind?.card)?.name||'');
export function normalizeDirections(arr){const out=[...new Set((Array.isArray(arr)?arr:[]).map(Number).filter(n=>[1,2,3].includes(n)))].sort();return out;}
/** 學生還能不能改：過了鎖定時間、或老師鎖了這一組，就不能 */
export function teamLocked(team,now=Date.now(),lockAt=TEAM_LOCK_AT){if(team?.locked)return true;const t=Date.parse(lockAt);return Number.isFinite(t)&&now>=t;}
/** 一組的狀態摘要：人數、產業、三個方向各由誰認、缺什麼 */
export function teamSummary(team,members){
 const ms=(members||[]).filter(m=>m.team_id===team.id);
 const claimed={1:[],2:[],3:[]};for(const m of ms)for(const d of normalizeDirections(m.directions))claimed[d].push(m.student_id);
 const missing=[];
 if(ms.length<TEAM_MIN)missing.push(`還差 ${TEAM_MIN-ms.length} 人（最少 ${TEAM_MIN} 人）`);
 if(!industryLabel(team.industry))missing.push('還沒選組的產業線');
 const unclaimed=[1,2,3].filter(d=>!claimed[d].length);if(unclaimed.length)missing.push(`還沒人認領：${unclaimed.map(directionName).join('、')}`);
 const noDir=ms.filter(m=>!normalizeDirections(m.directions).length).map(m=>m.student_id);if(noDir.length)missing.push(`還沒認方向：${noDir.join('、')}`);
 return {members:ms,count:ms.length,full:ms.length>=TEAM_MAX,claimed,missing,complete:!missing.length};
}
/** 組員 Week 4 選的產業線 → 這一組可以選的產業清單（去重；沒有就全部九張卡） */
export function industryOptions(members,week4ByStudent){
 const seen=new Map();
 for(const m of members||[]){const ind=week4ByStudent?.[m.student_id];if(!ind)continue;const key=ind.card==='custom'?'custom:'+(ind.custom||''):String(ind.card);const label=industryLabel(ind);if(!label)continue;if(!seen.has(key))seen.set(key,{...normalizeIndustry(ind),label,who:[]});seen.get(key).who.push(m.student_id);}
 return [...seen.values()];
}
