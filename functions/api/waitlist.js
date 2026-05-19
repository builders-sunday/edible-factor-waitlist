/**
 * EdibleFactor, Waitlist endpoint (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * POST /api/waitlist
 * Body: { email: string, source?: string, ts?: string, 'cf-turnstile-response'?: string }
 *
 * Runs on Cloudflare Workers runtime via Pages Functions. Same-origin by default
 * (no CORS needed when called from this site). Cross-origin requests are only
 * allowed from the explicit allowlist below.
 *
 * SECURITY LAYERS (in order, top to bottom of onRequestPost):
 *   1. CORS allowlist, explicit apex + www only (no more *.pages.dev wildcard).
 *   2. KV-backed rate limit, 3 signups per hour per CF-Connecting-IP.
 *   3. Cloudflare Turnstile siteverify, validates token before accepting email.
 *   4. Honeypot field (silently succeeds for bots).
 *
 * REQUIRED env vars / bindings in the Cloudflare Pages project:
 *   - TURNSTILE_SITE_KEY    (public, also inlined in index.html)
 *   - TURNSTILE_SECRET_KEY  (server secret)
 *   - EF_WAITLIST_RATELIMIT (KV namespace binding)
 *   - LOOPS_API_KEY         (optional, forwards signups to Loops.so)
 *   - SLACK_WEBHOOK_URL     (optional, real-time signup feed)
 */

// Explicit allowlist. The pages.dev wildcard was removed (security issue #7),
// any sibling Cloudflare Pages project could previously call this endpoint.
const ALLOWED_ORIGINS = new Set([
  'https://ediblefactor.com',
  'https://www.ediblefactor.com',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limit: 3 signups per IP per rolling hour.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

function corsHeaders(origin) {
  const headers = { 'Vary': 'Origin' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
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

/**
 * KV-backed sliding-window-ish counter. We store a single integer per IP with
 * a TTL equal to the window length; once the TTL expires the counter resets.
 * This is approximate (a true sliding window would need a list of timestamps),
 * but for "3/hour" abuse prevention it is plenty and uses 1 KV read + 1 write.
 *
 * Returns { allowed: boolean, count: number, retryAfter: number }.
 */
async function checkRateLimit(kv, ip) {
  if (!kv || !ip || ip === 'unknown') {
    return { allowed: true, count: 0, retryAfter: 0 };
  }
  const key = `rl:waitlist:${ip}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) || 0 : 0;
  if (count >= RATE_LIMIT_MAX) {
    return { allowed: false, count, retryAfter: RATE_LIMIT_WINDOW_SECONDS };
  }
  // Bump the counter. expirationTtl re-arms on each write, which means a
  // determined attacker can keep the window open by hammering; that is fine
  // here because they hit the cap on the very next request anyway.
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS });
  return { allowed: true, count: count + 1, retryAfter: 0 };
}

/**
 * Validate a Turnstile token against Cloudflare's siteverify endpoint.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
async function verifyTurnstile(secret, token, ip) {
  if (!secret) {
    // No secret configured. Fail closed in prod, but log loudly so the issue
    // is visible in dashboard logs rather than silently letting bots through.
    console.error('[waitlist] TURNSTILE_SECRET_KEY missing, rejecting request');
    return false;
  }
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    if (!r.ok) {
      console.error('[waitlist] turnstile siteverify HTTP', r.status);
      return false;
    }
    const data = await r.json();
    if (!data.success) {
      console.warn('[waitlist] turnstile rejected:', data['error-codes']);
    }
    return Boolean(data.success);
  } catch (e) {
    console.error('[waitlist] turnstile siteverify threw:', e);
    return false;
  }
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
  const turnstileToken = (body?.['cf-turnstile-response'] || body?.turnstileToken || '').toString();

  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return json({ error: 'Invalid email' }, 400, cors);
  }

  // Honeypot, silently succeed for bots.
  if (body?.website || body?._honey) {
    return json({ ok: true }, 200, cors);
  }

  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

  // Rate limit (issue #6). 3 per hour per IP.
  const rl = await checkRateLimit(env.EF_WAITLIST_RATELIMIT, ip);
  if (!rl.allowed) {
    return json(
      { error: 'Too many signup attempts. Please try again in an hour.' },
      429,
      { ...cors, 'Retry-After': String(rl.retryAfter) },
    );
  }

  // Turnstile (issue #8). Validate the captcha token before accepting the email.
  const captchaOk = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, ip);
  if (!captchaOk) {
    return json({ error: 'Captcha verification failed. Please try again.' }, 403, cors);
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

    /* Alternate backends (uncomment one) ──────────────────────────────────
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
