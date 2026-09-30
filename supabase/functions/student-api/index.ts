// Production route is case-sensitive: Student-api. Deploy this source to that existing route.
// This function keeps student records behind a short-lived opaque session token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((item) => item.toString(16).padStart(2, '0')).join('');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if(request.method!=='POST')return reply({error:'請使用 POST。'},405);
  const raw=await request.text();if(raw.length>20000)return reply({error:'資料過長。'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'格式不正確。'},400);}
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!body) return reply({ error: '格式不正確。' }, 400);
  if (body.action === 'login') {
    // 學號一律去空白並轉大寫。先前是原樣接受：同一個人用 a111270229 和 A111270229
    // 登入會變成兩個不同的身分，各自一張卡。
    const studentId = String(body.student_id || '').trim().toUpperCase();
    const inviteCode = String(body.invite_code || '');
    if(!studentId||studentId.length>60||inviteCode.length>200)return reply({error:'學號或邀請碼格式不正確。'},422);
    const { data: classId } = await db.rpc('validate_class_invite', { p_invite_code: inviteCode });
    if (!studentId || !classId) return reply({ error: '學號或班級邀請碼不正確。' }, 401);
    // 打錯一個字就是另一個人。本班沒有這個學號的紀錄時先問一次，
    // 否則學生會進到一張全新的空白卡，以為自己的作業不見了。
    // 真的第一次進入的人按「是」再送一次即可，不會被擋住。
    if (body.confirm_new !== true) {
      const { data: known } = await db.from('week1_submissions')
        .select('student_id').eq('class_id', classId).eq('student_id', studentId).maybeSingle();
      if (!known) return reply({
        error: '本班沒有這個學號的紀錄。如果你之前填過，請檢查學號是否打錯。',
        unknown_student: true, student_id: studentId,
      }, 409);
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    const {error:sessionError}=await db.from('student_sessions').upsert({ class_id: classId, student_id: studentId, token_hash: await hash(token), expires_at: new Date(Date.now() + 1209600000).toISOString() }, { onConflict: 'class_id,student_id' });
    if(sessionError)return reply({error:'登入暫時無法完成，請稍後重試。'},503);
    return reply({ token, class_id: classId, student_id: studentId });
  }
  const token = String(body.token || '');
  const { data: session } = await db.from('student_sessions').select('class_id,student_id,expires_at').eq('token_hash', await hash(token)).maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return reply({ error: '工作階段已過期，請重新進入。' }, 401);
  if (body.action === 'load') {
    const { data,error } = await db.from('week1_submissions').select('*').eq('class_id', session.class_id).eq('student_id', session.student_id).maybeSingle();
    return error?reply({error:'資料暫時無法讀取，請稍後重試。'},503):reply({ submission: data || null });
  }
  if (body.action === 'save') {
    const allowed = ['student_name','team_preference','verbatim_complaint','observed_context','observed_problem','affected_user','known_fact','unverified_assumption','interview_next_question','expected_learning','concern'];
    const input = body.submission || {};
    const fields: Record<string, unknown> = {};
    for (const key of allowed) {
      if (typeof input[key] !== 'string' || input[key].length > 600) return reply({error:'欄位格式不正確或超過長度限制。'},422);
      fields[key] = input[key].trim();
    }
    if (!['draft','submitted'].includes(input.status)) return reply({error:'狀態不正確。'},422);
    // 已提交的卡不可退回草稿，也不可被空白覆蓋。
    // 先前只信任前端送來的 status：學生按一下「儲存草稿」就把 status 寫回 draft，
    // 之後前端「清除內容」的守門（savedStatus==='submitted'）失效，
    // reset() + save('draft') 會把 11 個必填欄位全部寫成空字串。
    // 這個不變量必須由伺服器守，前端守不住。
    const { data: current } = await db.from('week1_submissions')
      .select('status').eq('class_id', session.class_id).eq('student_id', session.student_id).maybeSingle();
    const locked = current?.status === 'submitted';
    if ((input.status === 'submitted' || locked) && allowed.some(key => !fields[key])) {
      return reply({error: locked
        ? '這份起點卡已經提交，必填欄位不能清空。請修改內容後重新提交。'
        : '請先補齊 Week 1 必填欄位。'},422);
    }
    fields.status = locked ? 'submitted' : input.status;
    fields.consent_to_share_in_class = input.consent_to_share_in_class === true;
    const submission = { ...fields, class_id: session.class_id, student_id: session.student_id, updated_at: new Date().toISOString() };
    if (submission.status === 'submitted') submission.submitted_at = new Date().toISOString();
    const { data, error } = await db.from('week1_submissions').upsert(submission, { onConflict: 'class_id,student_id' }).select().single();
    return error ? reply({ error: '儲存失敗。' }, 500) : reply({ submission: data });
  }
  return reply({ error: '未知操作。' }, 400);
});
