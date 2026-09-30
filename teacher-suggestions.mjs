// Startup Journey Lab — 教師回饋建議（純函式，不呼叫 AI）
//
// 為什麼用規則而不是再叫一次模型：
// 每個學生的五個維度分數與理由已經存在 week1_ai_feedback，「這個學生缺什麼」是查詢不是生成。
// 而且模型會很有自信地描述不存在的東西（2026-09-30 實測：對一張沒有行動句的卡寫出
// 「有行動動詞，但缺少具體的對象和時間」）。同一個模型去起草要送到學生面前的話，
// 同樣會發生。規則版零成本、零延遲、不會編造，而且老師只要審過範本一次。
//
// 範本文字集中在 TEMPLATES，要改語氣直接改這裡即可。

export const DIMENSIONS = [
  'problem_specificity',
  'affected_user_clarity',
  'fact_quality',
  'fact_assumption_separation',
  'next_validation_step',
];

// 與 ai-feedback 的行動閘門同一份判斷；兩邊若分歧，學生會收到互相矛盾的話。
export const ACTION_PATTERN = new RegExp(
  ['問(?!卷)', '訪談', '去訪', '觀察', '記錄', '紀錄', '計時', '調查', '統計',
   '做問卷', '發問卷', '設計問卷', '問卷調查', '實際去', '親自去', '去看看', '測量', '數一數', '聊'].join('|'),
);

const TIME_PATTERN = /星期[一二三四五六日天]|週[一二三四五六日]|[上中下]午|早上|晚上|\d{1,2}\s*[點時]|\d{1,2}\/\d{1,2}|\d{1,2}\s*月|每[天日週週末]|昨天|今天|上次/;
// 地點詞刻意收得寬：寧可放過（不提醒缺地點），也不要對一個明明寫了地點的學生
// 說「你缺地點」。學餐、系館這類校園簡稱一定要收，第一版漏了「學餐」就誤判過。
const PLACE_PATTERN = /學餐|餐廳|食堂|教室|校門|宿舍|圖書館|系館|門口|路口|櫃檯|球場|操場|走廊|辦公室|超商|便利商店|停車場|廁所|電梯|[^，。\s]{1,6}(?:餐|館|廳|室|場|店|樓|口|區|站|舍)|在[^，。]{1,10}/;

export const SHORT_FIELD_LIMIT = 6;
export const SHORT_FIELD_COUNT = 3;

export const TEMPLATES = {
  not_submitted: '你的卡片還是草稿。這週先交出來，不完整沒關係，交了我才看得到你卡在哪。',
  no_ai: '你的卡已經交了，但還沒按過「取得 AI 學習建議」。按一次，它會指出哪一欄的證據還不夠。',
  problem_time: '你的觀察還缺時間。補一句：這件事上一次是什麼時候發生的？',
  problem_place: '你的觀察還缺地點。補一句：這件事發生在哪裡？',
  problem_event: '你寫的是一個現象，不是一次事件。挑你親眼看到的那一次，寫下當時發生了什麼。',
  affected_user: '「大家」和「同學」太廣了。想一個你認識的具體的人，他為什麼會遇到這件事？',
  fact_quality: '「目前知道的事實」那一欄寫的是推測。只留你親眼看到或查得到的，其他搬到假設欄。',
  separation: '事實欄和假設欄寫的是同一件事。事實欄只留你看到的，假設欄寫你還不確定的。',
  next_step: '其他欄位都有了，就差下一步。在「仍待驗證的假設」那一欄補一句：你要問誰、問什麼。',
  no_gap: '',
  short_suffix: '有幾欄只寫了幾個字。不用寫長，但要寫到別人看得懂你看到了什麼。',
};

export const CATEGORY_LABELS = {
  not_submitted: '還沒提交',
  no_ai: '交了但沒按過 AI',
  problem_time: '問題不夠具體（缺時間）',
  problem_place: '問題不夠具體（缺地點）',
  problem_event: '問題不夠具體（寫成現象）',
  affected_user: '受影響對象太籠統',
  fact_quality: '事實品質不足',
  separation: '事實與假設混在一起',
  next_step: '只缺下一步行動',
  no_gap: '沒有明顯缺口',
};

