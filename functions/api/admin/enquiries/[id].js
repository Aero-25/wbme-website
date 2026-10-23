/* Admin: mark an enquiry handled / new again, or delete it. */
import { json } from '../../../_shared/util.js';
import { ensureTables } from '../../../_shared/assistant-store.js';

export async function onRequestPatch ({ request, env, params }) {
  let input;
  try { input = await request.json(); } catch (err) { return json({ error: 'Invalid request.' }, 400); }
  const status = input && input.status === 'handled' ? 'handled' : 'new';
  await ensureTables(env);
  const res = await env.DB.prepare("UPDATE enquiries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").bind(status, params.id).run();
  if (!res.meta || !res.meta.changes) return json({ error: 'Enquiry not found.' }, 404);
  return json({ ok: true, status });
}

export async function onRequestDelete ({ env, params }) {
  await ensureTables(env);
  const res = await env.DB.prepare('DELETE FROM enquiries WHERE id = ?').bind(params.id).run();
  if (!res.meta || !res.meta.changes) return json({ error: 'Enquiry not found.' }, 404);
  return json({ ok: true });
}
