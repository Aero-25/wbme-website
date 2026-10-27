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

/* ===== Customer confirmation =====
   A "we've got your request" email to the visitor, sent once per new
   enquiry that has an email address. Replies go to the workshop inbox.
   It is dark by design (WBME navy), so dark-mode mail apps have little to
   recolour, and the logo is a PNG (Outlook can't show WebP) with a clear
   background and a white wordmark, so it never sits in a white box. */
const SITE = 'https://www.wbme.com.na';
const WORKSHOP = { email: 'info@wbme.com.na', phone: '+264 (0)64 285 700', tel: 'tel:+26464285700' };

export function confirmationEmail (e, { ref }) {
  const name = firstName(e.name);
  const work = e.service && e.service !== 'General' ? e.service : '';
  const subject = 'We\'ve got your request, reference ' + ref + ' - Walvis Bay Marine Engineering';
  const preheader = 'Thanks ' + name + ', your request is with the WBME team. Reference ' + ref + '.';
  const reply = e.phone && e.email ? 'by phone or email' : e.phone ? 'by phone' : 'by email';
  const summary = [['Work', work], ['Vessel / site', e.vessel], ['Phone', e.phone], ['Email', e.email]].filter((f) => f[1]);

  const text = [
    'Thanks, ' + name + '. We\'ve got your request.', '',
    'Your reference: ' + ref, '',
    'The team at our Walvis Bay workshop will look at it and get back to you ' + reply + ' during working hours (Monday to Friday, 07:00 to 17:00).', '',
    'What you sent us:',
    ...summary.map((f) => f[0] + ': ' + f[1]),
    e.job, '',
    'Something urgent? Call the workshop on ' + WORKSHOP.phone + ' and quote ' + ref + '.',
    'To add details or photos, reply to this email.', '',
    'Walvis Bay Marine Engineering',
    '8th Street East, Industrial Area, Walvis Bay, Namibia',
    WORKSHOP.email + ' | ' + SITE.replace('https://', '')
  ].join('\n');

  /* Colours sit in classes as well as inline: Outlook.com's dark mode
     recolours inline styles, and the [data-ogsb]/[data-ogsc] rules put the
     originals back. */
  const f = 'font-family:Arial,Helvetica,sans-serif';
  const css = '.bg-page{background-color:#071a33!important}.bg-card{background-color:#0f2c52!important}.bg-box{background-color:#163a66!important}' +
    '.bg-gold{background-color:#c79a3e!important}.c-white{color:#ffffff!important}.c-body{color:#d5deea!important}.c-mut{color:#9fb0c6!important}' +
    '.c-gold{color:#e3c372!important}.c-ink{color:#0f2c52!important}';
  const ogs = css.replace(/\.(bg-[a-z]+)\{/g, '[data-ogsb] .$1{').replace(/\.(c-[a-z]+)\{/g, '[data-ogsc] .$1{');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>' + esc(subject) + '</title>' +
    '<style>:root{color-scheme:light dark;supported-color-schemes:light dark}' + ogs + '@media (prefers-color-scheme:dark){' + css + '}' +
    '@media (max-width:480px){.pad{padding-left:22px!important;padding-right:22px!important}.h1{font-size:25px!important}}</style></head>' +
    '<body class="bg-page" style="margin:0;padding:0;background:#071a33">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#071a33">' + esc(preheader) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#071a33" class="bg-page" style="background:#071a33"><tr><td align="center" style="padding:28px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0f2c52" class="bg-card" style="max-width:600px;background:#0f2c52;border-radius:16px;overflow:hidden;border:1px solid #22477a">' +

    /* logo */
    '<tr><td align="center" class="bg-card" style="padding:30px 24px 26px;background:#0f2c52">' +
    '<a href="' + SITE + '" style="text-decoration:none"><img src="' + SITE + '/media/brand/email-logo-dark-608.png" width="240" height="87" alt="Walvis Bay Marine Engineering" style="display:block;width:240px;max-width:100%;height:auto;border:0;color:#ffffff;font:bold 20px Arial,sans-serif"></a></td></tr>' +
    '<tr><td class="bg-gold" style="height:3px;line-height:3px;font-size:0;background:#c79a3e">&nbsp;</td></tr>' +

    /* headline + reference */
    '<tr><td class="pad bg-card" style="background:#0f2c52;padding:34px 34px 30px">' +
    '<p class="c-gold" style="margin:0 0 10px;' + f + ';font-size:12px;font-weight:bold;letter-spacing:.16em;color:#e3c372">REQUEST RECEIVED</p>' +
    '<h1 class="h1 c-white" style="margin:0 0 22px;' + f + ';font-size:28px;line-height:1.2;font-weight:bold;color:#ffffff">Thanks, ' + esc(name) + '.<br>We\'ve got your request.</h1>' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="bg-box" bgcolor="#163a66" style="border:1px solid #c79a3e;border-radius:10px;padding:12px 18px;background:#163a66">' +
    '<p class="c-mut" style="margin:0 0 2px;' + f + ';font-size:11px;letter-spacing:.14em;color:#9fb0c6">YOUR REFERENCE</p>' +
    '<p class="c-gold" style="margin:0;font-family:\'Courier New\',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:.08em;color:#e3c372">' + esc(ref) + '</p>' +
    '</td></tr></table>' +
    '<p class="c-body" style="margin:26px 0 0;' + f + ';font-size:16px;line-height:1.6;color:#d5deea">The team at our Walvis Bay workshop will look at it and get back to you ' + reply + ' during working hours, Monday to Friday, 07:00 to 17:00. Quote <b class="c-white" style="color:#ffffff">' + esc(ref) + '</b> if you call.</p>' +
    '</td></tr>' +

    /* what they sent */
    '<tr><td class="pad bg-card" style="background:#0f2c52;padding:0 34px 8px"><div style="border-top:1px solid #22477a;padding-top:24px">' +
    '<p class="c-gold" style="margin:0 0 10px;' + f + ';font-size:12px;font-weight:bold;letter-spacing:.14em;color:#e3c372">WHAT YOU SENT US</p>' +
    (summary.length ? '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px">' +
      summary.map((r) => '<tr><td class="c-mut" style="padding:4px 16px 4px 0;' + f + ';font-size:14px;color:#9fb0c6;white-space:nowrap;vertical-align:top">' + esc(r[0]) + '</td>' +
        '<td class="c-white" style="padding:4px 0;' + f + ';font-size:14px;color:#ffffff;font-weight:bold">' + esc(r[1]) + '</td></tr>').join('') +
      '</table>' : '') +
    '<div class="bg-box c-body" style="margin:0 0 28px;padding:16px 18px;background:#163a66;border-left:3px solid #c79a3e;border-radius:0 10px 10px 0;' + f + ';font-size:15px;line-height:1.6;color:#d5deea;white-space:pre-wrap">' + esc(e.job) + '</div>' +
    '</div></td></tr>' +

    /* urgent */
    '<tr><td class="pad bg-card" style="background:#0f2c52;padding:0 34px 34px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#163a66" class="bg-box" style="background:#163a66;border:1px solid #c79a3e;border-radius:12px"><tr><td style="padding:20px 22px">' +
    '<p class="c-white" style="margin:0 0 4px;' + f + ';font-size:16px;font-weight:bold;color:#ffffff">Something urgent?</p>' +
    '<p class="c-mut" style="margin:0 0 16px;' + f + ';font-size:14px;line-height:1.5;color:#9fb0c6">If a vessel is waiting or a plant is down, call the workshop. To add details or photos, just reply to this email.</p>' +
    '<a href="' + WORKSHOP.tel + '" class="bg-gold c-ink" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#c79a3e;' + f + ';font-size:15px;font-weight:bold;color:#0f2c52;text-decoration:none">Call ' + WORKSHOP.phone + '</a>' +
    '</td></tr></table></td></tr>' +

    /* footer */
    '<tr><td class="pad bg-page" style="background:#071a33;padding:26px 34px;border-top:1px solid #22477a">' +
    '<p class="c-white" style="margin:0 0 6px;' + f + ';font-size:14px;font-weight:bold;color:#ffffff">Walvis Bay Marine Engineering</p>' +
    '<p class="c-mut" style="margin:0 0 12px;' + f + ';font-size:13px;line-height:1.6;color:#9fb0c6">8th Street East, Industrial Area, Walvis Bay, Namibia<br>' +
    '<a href="mailto:' + WORKSHOP.email + '" class="c-gold" style="color:#e3c372;text-decoration:none">' + WORKSHOP.email + '</a> &nbsp;|&nbsp; ' +
    '<a href="' + SITE + '" class="c-gold" style="color:#e3c372;text-decoration:none">www.wbme.com.na</a></p>' +
    '<p class="c-gold" style="margin:0;' + f + ';font-size:13px;font-style:italic;color:#c79a3e">No job too big, no job too small.</p>' +
    '</td></tr></table>' +
    '<p class="c-mut" style="margin:16px 0 0;' + f + ';font-size:12px;line-height:1.5;color:#7a8ba3">You\'re getting this because you sent an enquiry on wbme.com.na.</p>' +
    '</td></tr></table></body></html>';

  return { subject, text, html };
}

/* Sends the confirmation. Resolves { sent: false } without a key or an
   email address; the idempotency key means one confirmation per reference. */
export async function sendConfirmationEmail (env, e, meta) {
  if (!env.RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY is not set' };
  if (!e.email) return { sent: false, reason: 'no email address' };
  const { subject, text, html } = confirmationEmail(e, meta);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.RESEND_API_KEY,
      'content-type': 'application/json',
      'user-agent': 'wbme-website',
      'idempotency-key': 'confirm-' + meta.ref
    },
    body: JSON.stringify({ from: env.MAIL_FROM || DEFAULT_FROM, to: [e.email], reply_to: WORKSHOP.email, subject, text, html })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error('Resend ' + res.status + ': ' + detail.slice(0, 300));
  }
  const data = await res.json().catch(() => ({}));
  return { sent: true, id: data.id || '' };
}
