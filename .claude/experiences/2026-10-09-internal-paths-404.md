# Repo-internal files 404, and unknown URLs stop returning the homepage

- **Status** - branch `bug/block-internal-paths-404`, closes waitlist#119.
  Root `404.html`, `_routes.json` and `functions/_middleware.js` added.

- **Context** - Pages publishes the repo root, so on 2026-10-09 every
  committed working file was live with its raw contents: `CLAUDE.md`, both
  `ARCHITECTURE.md`s, `README.md`, the `.claude/` decision log, the four
  `.drafts/` posts, `scripts/`, `tools/capture-mockups/`, `write-version.mjs`
  and `.gitignore`. Separately, with no root `404.html`, Pages treats the
  site as a single-page app and answers EVERY unknown path with the homepage
  and a `200` (a soft 404), so `/anything` looked like a real page to
  crawlers.

- **The why, as given** - found by the 2026-10-09 fleet hygiene sweep and
  filed as #119: an information and draft-confidentiality leak (no secrets;
  the repo is public on GitHub anyway), plus the soft-404 SEO defect.

- **Options**
  1. Move the site into a subdirectory and point the Pages build output at
     it. Cleanest (nothing internal is ever uploaded), but it is a Cloudflare
     dashboard setting change and moves every file. Not an agent call.
  2. A `functions/_middleware.js` with no `_routes.json`. Works, but adding
     a root middleware makes Pages generate `include: ["/*"]`, so every page
     and asset request would run a Function (cost and latency for nothing).
  3. A middleware scoped by a hand-written `_routes.json` `include` list:
     `/api/*` plus the internal paths. Chosen.
  4. A `_redirects` rule. Rejected: Pages `_redirects` cannot return `404`;
     a `200` rewrite to the 404 page would just be another soft 404.

- **What we found**
  - Cloudflare's docs only document directory wildcards in `_routes.json`
    (`/build/*`), so the list uses explicit paths and directory wildcards,
    never `/*.md`. Limits: 100 rules, 100 chars each, and a rule ending in
    `/*` may not overlap another rule.
  - If `_routes.json` is invalid, wrangler (and Pages) fall back to
    `include: ["/*"]`. That is why the middleware does NOT simply 404
    everything that is not `/api`: it carries its own explicit `INTERNAL`
    pattern, so the fallback costs invocations instead of taking the site
    down. Two lists, kept in step by a comment in each place and a row in
    `ARCHITECTURE.md`'s review table.
  - `_headers` is not applied to Function responses, so the middleware
    repeats the `/*` security headers on its 404s.
  - Measured under `wrangler pages dev .` with an instrumented copy: the
    middleware ran only for `/api/*` and the internal paths; 15 page, asset
    and unknown-path requests never invoked it.
  - Residual, measured locally: routing matches the raw path, so a
    percent-encoded or double-slash variant (`/CLAUDE%2Emd`, `//CLAUDE.md`)
    does not invoke the Function and the asset server still serves the
    file. Crawlers do not generate these, and the content is already public
    on GitHub. Option 1 is the only complete fix.

- **Decision** - option 3 now; option 1 stays open for a human.

- **Revisit if** - a new file or folder lands at the repo root (add it to
  both lists), something sensitive is ever committed (option 1 becomes
  necessary, not optional), or analytics show real traffic to an old URL
  that now 404s (add a `_redirects` entry for it).
