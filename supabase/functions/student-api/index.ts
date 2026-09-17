// Deploy: supabase functions deploy student-api --no-verify-jwt
// This function keeps student records behind a short-lived opaque session token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((item) => item.toString(16).padStart(2, '0')).join('');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  const body = await request.json().catch(() => null);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!body) return reply({ error: '格式不正確。' }, 400);
  if (body.action === 'login') {
    const studentId = String(body.student_id || '').trim();
    const inviteCode = String(body.invite_code || '');
    const { data: classId } = await db.rpc('validate_class_invite', { p_invite_code: inviteCode });
    if (!studentId || !classId) return reply({ error: '學號或班級邀請碼不正確。' }, 401);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await db.from('student_sessions').upsert({ class_id: classId, student_id: studentId, token_hash: await hash(token), expires_at: new Date(Date.now() + 1209600000).toISOString() }, { onConflict: 'class_id,student_id' });
    return reply({ token, class_id: classId, student_id: studentId });
  }
  const token = String(body.token || '');
  const { data: session } = await db.from('student_sessions').select('class_id,student_id,expires_at').eq('token_hash', await hash(token)).maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return reply({ error: '工作階段已過期，請重新進入。' }, 401);
  if (body.action === 'load') {
    const { data } = await db.from('week1_submissions').select('*').eq('class_id', session.class_id).eq('student_id', session.student_id).maybeSingle();
    return reply({ submission: data || null });
  }
  if (body.action === 'save') {
    const fields = body.submission || {};
    const submission = { ...fields, class_id: session.class_id, student_id: session.student_id, updated_at: new Date().toISOString() };
    if (submission.status === 'submitted') submission.submitted_at = new Date().toISOString();
    const { data, error } = await db.from('week1_submissions').upsert(submission, { onConflict: 'class_id,student_id' }).select().single();
    return error ? reply({ error: '儲存失敗。' }, 500) : reply({ submission: data });
  }
  return reply({ error: '未知操作。' }, 400);
});
