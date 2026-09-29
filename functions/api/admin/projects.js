/* Admin: every post (drafts included), and create. */
import { json, toProject, cleanProject } from '../../_shared/util.js';

export async function onRequestGet ({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY project_date DESC, created_at DESC').all();
  return json(results.map(toProject));
}

export async function onRequestPost ({ request, env }) {
  let input;
  try { input = await request.json(); } catch (err) { return json({ error: 'Invalid request.' }, 400); }
  const { value: p, error } = cleanProject(input);
  if (error) return json({ error }, 400);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare('INSERT INTO projects (id,title,slug,discipline,summary,body,cover_path,gallery,published,project_date) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(id, p.title, p.slug, p.discipline, p.summary, p.body, p.cover_path, JSON.stringify(p.gallery), p.published, p.project_date).run();
  } catch (err) {
    if (/UNIQUE/i.test(String(err))) return json({ error: 'Another project already uses that slug.' }, 409);
    throw err;
  }
  return json({ id }, 201);
}
