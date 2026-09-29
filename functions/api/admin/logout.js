import { json, clearSessionCookie } from '../../_shared/util.js';

export async function onRequestPost () {
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
