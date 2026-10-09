/**
 * Real 404s for repo-internal files (waitlist#119).
 *
 * Pages publishes the repo root, so without this the repo's own working
 * files (agent docs, the decision log, unpublished drafts, build scripts)
 * were served raw at ediblefactor.com.
 *
 * Two keys, both required, and they must list the same paths:
 *   1. _routes.json "include" decides WHICH requests run a Function at all:
 *      the /api/* routes plus the internal paths. Pages, assets, robots.txt
 *      and sitemap.xml are served straight from the asset store and never
 *      reach this file.
 *   2. INTERNAL below decides what to block once invoked. It is a second,
 *      explicit list on purpose: if _routes.json is ever invalid, Pages and
 *      wrangler fall back to include ["/*"], and a "block everything that is
 *      not /api" rule would then 404 the whole site. With an explicit
 *      pattern that fallback only costs extra invocations.
 * Adding a new non-site file or folder at the repo root means adding it to
 * BOTH lists.
 *
 * Workers runtime only: no Node APIs.
 */
const INTERNAL = /^\/(?:\.(?!well-known(?:\/|$))[^/]*|docs|scripts|tools)(?:\/|$)|\.(?:md|mjs)$/i;

// _headers rules are not applied to Function responses, so the /* block
// from _headers is repeated here for the 404s this file produces.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Match on the path the asset server would resolve: percent-decoded, with
// repeated slashes collapsed, so /CLAUDE%2Emd or //CLAUDE.md cannot slip
// past the pattern once this file is invoked for them.
function decodedPath(url) {
  let path = new URL(url).pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // Malformed escape: match on the raw path.
  }
  return path.replace(/\/{2,}/g, '/');
}

async function notFound(request, env) {
  let body = 'Not found';
  let type = 'text/plain; charset=utf-8';
  try {
    // The branded page from 404.html. ASSETS.fetch never re-enters Functions.
    const page = await env.ASSETS.fetch(new URL('/404', request.url));
    if (page.ok) {
      body = page.body;
      type = page.headers.get('content-type') || 'text/html; charset=utf-8';
    }
  } catch {
    // Fall through to the plain-text body: still a 404.
  }
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 404,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Robots-Tag': 'noindex',
      ...SECURITY_HEADERS,
    },
  });
}

export async function onRequest({ request, env, next }) {
  return INTERNAL.test(decodedPath(request.url)) ? notFound(request, env) : next();
}
