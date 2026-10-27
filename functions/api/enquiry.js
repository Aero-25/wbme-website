/* POST /api/enquiry: saves an enquiry for the team to see in admin, then
   emails them a heads-up (functions/_shared/mailer.js). Two senders:
   the website assistant (js/chatbot.js) and the contact forms
   (js/experience.js, body.source = 'form'). Same-origin and rate limited. */
import { json } from '../_shared/util.js';
import { checkRate, cleanEnquiry, saveEnquiry, cleanSid, sameOrigin, newRef, PAGES } from '../_shared/assistant-store.js';
import { sendEnquiryEmail } from '../_shared/mailer.js';

export async function onRequestPost (context) {
  const { request, env } = context;
  if (!sameOrigin(request)) return json({ error: 'Not allowed.' }, 403);
  let body;
  try { body = await request.json(); } catch (err) { return json({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request.' }, 400);
  const source = body.source === 'form' ? 'form' : 'assistant';
  /* the forms carry a field people never see; only bots fill it in */
  if (source === 'form' && body.website) return json({ ref: newRef(), updated: false }, 201);
  const { value, error } = cleanEnquiry(body, { source });
  if (error) return json({ error }, 400);
  try {
    const limit = await checkRate(request, env, { bucket: 'enq', burst: 8, daily: 30 });
    if (!limit.ok) return json({ error: 'Too many enquiries from this connection today. Please call or email the workshop.' }, 429);
    const page = PAGES.includes(body.page) ? body.page : '';
    const transcript = source === 'assistant' && Array.isArray(body.transcript) ? body.transcript : [];
    const saved = await saveEnquiry(env, value, {
      sid: source === 'assistant' ? cleanSid(body.sid) : '',
      page,
      source,
      transcript
    });
    if (saved.changed) {
      const mail = sendEnquiryEmail(env, value, { ref: saved.ref, updated: !!saved.updated, source, page, transcript, origin: new URL(request.url).origin })
        .then((r) => { if (!r.sent) console.warn('enquiry: email not sent,', r.reason); })
        .catch((err) => console.error('enquiry: email failed', err));
      if (typeof context.waitUntil === 'function') context.waitUntil(mail); else await mail;
    }
    /* notify: whether an email alert goes out. Until RESEND_API_KEY is set the
       contact form also opens the visitor's email app, so WBME still gets it. */
    return json({ ref: saved.ref, updated: !!saved.updated, notify: !!env.RESEND_API_KEY }, 201);
  } catch (err) {
    console.error('enquiry: save failed', err);
    return json({ error: 'Could not save right now.' }, 500);
  }
}
