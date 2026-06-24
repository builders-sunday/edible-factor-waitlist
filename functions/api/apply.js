/**
 * EdibleFactor - Anonymous job application proxy (Cloudflare Pages Function)
 * -----------------------------------------------------------------------------
 * POST /api/apply
 * Body: { job_id, full_name, email, phone, experience_years?, languages?[],
 *         gender?(any|male|female), age?, cuisines?[], note?, website? (honeypot) }
 *
 * Same-origin proxy in front of POST /v1/public/jobs/{id}/applications. Keeps
 * the page CSP `connect-src 'self'` happy and avoids CORS. Workers runtime,
 * Web standard Request/Response, no Node APIs.
 */

const DEFAULT_BACKEND = 'https://api.ediblefactor.com';
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS = new Set(['any', 'male', 'female']);

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function str(v, max) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

function strArray(v, maxItems, maxLen) {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((x) => str(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
  return out.length ? out : undefined;
}

function posInt(v, max) {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(n, max);
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

  const jobId = str(body?.job_id, 24);
  if (!OBJECT_ID.test(jobId)) {
    return json({ error: 'This opening is no longer available.' }, 400);
  }

  const fullName = str(body?.full_name, 120);
  const email = str(body?.email, 200).toLowerCase();
  const phone = str(body?.phone, 40);

  if (!fullName) return json({ error: 'Please enter your name.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
  if (phone.replace(/\D/g, '').length < 10) return json({ error: 'Please enter a valid phone number.' }, 400);

  // Only forward fields the backend models; never proxy arbitrary keys.
  const payload = { full_name: fullName, email, phone };

  const exp = posInt(body?.experience_years, 60);
  if (exp !== undefined) payload.experience_years = exp;

  const languages = strArray(body?.languages, 12, 40);
  if (languages) payload.languages = languages;

  const gender = str(body?.gender, 10).toLowerCase();
  if (GENDERS.has(gender)) payload.gender = gender;

  const age = posInt(body?.age, 99);
  if (age !== undefined) payload.age = age;

  const cuisines = strArray(body?.cuisines, 20, 40);
  if (cuisines) payload.cuisines = cuisines;

  const note = str(body?.note, 1000);
  if (note) payload.note = note;

  try {
    const upstream = await fetch(`${base}/v1/public/jobs/${jobId}/applications`, {
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
    console.error('[careers] apply proxy failed:', err);
    return json({ error: 'Could not submit right now. Please try again shortly.' }, 502);
  }
}
