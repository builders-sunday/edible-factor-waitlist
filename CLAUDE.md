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

## Publishing / going live - the deploy workflow

**Trigger phrases:** "deploy it", "publish the changes", "make it live", "push it live", "ship it", "go live", or any equivalent. Merging a PR into `main` **is** the deploy - Pages' Git integration builds and serves whatever is on `main` within about a minute, no separate deploy command required (see the TL;DR at the top of this file and `docs/ARCHITECTURE.md`).

1. Branch off `main`, make the change, open a PR (this repo's normal flow - see recent history for the pattern).
2. **Before the final commit on the branch**, run `node write-version.mjs` and commit the resulting `version.json` alongside the change. Because there's no build step here (Pages just serves the checked-out root as-is), `version.json` is a committed file, not a generated build artifact - see the note in `write-version.mjs` and the caveat below.
3. Merge the PR into `main` (`gh pr merge --squash`). That merge is what goes live.
4. Confirm the merge commit is actually live - see "Confirming a deploy landed" below.

**Known one-commit lag:** `write-version.mjs` reads `git rev-parse HEAD` *before* `version.json` is committed, so the sha it records is the parent of the commit that actually ships it (the commit adding `version.json` can't know its own future hash). In practice this means `version.json`'s commit will match the merge commit if you squash-merge the PR (GitHub creates one new commit on `main`, and `version.json`'s recorded parent sha becomes irrelevant - what matters is that the squash commit lands and `version.json`'s *content* is on `main`). If you ever commit `version.json` directly to `main` outside a PR, expect the recorded commit to be one behind true HEAD by exactly that commit - don't chase perfect precision here, just don't be surprised by it.

## Confirming a deploy landed

**Use this for every deploy, not just when something seems off.** `https://ediblefactor.com/version.json` reports the commit that was live in the build that shipped it:

```json
{ "commit": "<full sha>", "shortCommit": "<7 chars>", "branch": "main", "builtAt": "<ISO timestamp>" }
```

It's a plain static file at the repo root, written by `write-version.mjs` and committed like any other file (no build step exists to generate it fresh per deploy - see the workflow above). `_headers` sets `Cache-Control: no-store` on `/version.json` so every read hits the origin.

**The check:**
```bash
git log -1 --format=%H -- version.json   # commit that last touched version.json on main
curl -s https://ediblefactor.com/version.json | jq -r .commit
```
Because of the one-commit lag described above, treat a match on `shortCommit`/timestamp recency as confirmation the right deploy shipped, not a byte-for-byte sha match against `git rev-parse HEAD` on `main`. If `version.json` hasn't changed in a while relative to your latest merge, the deploy may still be in flight - poll again rather than trusting a plain `curl -o /dev/null -w "%{http_code}"` 200, which only proves *some* build is live.

## Clarifying questions

When a request is ambiguous or underspecified, don't guess — ask a clarifying question, and with it propose 2–4 concrete candidate answers you generate yourself (distinct options covering the likely intent) so I can pick or redirect. Before asking, double-check the question and its options **twice**: confirm the question is the real blocker and that each option is accurate, distinct, and plausible. If a sensible default clearly exists, state your assumption and proceed instead of asking.

## Ticket-first workflow (fleet-wide)

Before writing any code in this repo, create a ticket on the Edible Factor project board and plan it there first. The board is the single place we capture every idea, bug, enhancement, and feature across the fleet. It is the source of truth, not scattered per-repo issues.

- Board: https://github.com/orgs/builders-sunday/projects/1
- Flow: create the item first, set its fields, write the plan on the item, THEN branch and build. Process before code: no code before a ticket exists.
- Required fields on every ticket, leave nothing blank: Category (Bug / Feature / Enhancement / Concern), Priority (P0 to P3), Area, Assignee, Start date, and Expected close date. Start date and Expected close date are mandatory going forward: the requester answers them when filing the ticket, or the AI fills them in when it creates the ticket.
- Name the repos involved on the ticket itself. Most changes span more than one repo (backend, web, plate, scouter, waitlist, human, ios), so list every repo the change touches in the "Repos to change" field, so cross-repo work stays visible from the board.

## Experiences (decision log)

`.claude/experiences/` is this repo's durable record of significant
decisions and experiments: what we tried, what we decided, and why.
Format and index are in `.claude/experiences/README.md`.

Three standing rules:

1. **Consult before big decisions.** Before an architecture change, a
   dependency add or removal, a feature removal, a big refactor, or
   re-running a previously rejected experiment, read the experiences
   index and weigh any relevant entry before relitigating it.
2. **Ask why, then record it.** When asked to do or undo something
   significant and the reason is not stated, ask (what triggered this,
   what did it cost, what were the pain points) and capture the answer
   in the entry. The why is the point; git history already has the what.
3. **Append after the fact.** After any non-trivial decision, tradeoff,
   rejection, or significant experiment/analysis (including agent-run
   ones like an SEO pass or a perf audit), add a dated entry and index
   it, in the same PR as the change where possible.
