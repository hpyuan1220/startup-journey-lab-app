// Startup Journey Lab — Week 1 AI 學習建議
// 部署：supabase functions deploy ai-feedback --no-verify-jwt
// 必要 Secrets：OPENAI_API_KEY（可選：OPENAI_MODEL、AI_FEEDBACK_DAILY_LIMIT）
// 模型金鑰只存在 Supabase Function Secrets，永遠不會出現在前端。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  FEEDBACK_SCHEMA,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  WEEK_NUMBER,
  buildUserContent,
  checkFields,
  hashSource,
  validateFeedback,
} from './validate.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

const sha256 = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

// 一般執行日誌只留操作代碼，不含姓名、學號、權杖或學生原文。
const log = (event: string, detail: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ event, ...detail }));

const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
const DAILY_LIMIT = Number(Deno.env.get('AI_FEEDBACK_DAILY_LIMIT') || '12');
const TIMEOUT_MS = 25000;

type OpenAiOutcome = { ok: true; parsed: unknown } | { ok: false; reason: string };

async function callModel(userContent: string, apiKey: string, minimal = false): Promise<OpenAiOutcome> {
  const payload: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'week1_feedback', strict: true, schema: FEEDBACK_SCHEMA },
    },
  };
  if (!minimal) {
    payload.temperature = 0.2;
    payload.max_completion_tokens = 1200;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = body?.error?.message || `http-${res.status}`;
      // 某些模型不接受 temperature 或 max_completion_tokens，去掉後再試一次。
      if (res.status === 400 && !minimal) return { ok: false, reason: 'retry-minimal' };
      return { ok: false, reason };
    }
    const text = body?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return { ok: false, reason: 'empty-content' };
    try {
      return { ok: true, parsed: JSON.parse(text) };
    } catch {
      return { ok: false, reason: 'bad-json' };
    }
  } catch (error) {
    return { ok: false, reason: (error as Error).name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return reply({ error: '不支援的請求方式。' }, 405);

  const body = await request.json().catch(() => null);
  if (!body) return reply({ error: '格式不正確。' }, 400);

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 只接受已通過學生 session token 驗證的請求。
  const token = String(body.token || '');
  if (token.length < 20) return reply({ error: '工作階段已過期，請重新進入。' }, 401);
  const { data: session } = await db
    .from('student_sessions')
    .select('class_id,student_id,expires_at')
    .eq('token_hash', await sha256(token))
    .maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) {
    return reply({ error: '工作階段已過期，請重新進入。' }, 401);
  }

  const scope = {
    class_id: session.class_id as string,
    student_id: session.student_id as string,
    week_number: WEEK_NUMBER,
  };

  const latest = async () => {
    const { data } = await db
      .from('week1_ai_feedback')
      .select('feedback_json,model_name,prompt_version,created_at,content_hash,teacher_hidden')
      .match(scope)
      .eq('teacher_hidden', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  };

  if (body.action === 'latest') {
    const row = await latest();
    return reply(row ? { feedback: row.feedback_json, cached: true, created_at: row.created_at, content_hash: row.content_hash } : { feedback: null });
  }

  if (body.action !== 'feedback') return reply({ error: '未知操作。' }, 400);

  // 伺服器端重新檢查欄位長度、必要欄位與輸入格式。
  const checked = checkFields(body.submission);
  if (!checked.ok) return reply({ error: checked.error }, 422);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    log('missing_secret');
    return reply({ error: '目前無法取得建議，你的內容仍已安全保存。' }, 503);
  }

  const contentHash = await sha256(hashSource(checked.fields, MODEL));

  // 相同內容直接讀取先前結果，不重複呼叫模型。
  const { data: cached } = await db
    .from('week1_ai_feedback')
    .select('feedback_json,created_at')
    .match({ ...scope, content_hash: contentHash })
    .maybeSingle();
  if (cached) {
    log('cache_hit');
    return reply({ feedback: cached.feedback_json, cached: true, created_at: cached.created_at, content_hash: contentHash });
  }

  // 每位學生每日呼叫次數上限。
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await db
    .from('week1_ai_feedback')
    .select('id', { count: 'exact', head: true })
    .match(scope)
    .gte('created_at', since);
  if ((count || 0) >= DAILY_LIMIT) {
    log('rate_limited');
    return reply({ error: `今天已取得 ${DAILY_LIMIT} 次建議，請明天再試，或先依現有建議修改內容。` }, 429);
  }

  const userContent = buildUserContent(checked.fields);
  let outcome = await callModel(userContent, apiKey);
  if (!outcome.ok && outcome.reason === 'retry-minimal') outcome = await callModel(userContent, apiKey, true);
  let validated = outcome.ok ? validateFeedback(outcome.parsed) : null;

  // 逾時、網路錯誤或格式不符時，單次重試。
  if (!validated || !validated.ok) {
    log('model_retry', { reason: outcome.ok ? (validated as { error: string }).error : outcome.reason });
    outcome = await callModel(userContent, apiKey, true);
    validated = outcome.ok ? validateFeedback(outcome.parsed) : null;
  }

  if (!validated || !validated.ok) {
    log('model_failed');
    // 回傳錯誤即可；學生的填寫內容仍由 student-api 獨立保存，不受影響。
    return reply({ error: '目前無法取得建議，你的內容仍已安全保存。' }, 502);
  }

  const submissionUpdatedAt = typeof body.submission_updated_at === 'string' ? body.submission_updated_at : null;

  const { data: saved, error } = await db
    .from('week1_ai_feedback')
    .upsert(
      {
        ...scope,
        content_hash: contentHash,
        submission_updated_at: submissionUpdatedAt,
        feedback_json: validated.feedback,
        model_name: MODEL,
        prompt_version: PROMPT_VERSION,
        total_readiness: validated.total,
      },
      { onConflict: 'class_id,student_id,week_number,content_hash' },
    )
    .select('created_at')
    .single();

  if (error) {
    log('save_failed');
    // 即使沒存進資料庫，仍把這次建議回傳給學生。
    return reply({ feedback: validated.feedback, cached: false, stored: false, content_hash: contentHash });
  }

  log('feedback_created', { corrected_total: validated.corrected, total: validated.total });
  return reply({
    feedback: validated.feedback,
    cached: false,
    stored: true,
    created_at: saved.created_at,
    content_hash: contentHash,
  });
});
