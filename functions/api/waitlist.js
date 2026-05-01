/**
 * EdibleFactor — Waitlist endpoint (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * POST /api/waitlist
 * Body: { email: string, source?: string, ts?: string }
 *
 * Runs on Cloudflare Workers runtime via Pages Functions. Same-origin by default
 * (no CORS needed when called from this site). Cross-origin requests from the
 * allowed domains list still work.
 *
 * STORAGE: defaults to log-only. Set LOOPS_API_KEY in the Pages project's
 * environment variables to forward signups to Loops.so. Other backends are
 * left as commented templates below.
 */

const ALLOWED_ORIGIN = /^https?:\/\/([a-z0-9-]+\.)*pages\.dev$|^https?:\/\/(www\.)?ediblefactor\.(com|app|in)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin) {
  const headers = { 'Vary': 'Origin' };
  if (origin && ALLOWED_ORIGIN.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
}

export async function onRequestPost({ request, env }) {
  const cors = corsHeaders(request.headers.get('origin'));

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const email = (body?.email || '').toString().trim().toLowerCase();
  const source = (body?.source || 'unknown').toString().slice(0, 50);

  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return json({ error: 'Invalid email' }, 400, cors);
  }

  // Honeypot: silently succeed for bots.
  if (body?.website || body?._honey) {
    return json({ ok: true }, 200, cors);
  }

  const signup = {
    email,
    source,
    ts: new Date().toISOString(),
    ua: (request.headers.get('user-agent') || '').slice(0, 200),
    ip: (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown',
  };

  try {
    if (env.LOOPS_API_KEY) {
      const r = await fetch('https://app.loops.so/api/v1/contacts/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LOOPS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, source, userGroup: 'EdibleFactor Waitlist' }),
      });
      if (!r.ok && r.status !== 409) {
        console.error('Loops error:', r.status, await r.text());
        throw new Error('Loops upstream failed');
      }
    } else {
      console.log('[waitlist]', JSON.stringify(signup));
    }

    /* ─── Alternate backends (uncomment one) ──────────────────────────────────
    // Resend audience:
    // await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, { ... });
    //
    // Google Sheets webhook:
    // await fetch(env.SHEETS_WEBHOOK_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(signup) });
    //
    // Supabase:
    // await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist`, { ... });
    */

    return json({ ok: true }, 200, cors);
  } catch (err) {
    console.error('[waitlist] error:', err);
    return json({ error: 'Could not save right now. Please try again shortly.' }, 500, cors);
  }
}
