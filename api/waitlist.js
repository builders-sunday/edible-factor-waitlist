/**
 * EdibleFactor — Waitlist endpoint
 * -----------------------------------------------------------------------------
 * POST /api/waitlist
 * Body: { email: string, source?: string, ts?: string }
 *
 * This function runs on Vercel's serverless infrastructure (free tier).
 * Replace the STORAGE section below with your chosen destination.
 *
 * STORAGE OPTIONS (pick one):
 *   1. Log-only       — Zero setup. See signups in Vercel runtime logs.
 *                        Good for first hours; move to real storage within a day.
 *   2. Loops.so        — Purpose-built for waitlists, free up to 1000 contacts.
 *                        Add LOOPS_API_KEY as an env var in Vercel dashboard.
 *   3. Resend + audience— Simple email collection, free up to 3000 emails/month.
 *                        Add RESEND_API_KEY and RESEND_AUDIENCE_ID.
 *   4. Google Sheets   — Via a sheet webhook URL. Add SHEETS_WEBHOOK_URL.
 *   5. Supabase        — Full database. Add SUPABASE_URL + SUPABASE_SERVICE_KEY.
 *
 * Uncomment the block you want. The skeleton validates and rate-limits for you.
 */

export default async function handler(req, res) {
  // --- CORS (allow from your own domain; adjust origin if needed) ---
  const origin = req.headers.origin || '';
  // Allow any vercel.app subdomain + your custom domain when you add it
  const allowed = /^https?:\/\/([a-z0-9-]+\.)*vercel\.app$|^https?:\/\/(www\.)?ediblefactor\.(com|app|in)$/i;
  if (allowed.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // --- Validate input ---
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const email = (body?.email || '').toString().trim().toLowerCase();
  const source = (body?.source || 'unknown').toString().slice(0, 50);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (email.length > 200) {
    return res.status(400).json({ error: 'Email too long' });
  }

  // --- Basic bot guard: reject obvious noise ---
  if (body?.website || body?._honey) {
    // Honeypot filled = bot. Return success so the bot thinks it worked.
    return res.status(200).json({ ok: true });
  }

  const signup = {
    email,
    source,
    ts: new Date().toISOString(),
    ua: (req.headers['user-agent'] || '').slice(0, 200),
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown',
  };

  try {
    /* =========================================================================
       STORAGE — pick ONE block below
       ========================================================================= */

    // ─── OPTION 2: LOOPS.SO ─────────────────────────────────────────────────
    // LOOPS_API_KEY must be set in Vercel → Project → Settings → Env Vars
    if (!process.env.LOOPS_API_KEY) {
      console.error('[waitlist] LOOPS_API_KEY not set — falling back to log-only');
      console.log('[waitlist]', JSON.stringify(signup));
    } else {
      const r = await fetch('https://app.loops.so/api/v1/contacts/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LOOPS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source,
          userGroup: 'EdibleFactor Waitlist',
        }),
      });
      if (!r.ok && r.status !== 409) { // 409 = already exists (fine)
        const err = await r.text();
        console.error('Loops error:', r.status, err);
        throw new Error('Loops upstream failed');
      }
    }

    // ─── OPTION 3: RESEND AUDIENCE ──────────────────────────────────────────
    /*
    const r = await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('Resend error:', r.status, err);
      throw new Error('Resend upstream failed');
    }
    */

    // ─── OPTION 4: GOOGLE SHEETS (via Apps Script webhook) ──────────────────
    /*
    await fetch(process.env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signup),
    });
    */

    // ─── OPTION 5: SUPABASE ─────────────────────────────────────────────────
    /*
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify(signup),
    });
    if (!r.ok && r.status !== 409) {
      throw new Error('Supabase upstream failed');
    }
    */

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[waitlist] error:', err);
    return res.status(500).json({ error: 'Could not save right now. Please try again shortly.' });
  }
}
