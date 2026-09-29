/* Shared helpers for the WBME Pages Functions: JSON responses, admin
   sessions (HMAC-signed cookie) and password checks (PBKDF2).

   Required Pages settings (Settings -> Variables and Secrets / Bindings):
     DB              D1 database "wbme"
     MEDIA           R2 bucket "wbme-media"
     SESSION_SECRET  secret, long random string (signs admin cookies)
     ADMIN_USERS     secret, JSON {"username": "pbkdf2$<iter>$<salt>$<hash>"}
                     (usernames are lowercase; an email works as a username too)
                     (generate entries with scripts/hash-password.mjs) */

const enc = new TextEncoder();
const COOKIE = 'wbme_admin';
const SESSION_HOURS = 12;

export function json (data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

function b64u (bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64u (s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function sameBytes (a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacKey (secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSessionCookie (env, email) {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
  const payload = b64u(enc.encode(JSON.stringify({ e: email, x: Date.now() + SESSION_HOURS * 3600e3 })));
  const sig = b64u(await crypto.subtle.sign('HMAC', await hmacKey(env.SESSION_SECRET), enc.encode(payload)));
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie () {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* Returns the signed-in admin's email, or null. */
export async function readSession (request, env) {
  if (!env.SESSION_SECRET) return null;
  const raw = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.SESSION_SECRET), fromB64u(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64u(payload)));
    if (!data.e || !(data.x > Date.now())) return null;
    return data.e;
  } catch (err) {
    return null;
  }
}

async function pbkdf2 (password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

/* Constant-ish time: unknown emails still pay for a PBKDF2 round. */
export async function checkPassword (env, email, password) {
  let users = {};
  try { users = JSON.parse(env.ADMIN_USERS || '{}'); } catch (err) { users = {}; }
  const record = users[String(email || '').trim().toLowerCase()];
  const [alg, iter, salt, hash] = (record || 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$').split('$');
  const derived = await pbkdf2(String(password || ''), fromB64u(salt), Number(iter) || 100000);
  return !!record && alg === 'pbkdf2' && sameBytes(derived, fromB64u(hash));
}

/* ---- projects ---- */
export function toProject (row) {
  let gallery = [];
  try { gallery = JSON.parse(row.gallery || '[]'); } catch (err) { gallery = []; }
  return { ...row, gallery, published: !!row.published };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* Validates an admin-submitted project; returns { value } or { error }. */
export function cleanProject (input) {
  const p = input || {};
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const out = {
    title: str(p.title, 160),
    slug: str(p.slug, 120).toLowerCase(),
    discipline: str(p.discipline, 60) || 'General',
    summary: str(p.summary, 600),
    body: str(p.body, 20000),
    cover_path: str(p.cover_path, 400),
    gallery: Array.isArray(p.gallery) ? p.gallery.map((g) => str(g, 400)).filter(Boolean).slice(0, 40) : [],
    published: p.published ? 1 : 0,
    project_date: str(p.project_date, 10)
  };
  if (!out.title) return { error: 'Title is required.' };
  if (!SLUG_RE.test(out.slug)) return { error: 'Slug may only use lowercase letters, numbers and dashes.' };
  if (!out.summary) return { error: 'Summary is required.' };
  if (!out.cover_path) return { error: 'A cover photo is required.' };
  if (!DATE_RE.test(out.project_date)) return { error: 'Project date must be a valid date.' };
  return { value: out };
}
