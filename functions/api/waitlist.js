/**
 * EdibleFactor - Waitlist + engagement-funnel endpoint (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * POST /api/waitlist
 *
 * Two shapes share this one endpoint (same-origin, kept relative in index.html):
 *
 *   1. Classic signup (unchanged contract - the hero email form):
 *      { email, source?, ts?, 'cf-turnstile-response'? }
 *
 *   2. Progressive engagement funnel (new), distinguished by `stage`:
 *      { stage: 'tap',     sid }                          - Stage 1, one heart tap, no PII
 *      { stage: 'chips',   sid, answers: string[] }       - Stage 2, tap-select feedback, no PII
 *      { stage: 'contact', sid, email?, phone?, source? } - Stage 3, email OR phone (either optional)
 *
 * The funnel COMPLEMENTS the email form; it does not replace it. A request with
 * no `stage` defaults to 'contact', so the existing hero email form keeps working
 * byte-for-byte. `sid` is a client-generated session id that threads all three
 * stages so the funnel can be joined downstream before any PII exists.
 *
 * STORAGE: defaults to log-only. Set LOOPS_API_KEY to forward email signups to
 * Loops.so; SLACK_WEBHOOK_URL to mirror activity to Slack. Both optional.
 *
 * SECURITY (all stages): honeypot short-circuit, KV rate limit (strict 3/hour on
 * contact, lenient 30/hour on cheap tap/chips events), and Turnstile siteverify
 * on the contact path when TURNSTILE_SECRET is configured (degrades open, honeypot
 * still guards, so the form never breaks before the secret is bound).
 */

// CORS: only this waitlist Pages project (incl. its branch previews) + the real
// domains. Tightened off the old `*.pages.dev` regex (waitlist#7) so an arbitrary
// Cloudflare Pages project can no longer call the signup endpoint.
const ALLOWED_ORIGIN = /^https?:\/\/([a-z0-9-]+\.)?(edible-factor-waitlist|ediblefactor-waitlist)\.pages\.dev$|^https?:\/\/(www\.)?ediblefactor\.(com|app|in)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose phone check: 7-20 chars of digits, spaces, and + ( ) - separators.
const PHONE_RE = /^[+]?[\d\s()-]{7,20}$/;
const FUNNEL_STAGES = new Set(['tap', 'chips', 'contact']);

// Rate limit (waitlist#6): KV counter keyed per IP. Bind a KV namespace as
// RATE_LIMIT in the Pages project to enable; degrades to no-op if unbound so
// signups never break before the binding exists.
async function isRateLimited(env, bucketKey, max, windowSec) {
  const kv = env.RATE_LIMIT;
  if (!kv || !bucketKey) return false;
  const n = parseInt((await kv.get(bucketKey)) || '0', 10);
  if (n >= max) return true;
  await kv.put(bucketKey, String(n + 1), { expirationTtl: windowSec });
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

// Fire-and-forget Slack mirror. Never blocks or fails the user response.
function postSlack(env, waitUntil, text, context) {
  if (!env.SLACK_WEBHOOK_URL) return;
  const body = {
    text,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: context }] },
    ],
  };
  const p = fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((e) => console.error('[waitlist] slack post failed:', e));
  if (typeof waitUntil === 'function') waitUntil(p);
}

// Assign an idempotent queue position per email using KV (reuses the already
// bound RATE_LIMIT namespace). Returns { position, isNew }. FAILS OPEN: with no
// KV bound, or on any KV error, returns { position: null, isNew: true } so the
// signup still succeeds - the position is a nice-to-have, not a gate. Keys are
// prefixed wlq: so they never collide with the wl:/wlf: rate-limit keys, and
// carry no TTL (a position is permanent). Note: KV has no atomic increment, so
// a rare concurrent race can reuse a number - acceptable for a waitlist.
async function assignPosition(env, email) {
  const kv = env.WAITLIST_KV || env.RATE_LIMIT;
  if (!kv || !email) return { position: null, isNew: true };
  try {
    const existing = await kv.get(`wlq:pos:${email}`);
    if (existing) return { position: parseInt(existing, 10) || null, isNew: false };
    const current = parseInt((await kv.get('wlq:count')) || '0', 10);
    const position = current + 1;
    await kv.put('wlq:count', String(position));
    await kv.put(`wlq:pos:${email}`, String(position));
    return { position, isNew: true };
  } catch (e) {
    console.error('[waitlist] position error:', e);
    return { position: null, isNew: true };
  }
}

