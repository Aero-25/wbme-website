/* POST /api/enquiry: saves an enquiry taken down by the assistant's offline
   mode (used when the AI is unavailable). Same storage and validation as the
   AI's save_enquiry tool; same-origin and rate limited. */
import { json } from '../_shared/util.js';
import { checkRate, cleanEnquiry, saveEnquiry, cleanSid, sameOrigin } from '../_shared/assistant-store.js';
import { PAGE_LABEL } from '../_shared/assistant-knowledge.js';

export async function onRequestPost ({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  let body;
  try { body = await request.json(); } catch (err) { return json({ error: 'Invalid request.' }, 400); }
  const { value, error } = cleanEnquiry(body);
  if (error) return json({ error }, 400);
  try {
    const limit = await checkRate(request, env, { bucket: 'enq', burst: 8, daily: 30 });
    if (!limit.ok) return json({ error: 'Too many enquiries from this connection today. Please call or email the workshop.' }, 429);
    const saved = await saveEnquiry(env, value, {
      sid: cleanSid(body.sid),
      page: PAGE_LABEL[body.page] ? body.page : '',
      source: 'assistant-offline',
      transcript: Array.isArray(body.transcript) ? body.transcript : []
    });
    return json({ ref: saved.ref, updated: !!saved.updated }, 201);
  } catch (err) {
    console.error('enquiry: save failed', err);
    return json({ error: 'Could not save right now.' }, 500);
  }
}
