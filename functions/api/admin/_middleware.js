/* Every /api/admin/* route except login needs a valid admin session.
   Writes must also come from this site (the cookie is SameSite=Strict too). */
import { json, readSession } from '../../_shared/util.js';

export async function onRequest (ctx) {
  const url = new URL(ctx.request.url);
  if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
    const origin = ctx.request.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'Request came from another site.' }, 403);
  }
  if (url.pathname === '/api/admin/login') return ctx.next();
  const email = await readSession(ctx.request, ctx.env);
  if (!email) return json({ error: 'Not signed in.' }, 401);
  ctx.data.email = email;
  return ctx.next();
}
