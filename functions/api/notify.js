/**
 * EdibleFactor - Generic "Get notified" signup proxy (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * POST /api/notify
 * Body: { email, phone?, source?, url?, website? (honeypot) }
 *
 * Same-origin proxy in front of POST /v1/public/notify-signups. Keeps the page
 * CSP `connect-src 'self'` happy and avoids CORS. Captures a notification
 * signup (email required, phone optional, a short source key + the full page
 * URL); the backend dedupes, then batches a Discord post and forwards to Loops
 * off the request path. Reusable by any page; the careers page uses it now.
 *
 * Workers runtime, Web standard Request/Response, no Node APIs.
 */

const DEFAULT_BACKEND = 'https://api.ediblefactor.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function str(v, max) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestPost({ request, env }) {
  const base = (env.BACKEND_API_URL || DEFAULT_BACKEND).replace(/\/+$/, '');

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: silently accept bot submissions without forwarding.
  if (body?.website || body?._honey) {
    return json({ ok: true }, 200);
  }

  const email = str(body?.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email.' }, 400);
  }

  // Only forward fields the backend models; never proxy arbitrary keys.
  const payload = { email };

  const phone = str(body?.phone, 40);
  if (phone) payload.phone = phone;

  const source = str(body?.source, 50);
  if (source) payload.source = source;

  const url = str(body?.url, 2048);
  if (url) payload.url = url;

  try {
    const upstream = await fetch(`${base}/v1/public/notify-signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': 'ediblefactor',
        'X-Request-Time': Math.floor(Date.now() / 1000).toString(),
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[notify] proxy failed:', err);
    return json({ error: 'Could not submit right now. Please try again shortly.' }, 502);
  }
}
