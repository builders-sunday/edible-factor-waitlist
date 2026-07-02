/**
 * EdibleFactor - Waitlist endpoint (Cloudflare Pages Function)
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

// CORS: only this waitlist Pages project (incl. its branch previews) + the real
// domains. Tightened off the old `*.pages.dev` regex (waitlist#7) so an arbitrary
// Cloudflare Pages project can no longer call the signup endpoint.
const ALLOWED_ORIGIN = /^https?:\/\/([a-z0-9-]+\.)?(edible-factor-waitlist|ediblefactor-waitlist)\.pages\.dev$|^https?:\/\/(www\.)?ediblefactor\.(com|app|in)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limit (waitlist#6): 3 signups / hour / IP via a KV counter. Bind a KV
// namespace as RATE_LIMIT in the Pages project to enable; degrades to no-op if
// unbound so signups never break before the binding exists.
const RL_MAX = 3, RL_WINDOW = 3600;
async function isRateLimited(env, ip) {
  const kv = env.RATE_LIMIT;
  if (!kv || !ip || ip === 'unknown') return false;
  const key = `wl:${ip}`;
  const n = parseInt((await kv.get(key)) || '0', 10);
  if (n >= RL_MAX) return true;
  await kv.put(key, String(n + 1), { expirationTtl: RL_WINDOW });
  return false;
}

// Turnstile (waitlist#8): verify the widget token server-side. Set TURNSTILE_SECRET
// in the Pages env to enable; degrades to skip (honeypot still guards) if unset.
async function turnstileOK(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  try {
    const form = new URLSearchParams();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', token);
    if (ip && ip !== 'unknown') form.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const d = await r.json();
    return !!(d && d.success);
  } catch { return false; }
}

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

export async function onRequestPost({ request, env, waitUntil }) {
  const cors = corsHeaders(request.headers.get('origin'));

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const email = (body?.email || '').toString().trim().toLowerCase();
  const source = (body?.source || 'unknown').toString().slice(0, 50);
  const token = (body?.['cf-turnstile-response'] || body?.turnstile || '').toString();
  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return json({ error: 'Invalid email' }, 400, cors);
  }

  // Honeypot: silently succeed for bots.
  if (body?.website || body?._honey) {
    return json({ ok: true }, 200, cors);
  }

  // Rate limit: 3 signups / hour / IP (waitlist#6).
  if (await isRateLimited(env, ip)) {
    return json({ error: 'Too many signups from here. Please try again in a bit.' }, 429, cors);
  }

  // Bot check: verify the Turnstile token if configured (waitlist#8).
  if (!(await turnstileOK(env, token, ip))) {
    return json({ error: 'Could not verify you are human. Please try again.' }, 403, cors);
  }

  const signup = {
    email,
    source,
    ts: new Date().toISOString(),
    ua: (request.headers.get('user-agent') || '').slice(0, 200),
    ip,
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

    // Slack real-time signup feed (fire-and-forget; never block the response).
    // Set SLACK_WEBHOOK_URL in the Cloudflare Pages env to enable.
    if (env.SLACK_WEBHOOK_URL) {
      const slackBody = {
        text: `Waitlist signup: ${email}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:incoming_envelope: *Waitlist signup*\n\`${email}\``,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `source · \`${signup.source}\` · ip · \`${signup.ip}\` · ${signup.ts}`,
              },
            ],
          },
        ],
      };
      // ctx.waitUntil so the worker doesn't get killed before the POST flushes
      // and the user response isn't blocked on Slack latency.
      const slackPost = fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackBody),
      }).catch((e) => console.error('[waitlist] slack post failed:', e));
      if (typeof waitUntil === 'function') waitUntil(slackPost);
    }

    /* --- Alternate backends (uncomment one) ---
    // Resend audience:
    // await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, { ... });
    //
    // Google Sheets webhook:
    // await fetch(env.SHEETS_WEBHOOK_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(signup) });
    */

    return json({ ok: true }, 200, cors);
  } catch (err) {
    console.error('[waitlist] error:', err);
    return json({ error: 'Could not save right now. Please try again shortly.' }, 500, cors);
  }
}