function text(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/** 六個欄位裡有幾欄短到看不出內容。 */
export function shortFieldCount(submission) {
  const keys = ['observed_problem', 'affected_user', 'known_fact', 'unverified_assumption', 'expected_learning', 'concern'];
  return keys.filter((k) => {
    const v = text(submission && submission[k]);
    return v.length > 0 && v.length <= SHORT_FIELD_LIMIT;
  }).length;
}

/**
 * 問題不夠具體時，再判斷缺的是時間、地點還是事件。
 * 班上 37 人有 17 人落在這一類 —— 若都收到同一句話，學生一對照就會發現，
 * 老師的回饋會整批貶值。用規則細分，至少分成三種而且都指到真正缺的東西。
 */
export function problemGap(submission) {
  const blob = `${text(submission.observed_problem)} ${text(submission.observed_context)} ${text(submission.verbatim_complaint)}`;
  if (!TIME_PATTERN.test(blob)) return 'problem_time';
  if (!PLACE_PATTERN.test(blob)) return 'problem_place';
  return 'problem_event';
}

/**
 * 依因果順序找第一個弱項：問題講清楚了，後面幾欄才有東西可寫。
 * 回傳 null 代表沒有機械式的缺口 —— 那種學生需要的是老師的判斷，不是範本。
 */
export function classify(submission, feedback) {
  if (!submission || submission.status !== 'submitted') return 'not_submitted';
  const readiness = feedback && feedback.readiness;
  if (!readiness) return 'no_ai';
  const score = (key) => {
    const item = readiness[key];
    return item && typeof item.score === 'number' ? item.score : null;
  };
  if (score('problem_specificity') <= 1) return problemGap(submission);
  if (score('affected_user_clarity') <= 1) return 'affected_user';
  if (score('fact_quality') <= 1) return 'fact_quality';
  if (score('fact_assumption_separation') <= 1) return 'separation';
  if (!ACTION_PATTERN.test(text(submission.unverified_assumption))) return 'next_step';
  return 'no_gap';
}

/** 證據摘要：直接讀已存的分數，不生成任何文字。 */
export function evidenceSummary(feedback) {
  const readiness = feedback && feedback.readiness;
  if (!readiness) return { total: null, rows: [] };
  const labels = {
    problem_specificity: '問題具體度',
    affected_user_clarity: '受影響對象',
    fact_quality: '事實品質',
    fact_assumption_separation: '事實與假設分開',
    next_validation_step: '下一步驗證',
  };
  return {
    total: typeof readiness.total_readiness === 'number' ? readiness.total_readiness : null,
    rows: DIMENSIONS.map((key) => ({
      key,
      label: labels[key],
      score: readiness[key] ? readiness[key].score : null,
      reason: readiness[key] ? readiness[key].reason : '',
    })),
  };
}

/**
 * 給老師的建議稿。no_gap 一律回空字串 —— 沒有機械式缺口的學生，
 * 需要的是老師自己的一句話，硬塞範本只會稀釋所有回饋的份量。
 */
export function suggest(submission, feedback) {
  const category = classify(submission, feedback);
  let body = TEMPLATES[category] || '';
  if (body && shortFieldCount(submission) >= SHORT_FIELD_COUNT) {
    body = `${body}\n${TEMPLATES.short_suffix}`;
  }
  return {
    category,
    label: CATEGORY_LABELS[category] || category,
    text: body,
    needsOwnWords: category === 'no_gap',
    evidence: evidenceSummary(feedback),
  };
}

/** 同一句話會送給幾個人 —— 超過一人就該提醒老師改幾句。 */
export function duplicateCount(drafts, body) {
  const target = text(body);
  if (!target) return 0;
  return drafts.filter((d) => text(d) === target).length;
}
