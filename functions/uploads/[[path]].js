/* Serves admin-uploaded photos from R2 at /uploads/<file>. File names are
   unique per upload, so they can be cached for a year. */
export async function onRequestGet ({ env, params, request }) {
  const parts = Array.isArray(params.path) ? params.path : [params.path];
  if (parts.some((p) => !p || p === '..')) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get('uploads/' + parts.join('/'), { onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}
