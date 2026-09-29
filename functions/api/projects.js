/* Public: published project posts, newest job first. ?slug= returns one. */
import { json, toProject } from '../_shared/util.js';

export async function onRequestGet ({ request, env }) {
  const slug = new URL(request.url).searchParams.get('slug');
  const stmt = slug
    ? env.DB.prepare('SELECT * FROM projects WHERE published = 1 AND slug = ?').bind(slug)
    : env.DB.prepare('SELECT * FROM projects WHERE published = 1 ORDER BY project_date DESC, created_at DESC');
  const { results } = await stmt.all();
  return json(results.map(toProject), 200, { 'cache-control': 'public, max-age=60' });
}
