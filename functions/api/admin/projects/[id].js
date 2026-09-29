/* Admin: update or delete one post. */
import { json, cleanProject } from '../../../_shared/util.js';

export async function onRequestPut ({ request, env, params }) {
  let input;
  try { input = await request.json(); } catch (err) { return json({ error: 'Invalid request.' }, 400); }
  const { value: p, error } = cleanProject(input);
  if (error) return json({ error }, 400);
  let res;
  try {
    res = await env.DB.prepare('UPDATE projects SET title=?,slug=?,discipline=?,summary=?,body=?,cover_path=?,gallery=?,published=?,project_date=? WHERE id=?')
      .bind(p.title, p.slug, p.discipline, p.summary, p.body, p.cover_path, JSON.stringify(p.gallery), p.published, p.project_date, params.id).run();
  } catch (err) {
    if (/UNIQUE/i.test(String(err))) return json({ error: 'Another project already uses that slug.' }, 409);
    throw err;
  }
  if (!res.meta || !res.meta.changes) return json({ error: 'Project not found.' }, 404);
  return json({ id: params.id });
}

export async function onRequestDelete ({ env, params }) {
  const res = await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(params.id).run();
  if (!res.meta || !res.meta.changes) return json({ error: 'Project not found.' }, 404);
  return json({ ok: true });
}
