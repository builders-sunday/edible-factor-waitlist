/**
 * EdibleFactor - Public job listings proxy (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * GET /api/jobs?role=chef|bartender|server|manager (role optional)
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
 */

const DEFAULT_BACKEND = 'https://api.ediblefactor.com';
const ROLES = new Set(['chef', 'bartender', 'server', 'manager']);

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ request, env }) {
  const base = (env.BACKEND_API_URL || DEFAULT_BACKEND).replace(/\/+$/, '');
  const url = new URL(request.url);

  const qs = new URLSearchParams({ page: '1', per_page: '100' });
  const role = (url.searchParams.get('role') || '').toLowerCase();
  if (ROLES.has(role)) qs.set('role', role);

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
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        // Short edge/browser cache so the listing stays fresh but bursts are cheap.
        'Cache-Control': 'public, max-age=60, must-revalidate',
      },
    });
  } catch (err) {
    console.error('[careers] jobs proxy failed:', err);
    return json({ error: 'Could not load openings right now. Please try again shortly.' }, 502);
  }
}
