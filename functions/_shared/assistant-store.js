/* D1 storage for the website assistant: enquiries it takes down, and a small
   usage log for rate limiting. Tables are created on first use (same SQL as
   migrations/0002_assistant.sql), so no manual migration step is needed.
   The assistant itself runs entirely in the browser (js/chatbot.js); this is
   the only server side it has. */

export const SERVICE_NAMES = ['Ship repair', 'Rigging', 'Fitting & Turning', 'Boiler Making', 'Fabrication', 'Pipe Works', 'Welding', 'General'];
export const URGENCY = ['urgent', 'this week', 'planned', 'just asking'];
export const PAGES = ['home', 'about', 'services', 'projects', 'contact'];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS enquiries (
    id         TEXT PRIMARY KEY,
    ref        TEXT NOT NULL,
    sid        TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    status     TEXT NOT NULL DEFAULT 'new',
    source     TEXT NOT NULL DEFAULT 'assistant',
    name       TEXT NOT NULL,
    company    TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    vessel     TEXT NOT NULL DEFAULT '',
    service    TEXT NOT NULL DEFAULT 'General',
    urgency    TEXT NOT NULL DEFAULT 'planned',
    job        TEXT NOT NULL,
    page       TEXT NOT NULL DEFAULT '',
    transcript TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE INDEX IF NOT EXISTS enquiries_created ON enquiries (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS enquiries_sid ON enquiries (sid, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS chat_usage (k TEXT NOT NULL, ts INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS chat_usage_k_ts ON chat_usage (k, ts)`,
  `CREATE INDEX IF NOT EXISTS chat_usage_ts ON chat_usage (ts)`
];

/* One statement at a time (schema changes inside a D1 batch are unreliable),
   once per worker instance. */
let ready = null;
export function ensureTables (env) {
  if (!env.DB) return Promise.resolve(false);
  if (!ready) {
    ready = SCHEMA.reduce((p, sql) => p.then(() => env.DB.prepare(sql).run()), Promise.resolve())
      .then(() => true, (err) => { ready = null; throw err; });
  }
  return ready;
}

const enc = new TextEncoder();
async function visitorKey (request, env) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(ip + '|' + (env.SESSION_SECRET || 'wbme')));
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* Per visitor connection: `burst` requests per 10 minutes and `daily` per
   day; optional `siteDaily` across the whole site. Without a database (local
   dev) everything is allowed. */
export async function checkRate (request, env, { bucket, burst, daily, siteDaily }) {
  if (!env.DB) return { ok: true };
  await ensureTables(env);
  const key = bucket + ':' + await visitorKey(request, env);
  const now = Date.now();
  const [a, b, c] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS n FROM chat_usage WHERE k = ? AND ts > ?').bind(key, now - 10 * 60e3),
    env.DB.prepare('SELECT COUNT(*) AS n FROM chat_usage WHERE k = ? AND ts > ?').bind(key, now - 24 * 3600e3),
    env.DB.prepare('SELECT COUNT(*) AS n FROM chat_usage WHERE k LIKE ? AND ts > ?').bind(bucket + ':%', now - 24 * 3600e3)
  ]);
  const n = (r) => (r.results && r.results[0] && r.results[0].n) || 0;
  if (n(a) >= burst || n(b) >= daily) return { ok: false, reason: 'visitor' };
  if (siteDaily && n(c) >= siteDaily) return { ok: false, reason: 'site' };
  const writes = [env.DB.prepare('INSERT INTO chat_usage (k, ts) VALUES (?, ?)').bind(key, now)];
  if (Math.random() < 0.02) writes.push(env.DB.prepare('DELETE FROM chat_usage WHERE ts < ?').bind(now - 3 * 24 * 3600e3));
  await env.DB.batch(writes);
  return { ok: true };
}

const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;

/* Validates an enquiry from the assistant's enquiry flow.
   Returns { value } or { error } with a message the visitor can act on. */
export function cleanEnquiry (input) {
  const p = input && typeof input === 'object' ? input : {};
  const out = {
    name: str(p.name, 80),
    company: str(p.company, 120),
    phone: str(p.phone, 40),
    email: str(p.email, 120).toLowerCase(),
    vessel: str(p.vessel_or_site != null ? p.vessel_or_site : p.vessel, 160),
    service: SERVICE_NAMES.includes(p.service) ? p.service : 'General',
    urgency: URGENCY.includes(p.urgency) ? p.urgency : 'planned',
    job: str(p.job, 2000)
  };
  if (out.email && !EMAIL_RE.test(out.email)) return { error: 'The email address does not look complete. Ask the visitor to check it.' };
  if (out.phone && out.phone.replace(/\D/g, '').length < 6) return { error: 'The phone number looks too short. Ask the visitor to check it.' };
  if (!out.name) return { error: 'Missing the visitor\'s name. Ask for it first.' };
  if (!out.phone && !out.email) return { error: 'Missing a phone number or email. Ask how the team should reach them.' };
  if (out.job.length < 4) return { error: 'Missing a description of the job. Ask what needs doing.' };
  return { value: out };
}

function newRef () {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return 'WB-' + [...bytes].map((b) => abc[b % abc.length]).join('');
}

function cleanTranscript (transcript) {
  const rows = (Array.isArray(transcript) ? transcript : []).slice(-16).map((m) => ({
    r: m && m.role === 'assistant' ? 'a' : 'v',
    t: str(m && m.content, 800)
  })).filter((m) => m.t);
  let json = JSON.stringify(rows);
  while (json.length > 8000 && rows.length > 1) { rows.shift(); json = JSON.stringify(rows); }
  return json;
}

/* Saves an enquiry. A correction names the reference it replaces (`updateRef`,
   only honoured for the same chat session), so a second, different job in the
   same chat gets its own record. The identical job sent twice within ten
   minutes (a double tap) returns the first record. */
export async function saveEnquiry (env, e, { sid, page, source, transcript, updateRef }) {
  if (!env.DB) return { ref: newRef(), stored: false };
  await ensureTables(env);
  const tx = cleanTranscript(transcript);
  if (sid) {
    const ref = /^WB-[A-Z0-9]{4}$/.test(String(updateRef || '')) ? updateRef : '';
    const prev = ref
      ? await env.DB.prepare('SELECT id, ref FROM enquiries WHERE sid = ? AND ref = ? LIMIT 1').bind(sid, ref).first()
      : await env.DB.prepare('SELECT id, ref FROM enquiries WHERE sid = ? AND job = ? AND created_at > ? LIMIT 1')
        .bind(sid, e.job, new Date(Date.now() - 10 * 60e3).toISOString()).first();
    if (prev) {
      await env.DB.prepare(`UPDATE enquiries SET name=?, company=?, phone=?, email=?, vessel=?, service=?, urgency=?, job=?, page=?, transcript=?, status='new',
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
        .bind(e.name, e.company, e.phone, e.email, e.vessel, e.service, e.urgency, e.job, page || '', tx, prev.id).run();
      return { ref: prev.ref, stored: true, updated: true };
    }
  }
  const ref = newRef();
  await env.DB.prepare('INSERT INTO enquiries (id, ref, sid, source, name, company, phone, email, vessel, service, urgency, job, page, transcript) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), ref, sid || null, source || 'assistant', e.name, e.company, e.phone, e.email, e.vessel, e.service, e.urgency, e.job, page || '', tx).run();
  return { ref, stored: true, updated: false };
}

export function cleanSid (v) {
  const s = String(v || '');
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : '';
}

/* Same-origin only: the enquiry endpoint is for this site's pages. */
export function sameOrigin (request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}
