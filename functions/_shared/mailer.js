/* Enquiry alert emails, sent through Resend (resend.com) from the verified
   subdomain enquiry.wbme.com.na. Every enquiry is saved to D1 first and shows
   in admin.html; the email is the heads-up that one has arrived.

   Pages settings (Settings -> Variables and Secrets):
     RESEND_API_KEY  secret, a Resend API key with sending access
     ENQUIRY_TO      optional, comma-separated recipients (default info@wbme.com.na)
     MAIL_FROM       optional, sender (default "WBME Website <website@enquiry.wbme.com.na>")
   Without RESEND_API_KEY nothing is sent and enquiries are only saved. */

const DEFAULT_TO = 'info@wbme.com.na';
const DEFAULT_FROM = 'WBME Website <website@enquiry.wbme.com.na>';
const URG = { urgent: 'Urgent', 'this week': 'This week', planned: 'Planned', 'just asking': 'Just asking' };
const SOURCE = { assistant: 'the website assistant', form: 'the contact form' };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
const firstName = (name) => oneLine(name, 80).split(' ')[0] || 'them';
const telHref = (phone) => 'tel:' + String(phone).replace(/[^\d+]/g, '');

/* The chat as the admin page shows it: markers and bold stripped. */
function chatLines (transcript) {
  return (Array.isArray(transcript) ? transcript : []).slice(-16).map((m) => ({
    who: m && m.role === 'assistant' ? 'Assistant' : 'Visitor',
    text: String((m && m.content) || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/\*\*/g, '').trim().slice(0, 800)
  })).filter((m) => m.text);
}

/* Builds the alert: { subject, text, html }. `e` is a cleaned enquiry
   (cleanEnquiry in assistant-store.js). */
export function enquiryEmail (e, { ref, updated, source, page, transcript, origin }) {
  const urgent = e.urgency === 'urgent';
  const work = e.service && e.service !== 'General' ? e.service : '';
  const subject = oneLine((urgent ? 'URGENT ' : '') + (updated ? 'Updated enquiry ' : 'New enquiry ') + ref + ': ' + (work ? work + ', ' : '') + e.name, 150);
  const intro = (updated ? 'Updated enquiry' : 'New enquiry') + ' from ' + (SOURCE[source] || 'the website') + (page ? ' (' + page + ' page)' : '') + '. Reference ' + ref + '.';
  const fields = [
    ['Name', e.name], ['Company', e.company], ['Phone', e.phone], ['Email', e.email],
    ['Vessel / site', e.vessel], ['Work', work], ['Urgency', URG[e.urgency] || '']
  ].filter((f) => f[1]);
  const how = e.email
    ? 'Reply to this email to answer ' + firstName(e.name) + ' directly.'
    : 'No email address given: call ' + firstName(e.name) + ' on ' + e.phone + '.';
  const admin = (origin || 'https://www.wbme.com.na') + '/admin';
  const chat = source === 'assistant' ? chatLines(transcript) : [];

  const text = [
    intro, '',
    ...fields.map((f) => f[0] + ': ' + f[1]), '',
    'The job:', e.job, '',
    how,
    'All enquiries: ' + admin,
    ...(chat.length ? ['', 'The conversation:', ...chat.map((m) => m.who + ': ' + m.text)] : [])
  ].join('\n');

  const cell = 'padding:6px 14px 6px 0;vertical-align:top;font:15px/1.5 Arial,sans-serif';
  const btn = 'display:inline-block;margin:0 8px 8px 0;padding:10px 18px;border-radius:999px;background:#c79a3e;color:#0f2c52;font:bold 14px Arial,sans-serif;text-decoration:none';
  const html = '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;color:#0f2c52">' +
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px 26px;border:1px solid #dbe2ec">' +
    (urgent ? '<p style="margin:0 0 12px;font:bold 13px Arial,sans-serif;letter-spacing:.08em;color:#b3261e">URGENT</p>' : '') +
    '<p style="margin:0 0 18px;font:15px/1.5 Arial,sans-serif;color:#163a66">' + esc(intro) + '</p>' +
    '<table role="presentation" style="border-collapse:collapse;margin:0 0 18px">' +
    fields.map((f) => '<tr><td style="' + cell + ';color:#5b6b82;white-space:nowrap">' + esc(f[0]) + '</td><td style="' + cell + ';color:#0f2c52"><b>' + esc(f[1]) + '</b></td></tr>').join('') +
    '</table>' +
    '<p style="margin:0 0 6px;font:bold 13px Arial,sans-serif;letter-spacing:.06em;color:#5b6b82">THE JOB</p>' +
    '<div style="margin:0 0 20px;padding:14px 16px;background:#f4f7fb;border-radius:10px;font:15px/1.6 Arial,sans-serif;white-space:pre-wrap">' + esc(e.job) + '</div>' +
    '<p style="margin:0 0 10px">' +
    (e.email ? '<a style="' + btn + '" href="mailto:' + esc(e.email) + '?subject=' + encodeURIComponent('Your enquiry ' + ref + ' - Walvis Bay Marine Engineering') + '">Reply to ' + esc(firstName(e.name)) + '</a>' : '') +
    (e.phone ? '<a style="' + btn + '" href="' + esc(telHref(e.phone)) + '">Call ' + esc(e.phone) + '</a>' : '') +
    '</p>' +
    '<p style="margin:0;font:14px/1.5 Arial,sans-serif;color:#5b6b82">' + esc(how) + ' <a href="' + esc(admin) + '" style="color:#163a66">All enquiries</a></p>' +
    (chat.length ? '<div style="margin-top:22px;padding-top:16px;border-top:1px solid #dbe2ec">' +
      '<p style="margin:0 0 8px;font:bold 13px Arial,sans-serif;letter-spacing:.06em;color:#5b6b82">THE CONVERSATION</p>' +
      chat.map((m) => '<p style="margin:0 0 8px;font:14px/1.5 Arial,sans-serif;color:' + (m.who === 'Visitor' ? '#0f2c52' : '#5b6b82') + '"><b>' + m.who + ':</b> ' + esc(m.text) + '</p>').join('') +
      '</div>' : '') +
    '</div></body></html>';

  return { subject, text, html };
}

async function contentKey (ref, e) {
  const data = new TextEncoder().encode(JSON.stringify([ref, e.name, e.company, e.phone, e.email, e.vessel, e.service, e.urgency, e.job]));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return 'enquiry-' + ref + '-' + [...digest].slice(0, 10).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* Sends the alert. Resolves { sent: false } when no API key is set; throws
   on a Resend error so the caller can log it. The idempotency key stops a
   retried request from emailing the same enquiry twice. */
export async function sendEnquiryEmail (env, e, meta) {
  if (!env.RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY is not set' };
  const { subject, text, html } = enquiryEmail(e, meta);
  const to = String(env.ENQUIRY_TO || DEFAULT_TO).split(',').map((s) => s.trim()).filter(Boolean);
  const message = { from: env.MAIL_FROM || DEFAULT_FROM, to, subject, text, html };
  if (e.email) message.reply_to = e.email;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.RESEND_API_KEY,
      'content-type': 'application/json',
      'user-agent': 'wbme-website',
      'idempotency-key': await contentKey(meta.ref, e)
    },
    body: JSON.stringify(message)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error('Resend ' + res.status + ': ' + detail.slice(0, 300));
  }
  const data = await res.json().catch(() => ({}));
  return { sent: true, id: data.id || '' };
}
