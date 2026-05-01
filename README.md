# EdibleFactor — Waitlist Landing Page

Single-page waitlist site for EdibleFactor. Static HTML + a single Cloudflare Pages Function for the form. No build step required.

## What's in this folder

```
├── index.html                  # The whole site — styles, scripts, SVGs inlined
├── functions/
│   └── api/
│       └── waitlist.js         # Cloudflare Pages Function (POST /api/waitlist)
├── mockups/                    # Phone screenshots used in the deck
├── _headers                    # Cache-Control + security headers (CF Pages)
└── README.md
```

---

## Deploy to Cloudflare Pages (3 minutes)

### Option 1 — Connect the GitHub repo (recommended)

1. Push to GitHub.
2. [Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git](https://dash.cloudflare.com).
3. Pick this repo. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave blank)*
   - **Build output directory**: `/`
4. Deploy. You get a URL like `ediblefactor-waitlist.pages.dev`.

`functions/api/waitlist.js` is detected automatically and routed to `/api/waitlist`. SSL is automatic.

### Option 2 — Wrangler CLI

```bash
npm i -g wrangler
wrangler pages deploy . --project-name ediblefactor-waitlist
```

### Custom domain

Cloudflare dashboard → your Pages project → **Custom domains** → add `ediblefactor.com`. If your domain is already on Cloudflare DNS, it provisions instantly. Otherwise you'll get DNS records to add at your registrar.

---

## Wire up the form storage

The endpoint defaults to **log-only** (signups appear in `wrangler tail` / dashboard logs). Good for the first hours; move to real storage within a day.

### Loops.so (recommended — free up to 1000 contacts)

1. Sign up at [loops.so](https://loops.so), grab an API key.
2. In Cloudflare dashboard → your Pages project → **Settings → Environment variables** → add `LOOPS_API_KEY`.
3. Redeploy. The function picks it up automatically.

### Other backends

`functions/api/waitlist.js` has commented templates for **Resend audience**, **Google Sheets webhook**, and **Supabase**. Uncomment one, set the matching env vars in the Pages dashboard, redeploy.

---

## Editing the page

### Change copy
Everything editable lives in the `<body>` of `index.html`. Look for the hero title, the problem frictions, the chapter headings in `.deck-chapter`, and the waitlist section.

### Change colors
CSS variables at the top of the `<style>` block:
```css
--periwinkle: #a8aaff;   /* brand */
--calorie:    #6eddf0;   /* calorie accent */
--budget:     #ff8a4a;   /* budget accent */
```

### Change screenshots
Drop a new `.webp` into `/mockups/` and update the matching `<img src="/mockups/...">` reference in `index.html`. Cache-Control is set to immutable, so use a fresh filename when replacing.

### Add new utility classes
The page uses a precompiled subset of Tailwind utilities, inlined into the `<style>` block. If you add a class that isn't already covered, regenerate the subset:

```bash
npx tailwindcss@3.4.10 -c <(echo "module.exports={content:['./index.html'],theme:{extend:{colors:{bg:'#07070b',bg2:'#0c0c12',ink:'#eceaf3',inkdim:'#9693ac',inklow:'#4f4d63',periwinkle:'#a8aaff',calorie:'#6eddf0',budget:'#ff8a4a'}}},corePlugins:{preflight:false}}") \
  -i <(echo "@tailwind utilities;") -o /tmp/utils.css --minify
```

Then paste the output into the `/* === Static utility set === */` block at the bottom of the `<style>` block.

---

## Local development

Static files: open `index.html` in a browser, or `npx serve .` to run a local server.

To test the waitlist function locally:
```bash
npm i -g wrangler
wrangler pages dev .
# → http://localhost:8788
```

---

## Troubleshooting

**"Something went wrong. Try again?"** on submit
- Open devtools → Network → look at `/api/waitlist` response.
- Check Pages dashboard → Functions → real-time logs.

**Form submits but nothing arrives**
- If `LOOPS_API_KEY` isn't set, signups are log-only (visible in `wrangler tail`).
- If Loops is configured, check your Loops dashboard.

**Page looks broken on mobile**
- Hard-refresh (cache). The `@media (max-width: 900px)` and `(max-width: 640px)` blocks own the mobile layout.

---

## What's NOT in this page (intentionally)

- No analytics. Add Cloudflare Web Analytics (free, one snippet) or Plausible.
- No cookies.
- No tracking pixels.
- No third-party JS beyond Google Fonts CSS.

---

*Made with care. Made in Bengaluru.*
