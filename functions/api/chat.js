/* POST /api/chat: the website assistant's conversational brain.

   The page sends the conversation so far; the reply streams back as
   server-sent events so it appears as it is written:
     delta   {t}       a piece of reply text (may contain [[button]] markers)
     break   {}        the assistant finished one message and starts another
     reset   {}        discard the message in progress (it is being redone)
     enquiry {ref,...} an enquiry was saved; show the summary card
     error   {fallback} the model call failed; the page answers on its own
     done    {}
   If ANTHROPIC_API_KEY is not set, or limits are hit, it answers plain JSON
   {fallback: true, reason} (status 200, so browsers don't log an error) and
   js/chatbot.js uses its built-in offline replies.

   Settings (Pages -> Settings -> Variables and Secrets):
     ANTHROPIC_API_KEY  secret, required for AI replies
     CHAT_MODEL         optional, defaults to claude-opus-5-5
     CHAT_DAILY_LIMIT   optional, model calls per day across the site (default 800) */

import Anthropic from '@anthropic-ai/sdk';
import { json } from '../_shared/util.js';
import { SYSTEM_PROMPT, ENQUIRY_TOOL, PAGE_LABEL, contextBlock } from '../_shared/assistant-knowledge.js';
import { checkRate, cleanEnquiry, saveEnquiry, cleanSid, sameOrigin } from '../_shared/assistant-store.js';

const MAX_TURNS = 24;
const MAX_CHARS = 1500;
const MAX_TOTAL = 20000;
const REFUSAL = "Sorry, that one's not something I can help with here. If it's about a job, the team is on **+264 (0)64 285 700**.\n[[call]]";

function cleanConversation (raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-60)) {
    const role = m && (m.role === 'user' || m.role === 'assistant') ? m.role : null;
    const content = String((m && m.content) || '').trim().slice(0, MAX_CHARS);
    if (!role || !content) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += '\n\n' + content;
    else out.push({ role, content });
  }
  let convo = out.slice(-MAX_TURNS);
  while (convo.length && convo[0].role !== 'user') convo.shift();
  while (convo.reduce((n, m) => n + m.content.length, 0) > MAX_TOTAL && convo.length > 1) {
    convo.shift();
    while (convo.length && convo[0].role !== 'user') convo.shift();
  }
  if (!convo.length || convo[convo.length - 1].role !== 'user') return null;
  return convo;
}

/* Some older posts were saved with UTF-8 read as Latin-1 ("â€”" for "—"). */
function demojibake (s) {
  return String(s || '').replace(/â€”/g, '—').replace(/â€“/g, '–').replace(/â€™/g, '’').replace(/â€œ|â€\u009d|â€/g, '"');
}

let projectCache = { at: 0, rows: [] };
async function loadProjects (env) {
  if (!env.DB) return [];
  if (Date.now() - projectCache.at < 5 * 60e3) return projectCache.rows;
  try {
    const { results } = await env.DB.prepare(
      'SELECT title, slug, discipline, summary, body, project_date FROM projects WHERE published = 1 ORDER BY project_date DESC, created_at DESC LIMIT 12'
    ).all();
    const rows = (results || []).map((p) => ({ ...p, title: demojibake(p.title), summary: demojibake(p.summary), body: demojibake(p.body).slice(0, 420) }));
    projectCache = { at: Date.now(), rows };
  } catch (err) {
    console.error('assistant: could not load projects', err);
  }
  return projectCache.rows;
}

export async function onRequestPost (ctx) {
  const { request, env } = ctx;
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ fallback: true, reason: 'offline' });

  let body;
  try { body = await request.json(); } catch (err) { return json({ error: 'Invalid request.' }, 400); }
  const convo = cleanConversation(body && body.messages);
  if (!convo) return json({ error: 'Invalid conversation.' }, 400);
  const page = PAGE_LABEL[body.page] ? body.page : 'home';
  const sid = cleanSid(body.sid);

  try {
    const limit = await checkRate(request, env, { bucket: 'chat', burst: 40, daily: 300, siteDaily: Number(env.CHAT_DAILY_LIMIT) || 800 });
    if (!limit.ok) return json({ fallback: true, reason: 'busy' });
  } catch (err) {
    console.error('assistant: rate check failed', err);
  }

  const projects = await loadProjects(env);
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 1, timeout: 60e3 });
  const params = {
    model: env.CHAT_MODEL || 'claude-opus-5-5',
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    tools: [ENQUIRY_TOOL],
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: contextBlock({ page, projects, now: new Date() }) }
    ]
  };

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const send = (event, data) => writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => {});

  const work = (async () => {
    let sentText = false;
    try {
      let messages = convo.slice();
      for (let round = 0, badJson = 0; round < 4; round++) {
        const stream = client.beta.messages.stream({ ...params, messages });
        let msg;
        try {
          for await (const ev of stream) {
            if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) {
              sentText = true;
              await send('delta', { t: ev.delta.text });
            }
          }
          msg = await stream.finalMessage();
        } catch (err) {
          /* A tool input that isn't valid JSON (possible with eager input
             streaming) fails here; API errors are real failures. */
          if (err instanceof Anthropic.APIError || ++badJson > 1) throw err;
          await send('reset', {});
          round--;
          continue;
        }
        logUsage(msg);
        if (msg.stop_reason === 'refusal') {
          if (sentText) await send('break', {});
          await send('delta', { t: REFUSAL });
          return;
        }
        const uses = msg.content.filter((b) => b.type === 'tool_use');
        if (msg.stop_reason !== 'tool_use' || !uses.length) return;

        const results = [];
        for (const use of uses) results.push(await runTool(use, { env, sid, page, convo, send }));
        messages = messages.concat([{ role: 'assistant', content: msg.content }, { role: 'user', content: results }]);
        if (sentText) await send('break', {});
      }
    } catch (err) {
      console.error('assistant: model call failed', err && (err.status || ''), err && err.message);
      await send('error', { fallback: !sentText });
    } finally {
      await send('done', {});
      await writer.close().catch(() => {});
    }
  })();
  ctx.waitUntil(work);

  return new Response(readable, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  });
}

async function runTool (use, { env, sid, page, convo, send }) {
  const reply = (content, isError) => ({ type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(content), ...(isError ? { is_error: true } : {}) });
  if (use.name !== ENQUIRY_TOOL.name) return reply({ error: 'Unknown tool.' }, true);
  const { value, error } = cleanEnquiry(use.input);
  if (error) return reply({ error }, true);
  try {
    const saved = await saveEnquiry(env, value, { sid, page, source: 'assistant', transcript: convo, updateRef: use.input && use.input.updates_ref });
    await send('enquiry', { ref: saved.ref, updated: !!saved.updated, ...value });
    return reply({
      saved: true,
      ref: saved.ref,
      updated: !!saved.updated,
      note: 'A summary card with an "Email this to WBME" button and a call button is now showing under your message.'
    });
  } catch (err) {
    console.error('assistant: could not save enquiry', err);
    return reply({ error: 'Saving failed. Apologise, and ask the visitor to call +264 (0)64 285 700 or email info@wbme.com.na instead.' }, true);
  }
}

function logUsage (msg) {
  const u = msg.usage || {};
  console.log(JSON.stringify({
    assistant: 'turn', model: msg.model, stop: msg.stop_reason,
    in: u.input_tokens, out: u.output_tokens, cache_read: u.cache_read_input_tokens, cache_write: u.cache_creation_input_tokens
  }));
}
