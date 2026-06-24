/**
 * EdibleFactor - Public job listings proxy (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * GET /api/jobs?role=chef|bartender|server|manager
 *               &scouter_restaurant_id=<id>&outlet_id=<id>   (all optional)
 *
 * Same-origin proxy in front of the backend's public careers API. The careers
 * page cannot call api.ediblefactor.com directly: the page CSP pins
 * `connect-src 'self'`, and a same-origin Function also sidesteps CORS. This
 * runs on the Cloudflare Workers runtime (Web standard Request/Response, no
 * Node APIs).
 *
 * Backend base URL: env.BACKEND_API_URL (set in the Pages project), default
 * https://api.ediblefactor.com. The backend runs on Abhi's laptop via the
 * Cloudflare Tunnel; this Function reaches it server-side.
 *
 * Edge cache: results are cached in `caches.default` for 5 minutes keyed by the
 * normalized request URL (query included). This shields the laptop backend from
 * bursts; the share-code + filter UI hits this function on every navigation.
 */

const DEFAULT_BACKEND = 'https://api.ediblefactor.com';
const ROLES = new Set(['chef', 'bartender', 'server', 'manager']);
const CACHE_CONTROL = 'public, max-age=300';

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

  // Forward only the params the backend understands, normalized.
  const qs = new URLSearchParams({ page: '1', per_page: '100' });
  const role = (url.searchParams.get('role') || '').toLowerCase();
  if (ROLES.has(role)) qs.set('role', role);
  const scouterRestaurantId = (url.searchParams.get('scouter_restaurant_id') || '').trim().slice(0, 64);
  if (scouterRestaurantId) qs.set('scouter_restaurant_id', scouterRestaurantId);
  const outletId = (url.searchParams.get('outlet_id') || '').trim().slice(0, 64);
  if (outletId) qs.set('outlet_id', outletId);

  // Cache key is a normalized GET on the forwarded query (stable ordering, no
  // page-specific headers). Keep it same-origin so it slots into caches.default.
  const cacheKeyUrl = new URL(url.origin + '/api/jobs');
  cacheKeyUrl.search = qs.toString();
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: 'GET' });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(`${base}/v1/public/jobs?${qs.toString()}`, {
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

    // Only cache healthy responses so a transient 5xx isn't pinned for 5 min.
    if (upstream.ok) {
      const toCache = response.clone();
      if (waitUntil) waitUntil(cache.put(cacheKey, toCache));
      else await cache.put(cacheKey, toCache);
    }

    return response;
  } catch (err) {
    console.error('[careers] jobs proxy failed:', err);
    return json({ error: 'Could not load openings right now. Please try again shortly.' }, 502);
  }
}
