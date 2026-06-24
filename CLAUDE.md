# CLAUDE.md

> **Deployment & runtime:** This is the apex waitlist site at `ediblefactor.com`, hosted on **Cloudflare Pages** (project `edible-factor-waitlist`). Auto-deploys from `main` via Pages' Git integration. The rest of the fleet (plate, web, backend) lives elsewhere - backend runs on Abhi's laptop via Cloudflare Tunnel, not in the cloud. Full details: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page waitlist landing site for EdibleFactor. The entire site is one static `index.html` (markup, styles, scripts, and SVGs all inlined) plus one Cloudflare Pages Function for the form POST and a `mockups/` directory of phone screenshots used in the walkthrough deck.

There is no framework, no bundler, no build step. Editing the site is editing one file.

## Commands

There is no `package.json` at the repo root. The only npm project is the optional mockup-capture tool.

```sh
# Local preview (any static server works)
python3 -m http.server 8765
# → http://localhost:8765/index.html

# Local preview WITH the /api/waitlist function
npx wrangler pages dev .
# → http://localhost:8788

# Deploy preview / prod
npx wrangler pages deploy . --project-name ediblefactor-waitlist

# Refresh phone screenshots from the live app (separate npm project)
cd tools/capture-mockups
npm install            # one-time, ~150MB Playwright + Chromium
npm run capture        # captures iPhone-aspect webps into ../../mockups/
```

To regenerate the inlined utility CSS after adding new Tailwind classes to the markup, see the snippet in `README.md` under "Add new utility classes."

## Architecture

### `index.html` — the entire site

One file, three regions:

1. **`<style>` block.** Three layers, in this order:
   - Custom CSS (CSS variables for colors, all bespoke component styles: `.deck__card`, `.tracker__col`, `.wl-form`, `.dial`, mobile media queries, etc.).
   - A minimal preflight reset (replaces what Tailwind preflight used to do — anchor color/decoration inherit, button reset, `h1–h6` size/weight inherit, `*{box-sizing:border-box}`).
   - A precompiled Tailwind utility subset (~9KB) covering only the classes the markup actually uses.
   The page used to load `cdn.tailwindcss.com` at runtime — that's been replaced. **If you add new utility classes to markup, regenerate the subset** or that class will silently do nothing.

2. **`<body>`.** Hand-written sections with utility classes alongside semantic class names. The card-deck walkthrough is the most non-trivial piece: 4 stacked phone "cards" with `data-pos` attributes (0 = front, 3 = back). JS rotates `data-pos` values to advance/reverse the stack, and `.is-flipping` / `.is-rising` CSS keyframes drive the flip animation. Pointer drag, keyboard arrows, click, and pips all feed into the same `advance(dir)` / `jumpTo(i)` functions.

3. **`<script>` block.** Vanilla JS, no dependencies. Notable bits:
   - IntersectionObserver-driven `.reveal` fade-ins. Anything with class `reveal` starts at `opacity: 0` and reveals when scrolled into view; if you add a new section, add `reveal` to it.
   - Animated counters (`.count`, `.dual-count`) — also IO-triggered, ease out cubic over 2.5s.
   - Form submit: validates email client-side, posts to `WAITLIST_ENDPOINT`, toggles `.wl-error` / `.wl-success` siblings of the form. **Endpoint must be same-origin (`/api/waitlist`)** — do not hardcode an absolute URL; that was the source of the Vercel-origin bug fixed during the Cloudflare migration.

### `functions/api/waitlist.js` — Cloudflare Pages Function

Runs on the Cloudflare Workers runtime, **not Node**. Uses Web standard `Request` / `Response`, exports `onRequestPost` and `onRequestOptions`. Reads the client IP from `cf-connecting-ip` (CF-specific header). Storage backend is selected by env vars set in the CF Pages dashboard:

- `LOOPS_API_KEY` set → forwards signups to Loops.so.
- Otherwise → log-only (visible via `wrangler tail` or in the Pages dashboard logs).

Resend / Google Sheets are left as commented templates inside the file. Pick one, uncomment, set the matching env var.

When editing this file, do not introduce Node-only APIs (`process.env` is replaced with the `env` argument; no `Buffer`, `fs`, etc.).

### `_headers` — Cloudflare Pages headers config

Pages reads this file to apply HTTP headers per path. Long-cache + immutable on `/mockups/*` and `*.webp`; short cache + must-revalidate on HTML; standard security headers. If you add a new asset type that should be long-cached, add a rule here.

### `mockups/` — phone screenshots

Each `.webp` here corresponds to one card in the walkthrough deck. The four currently referenced from `index.html` are `home-dashboard`, `restaurants-browse`, `ai-sommelier`, `calorie-trend`. Adding a card means adding both an `<article class="deck__card">` block in `index.html` and a matching `.webp` here.

Screenshots are not edited by hand. They're regenerated by the capture tool below.

### `tools/capture-mockups/` — separate Playwright project

Self-contained Node script that drives Chromium against the **live EdibleFactor app** (defaults to `https://www.ediblefactor.com`, override with `MOCKUP_SITE=...`) at iPhone 14 Pro viewport (393×852 @ DPR 3), sets the `ef-guest=true` cookie + localStorage to bypass the OAuth wall, captures each route, and writes webps to `../../mockups/`. Has its own `package.json` and `node_modules/`; nothing about the waitlist site depends on it at runtime.

To add or change a mockup, edit the `TARGETS` array in `capture.mjs`, run `npm run capture`, then reference `/mockups/<name>.webp` from `index.html`.

## Things to know before editing

- **One source of truth for the utility CSS.** Editing `class="..."` attributes in markup does not change the inlined utility CSS — that's a separate compile step. New utilities silently no-op until regenerated.
- **`reveal` class is required** on any new top-level block that appears below the fold; otherwise it'll show up but without the fade animation, breaking the rhythm of the page.
- **The deck choreography** (`data-pos`, `flipAway` / `rise` keyframes, drag thresholds) is tightly coupled — modifying the JS without matching CSS, or vice versa, will desync the animation.
- **Form endpoint stays relative** (`/api/waitlist`). The CF Function lives at the same origin; do not reintroduce absolute URLs.
- **Mockups are immutable per filename.** `_headers` sets `Cache-Control: immutable` on them. To replace a screenshot, use a new filename and update the `<img src>` reference, or the old one will stay cached on visitors' browsers for a year.

## Clarifying questions

When a request is ambiguous or underspecified, don't guess — ask a clarifying question, and with it propose 2–4 concrete candidate answers you generate yourself (distinct options covering the likely intent) so I can pick or redirect. Before asking, double-check the question and its options **twice**: confirm the question is the real blocker and that each option is accurate, distinct, and plausible. If a sensible default clearly exists, state your assumption and proceed instead of asking.
