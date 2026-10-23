/* Admin: enquiries taken down by the website assistant, newest first. */
import { json } from '../../_shared/util.js';
import { ensureTables } from '../../_shared/assistant-store.js';

export async function onRequestGet ({ env }) {
  await ensureTables(env);
  const { results } = await env.DB.prepare(
    'SELECT id, ref, created_at, updated_at, status, source, name, company, phone, email, vessel, service, urgency, job, page, transcript FROM enquiries ORDER BY created_at DESC LIMIT 200'
  ).all();
  return json((results || []).map((r) => {
    let transcript = [];
    try { transcript = JSON.parse(r.transcript || '[]'); } catch (err) { transcript = []; }
    return { ...r, transcript };
  }));
}
