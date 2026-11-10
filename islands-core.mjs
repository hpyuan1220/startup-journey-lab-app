// 群島尋寶的最小共用資料：前端（islands-data.mjs、team.js）與 Edge（week2-api）都用。
// 公司→島、島→方向；「設為我的代表」要靠這個驗證公司方向＝我認的方向。改公司名單時這裡要跟 islands-data.mjs 一起改（有測試比對）。
export const ISLAND_DIR={1:1,2:1,3:1,4:2,5:2,6:2,7:2,8:3,9:3,10:3};
export const COMPANY_ISLAND={ampersand:1,n8n:1,arcade:2,baselayer:2,natural:3,lovable:4,owner:5,palona:5,gorgias:6,respondio:6,clark:7,happyrobot:8,cargofy:8,sage:9,alloy:10};
export const COMPANY_NAME={ampersand:'Ampersand',n8n:'n8n',arcade:'Arcade',baselayer:'Baselayer',natural:'Natural',lovable:'Lovable',owner:'Owner',palona:'Palona',gorgias:'Gorgias',respondio:'Respond.io',clark:'Clark',happyrobot:'HappyRobot',cargofy:'Cargofy',sage:'Sage',alloy:'Alloy Robotics'};
export const companyDir=id=>ISLAND_DIR[COMPANY_ISLAND[String(id||'')]]||0;
// reps：{ "1":"ampersand", "2":"owner" }（方向→公司）。只留合法鍵與已知公司。
export function normalizeReps(v){const out={};if(!v||typeof v!=='object'||Array.isArray(v))return out;for(const [k,c] of Object.entries(v)){const d=Number(k);if(![1,2,3].includes(d))continue;const id=String(c||'').toLowerCase();if(companyDir(id)===d)out[d]=id;}return out;}
// 組的三格：每個方向由認領的人的 reps 填；回 {1:{student_id,company}|null,...}
export function teamReps(members){const out={1:null,2:null,3:null};for(const m of members||[]){const reps=normalizeReps(m.reps);for(const d of [1,2,3])if(reps[d]&&!out[d])out[d]={student_id:m.student_id,company:reps[d]};}return out;}
