/**
 * EdibleFactor - Public job taxonomy proxy (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * GET /api/jobs-taxonomy
 *
 * Same-origin proxy in front of the backend's public job taxonomy endpoint.
 * The careers page cannot call api.ediblefactor.com directly: the page CSP
 * pins `connect-src 'self'`, and a same-origin Function also sidesteps CORS.
 * This runs on the Cloudflare Workers runtime (Web standard Request/Response,
 * no Node APIs).
 *
 * Backend base URL: env.BACKEND_API_URL (set in the Pages project), default
 * https://api.ediblefactor.com. The backend runs on Abhi's laptop via the
 * Cloudflare Tunnel; this Function reaches it server-side.
 *
 * Response shape: { data: { categories: [{ slug, label, roles: [{ slug,
 * label }] }] } } - the ordered 10-category / ~80-role taxonomy. Role slugs
 * are the values accepted by /api/jobs?role=; category slugs by ?category=.
 *
 * Edge cache: results are cached in `caches.default` for 1 hour, keyed by the
 * same-origin path. The taxonomy is static per deploy and changes far less
 * often than job postings, so it gets a longer TTL than jobs.js's 5 min.
 */

const DEFAULT_BACKEND = 'https://api.ediblefactor.com';
const CACHE_CONTROL = 'public, max-age=3600';

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const base = (env.BACKEND_API_URL || DEFAULT_BACKEND).replace(/\/+$/, '');
  const url = new URL(request.url);

  // No query params to forward - the taxonomy endpoint takes none. Cache key
  // is just the same-origin path so it slots into caches.default.
  const cacheKeyUrl = new URL(url.origin + '/api/jobs-taxonomy');
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: 'GET' });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(`${base}/v1/public/jobs/taxonomy`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Platform': 'ediblefactor',
        'X-Request-Time': Math.floor(Date.now() / 1000).toString(),
      },
    });

    // Pass the backend envelope through untouched; the page reads `.data`.
    const text = await upstream.text();
    const response = new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_CONTROL,
      },
    });

    // Only cache healthy responses so a transient 5xx isn't pinned for an hour.
    if (upstream.ok) {
      const toCache = response.clone();
      if (waitUntil) waitUntil(cache.put(cacheKey, toCache));
      else await cache.put(cacheKey, toCache);
    }

    return response;
  } catch (err) {
    console.error('[careers] jobs-taxonomy proxy failed:', err);
    return json({ error: 'Could not load job categories right now. Please try again shortly.' }, 502);
  }
}