// Fire-and-forget Loops transactional confirmation email ("you're #N on the
// list"). FAILS OPEN: skipped unless BOTH LOOPS_API_KEY and LOOPS_CONFIRMATION_ID
// are set (the latter is the transactional template id created in the Loops
// dashboard, whose body references {position}). Never blocks the user response.
function sendLoopsConfirmation(env, waitUntil, email, position) {
  if (!env.LOOPS_API_KEY || !env.LOOPS_CONFIRMATION_ID) return;
  const p = fetch('https://app.loops.so/api/v1/transactional', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: env.LOOPS_CONFIRMATION_ID,
      email,
      dataVariables: { position: position != null ? position : '' },
    }),
  })
    .then(async (r) => {
      if (!r.ok) console.error('[waitlist] Loops confirmation failed:', r.status, await r.text().catch(() => ''));
    })
    .catch((e) => console.error('[waitlist] Loops confirmation error:', e));
  if (typeof waitUntil === 'function') waitUntil(p);
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

  // Honeypot first, applies to every stage: silently succeed for bots.
  if (body?.website || body?._honey) {
    return json({ ok: true }, 200, cors);
  }

  const stage = FUNNEL_STAGES.has(body?.stage) ? body.stage : 'contact';
  const sid = (body?.sid || '').toString().slice(0, 64);
  const source = (body?.source || 'unknown').toString().slice(0, 50);
  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ua = (request.headers.get('user-agent') || '').slice(0, 200);
  const referer = (request.headers.get('referer') || '').slice(0, 200);

  // ----- Cheap, no-PII engagement events (Stage 1 tap, Stage 2 chips) -----
  // Honeypot-guarded above; a lenient rate limit only caps flood/log-spam.
  if (stage === 'tap' || stage === 'chips') {
    if (!sid) return json({ error: 'Missing session' }, 400, cors);
    if (await isRateLimited(env, `wlf:${ip}`, 30, 3600)) {
      // Do not surface an error for a cheer tap - just accept-and-drop.
      return json({ ok: true }, 200, cors);
    }
    const answers = Array.isArray(body?.answers)
      ? body.answers.slice(0, 12).map((a) => String(a).slice(0, 60))
      : [];
    const event = { stage, sid, source, answers, ts: new Date().toISOString(), ip, ua, referer };
    console.log('[waitlist:funnel]', JSON.stringify(event));
    postSlack(
      env, waitUntil,
      stage === 'tap' ? ':thumbsup: *Funnel: encouragement tap*' : ':speech_balloon: *Funnel: feedback submitted*',
      `sid \`${sid}\` · ${answers.length ? 'answers `' + answers.join(', ') + '` · ' : ''}source \`${source}\` · ip \`${ip}\``,
    );
    return json({ ok: true }, 200, cors);
  }

  // ----- Stage 3 contact + the classic email form (stage defaults here) -----
  const email = (body?.email || '').toString().trim().toLowerCase();
  const phone = (body?.phone || '').toString().trim();
  const token = (body?.['cf-turnstile-response'] || body?.turnstile || '').toString();

  const hasEmail = email && EMAIL_RE.test(email) && email.length <= 200;
  const hasPhone = phone && PHONE_RE.test(phone);
  if (!hasEmail && !hasPhone) {
    return json({ error: 'Enter a valid email or phone number.' }, 400, cors);
  }

  // Rate limit: 3 signups / hour / IP (waitlist#6) - the strict bucket.
  if (await isRateLimited(env, `wl:${ip}`, 3, 3600)) {
    return json({ error: 'Too many signups from here. Please try again in a bit.' }, 429, cors);
  }

  // Bot check: verify the Turnstile token if configured (waitlist#8).
  if (!(await turnstileOK(env, token, ip))) {
    return json({ error: 'Could not verify you are human. Please try again.' }, 403, cors);
  }

  const signup = { email: email || null, phone: phone || null, sid, source, ts: new Date().toISOString(), ua, ip, referer };

  try {
    // Only email addresses go to Loops; a phone-only supporter is logged/Slacked
    // (Loops is an email audience). Extend here if an SMS list is added later.
    if (hasEmail && env.LOOPS_API_KEY) {
      const r = await fetch('https://app.loops.so/api/v1/contacts/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LOOPS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, source, userGroup: 'EdibleFactor Waitlist', sid }),
      });
      if (!r.ok && r.status !== 409) {
        console.error('Loops error:', r.status, await r.text());
        throw new Error('Loops upstream failed');
      }
    } else {
      console.log('[waitlist]', JSON.stringify(signup));
    }

    // Assign a queue position (idempotent per email) and, for a NEW signup,
    // fire the confirmation email with it. Both degrade gracefully - a returning
    // subscriber gets their original position back and no duplicate email.
    let position = null;
    let alreadySubscribed = false;
    if (hasEmail) {
      const assigned = await assignPosition(env, email);
      position = assigned.position;
      alreadySubscribed = !assigned.isNew;
      if (assigned.isNew) sendLoopsConfirmation(env, waitUntil, email, position);
    }

    postSlack(
      env, waitUntil,
      `:incoming_envelope: *Waitlist signup*${position != null ? ' #' + position : ''}\n\`${email || phone}\``,
      `${sid ? 'sid `' + sid + '` · ' : ''}source \`${signup.source}\` · ip \`${signup.ip}\` · ${signup.ts}`,
    );

    /* --- Alternate backends (uncomment one) ---
    // Resend audience:
    // await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, { ... });
    //
    // Google Sheets webhook:
    // await fetch(env.SHEETS_WEBHOOK_URL, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(signup) });
    */

    return json({ ok: true, ...(position != null ? { position } : {}), ...(alreadySubscribed ? { alreadySubscribed: true } : {}) }, 200, cors);
  } catch (err) {
    console.error('[waitlist] error:', err);
    return json({ error: 'Could not save right now. Please try again shortly.' }, 500, cors);
  }
}
