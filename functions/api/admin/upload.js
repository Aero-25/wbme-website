/* Admin: store one photo in R2. The admin page resizes to 1600px WebP
   before sending, so uploads are small; the body is the raw image. */
import { json } from '../../_shared/util.js';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX_BYTES = 10 * 1024 * 1024;

export async function onRequestPost ({ request, env }) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  const ext = TYPES[type];
  if (!ext) return json({ error: 'Only WebP, JPEG or PNG images can be uploaded.' }, 415);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: 'The file is empty.' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'The image is larger than 10 MB.' }, 413);
  const key = 'uploads/' + Date.now() + '-' + crypto.randomUUID().slice(0, 8) + '.' + ext;
  await env.MEDIA.put(key, body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
  return json({ path: key }, 201);
}
