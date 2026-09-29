import { json, checkPassword, createSessionCookie } from '../../_shared/util.js';

export async function onRequestPost ({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch (err) { body = {}; }
  const email = String(body.username || body.email || '').trim().toLowerCase();
  const ok = await checkPassword(env, email, body.password);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // slows down password guessing
    return json({ error: 'Username or password is incorrect.' }, 401);
  }
  return json({ email }, 200, { 'set-cookie': await createSessionCookie(env, email) });
}
