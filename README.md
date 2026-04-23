# EdibleFactor — Waitlist Landing Page

Single-page waitlist site for EdibleFactor. Drop into Vercel, set one config value, ship.

## What's in this folder

```
├── index.html          # The whole site — styles, scripts, screenshots all inlined
├── api/
│   └── waitlist.js     # Optional Vercel Function (only if you choose Option B below)
└── README.md           # This file
```

If you pick **Option A (Formspree)**, you can delete `api/` entirely — you only need `index.html`.

---

## Deploy to Vercel (3 minutes)

### Install the Vercel CLI once
```bash
npm install -g vercel
```

### Deploy
From inside this folder:
```bash
vercel            # first run: follow prompts, hit Enter for defaults
vercel --prod     # promote to your production URL
```

You'll get a URL like `ediblefactor-waitlist.vercel.app`. SSL is automatic.

### Custom domain
In the Vercel dashboard → your project → **Settings → Domains** → add your domain (e.g. `ediblefactor.com`). Vercel gives you the DNS records to point at from your registrar. Usually live within 5–30 minutes.

---

## Wire up the form — pick ONE

Open `index.html` and find the config block near the top of `<script>` (around line 1870). It looks like this:

```js
const FORMSPREE_ID = 'YOUR_FORMSPREE_ID';
const USE_VERCEL_FN = false;
```

### Option A — Formspree (easiest)

Best if you just want emails in your inbox and don't need to build an email-sending pipeline yet.

1. Go to [formspree.io](https://formspree.io) → sign up (free)
2. **Create New Form** → give it a name like "EdibleFactor Waitlist" → choose the email to receive notifications
3. Copy the form ID from the endpoint URL (e.g. from `https://formspree.io/f/xwkgwvdy`, the ID is `xwkgwvdy`)
4. Paste it in `index.html`:
   ```js
   const FORMSPREE_ID = 'xwkgwvdy';  // ← your real ID
   ```
5. Redeploy (`vercel --prod`). Done.

Free tier: **50 submissions/month**. Upgrade or migrate to Option B when you outgrow it.

You can delete the `api/` folder if you go this route.

### Option B — Vercel Function (own your data)

Best if you want to pipe signups into Loops/Resend/Supabase/Google Sheets, or want full control.

1. Keep the `api/waitlist.js` file in this folder
2. In `index.html`, set:
   ```js
   const FORMSPREE_ID = 'YOUR_FORMSPREE_ID';  // leave as-is (unused)
   const USE_VERCEL_FN = true;
   ```
3. Open `api/waitlist.js` and pick a storage option — see the comments inside. Defaults to **log-only** (signups appear in Vercel's runtime logs), which is fine for the first few hours.
4. For real storage (recommended within the first day), uncomment one of:
   - **Loops.so** — purpose-built for waitlists, free up to 1000 contacts. Recommended.
   - **Resend audience** — if you're already using Resend for transactional email.
   - **Google Sheets** — via an Apps Script webhook URL.
   - **Supabase** — full database, if you'll need queries later.
5. Add any required API keys in Vercel dashboard → **Settings → Environment Variables**
6. Redeploy (`vercel --prod`)

---

## Recommended stack for an actual launch

For most people, the smoothest path is:

**Formspree** for the first few days (literally 2 minutes to set up), **then migrate to Loops.so + Vercel Function** when you hit ~40 signups. Loops lets you send "you're in" emails when beta seats open — which Formspree can't do.

---

## Editing the page

### Change copy
Everything editable lives in the `<body>` of `index.html`. Look for the hero title, the problem frictions, the chapter headings in `<div class="showcase__chapter">`, and the waitlist section.

### Change colors
Colors are CSS variables at the top of the `<style>` block:
```css
--periwinkle: #a8aaff;   /* brand */
--calorie:    #6eddf0;   /* calorie accent */
--budget:     #ff8a4a;   /* budget accent */
```

### Change screenshots
The screenshots are base64-inlined in the HTML (lines starting with `src="data:image/webp;base64,...`). To swap one:
1. Convert a new PNG/JPG to WebP (online or `cwebp image.png -o image.webp`)
2. Base64-encode it: `base64 -i image.webp > image.b64`
3. Replace the matching `data:image/webp;base64,...` block

Alternatively, move the screenshots to external files in `/public/screenshots/` and reference them via regular `src="/screenshots/01-dashboard.webp"`. Slightly faster first paint.

---

## Troubleshooting

**"Something went wrong. Try again?"** on submit
- Open browser devtools → Console → look at the logged error
- If using Formspree: confirm the form ID is correct and the form is active in your Formspree dashboard
- If using Vercel Function: check Vercel dashboard → Logs tab for `/api/waitlist` errors

**Form submits but nothing arrives**
- Formspree: check your spam folder for the "new submission" email — first one gets filtered sometimes. Whitelist `no-reply@formspree.io`.
- Vercel Function (log-only): submissions are in Vercel dashboard → your project → Logs

**Page looks broken on mobile**
- Hard-refresh (cache). The page has a custom mobile carousel — if you added overrides check the `@media (max-width: 900px)` block isn't being bypassed.

---

## What's NOT in this page (intentionally)

- No analytics. Add your own: Plausible, Fathom, or Vercel Analytics (free, one line).
- No cookies.
- No tracking pixels.
- No third-party fonts beyond Google Fonts (Instrument Serif + Inter + JetBrains Mono).

Feel free to add what you need.

---

*Made with care. Made in Bengaluru.*
