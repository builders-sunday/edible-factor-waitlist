# HTML entry-point caching: the max-age=300 "fix" was the bug

- **Status** - branch `chore/html-cache-freshness`. `_headers` HTML rules
  changed from `max-age=300, must-revalidate` to `max-age=0, must-revalidate`;
  repo CLAUDE.md updated to match.

- **The why, as given** - "fix the ?v=N cache-buster for index.html too,
  search for other fixes and deliberate." Trigger: two deploys on 2026-07-29
  where `version.json` reported the new commit while a plain fetch of `/`
  still returned the previous build, and only a `Cache-Control: no-cache`
  request header got fresh HTML.

- **What we found, measured on the live edge, and it inverts the framing**
  - Cloudflare Pages' own default for HTML is `public, max-age=0,
    must-revalidate` - always fresh. `/legal`, `/why-not-petpooja` and `/v2/`
    serve exactly that today because `_headers` never covered them, and none
    of them has ever been reported stale.
  - The repo's `_headers` OVERRODE that default with `max-age=300` on
    precisely `/`, `/index.html` and `/careers` - so the only pages permitted
    to serve five minutes stale were the ones someone had written a caching
    rule for. The uncovered pages were correct by omission.
  - Pages sends NO ETag and no Last-Modified on HTML (verified with a full
    header dump; `version.json` and the webps do get ETags). So
    "revalidate" on HTML has no cheap 304 path - the 300s window was buying
    a saved fetch only for repeat visits inside five minutes, at the price of
    every user being able to see a build that no longer exists.
  - This matters more here than on a normal site: index.html inlines ALL of
    the site's CSS and JS. Stale HTML is not a stale shell, it is the entire
    stale product - the exact "fix shipped but users saw the old styles and
    re-reported the bug" failure the fleet has already named (The Unbumped
    Cache-Buster).

- **Why `?v=N` cannot solve this one** - the convention versions REFERENCES:
  an edited asset gets a new URL at its call site. The entry point has no
  call site; users arrive at `/` bare. An entry URL cannot version itself, so
  its freshness must come from response headers. This entry is the record
  that the two mechanisms are complementary, not alternatives: `?v=N` for
  subresources, `max-age=0` for the documents that reference them.

- **Options deliberated**
  1. `no-store` - rejected. Forbids storing entirely; back/forward and
     same-session revisits re-download with no upside over max-age=0, and it
     is semantically reserved here for `version.json`, where "never even keep
     a copy" is the point.
  2. `no-cache` - functionally identical to `max-age=0, must-revalidate` for
     HTTP caches. Rejected only on phrasing: the platform default uses the
     max-age=0 form, and matching it makes "our rules equal the default"
     visible on inspection.
  3. Keep 300, shorten to 60 - rejected. Bounds the staleness window instead
     of closing it; with no ETag there is still no 304 economy to protect,
     so the trade buys nothing.
  4. `stale-while-revalidate` - rejected. First visitor after every deploy
     still gets the dead build, which is precisely the reported symptom.
  5. **`max-age=0, must-revalidate` (chosen)** - the platform default,
     already proven on this very site by every page `_headers` forgot.
     Cost: one compressed (~50KB) HTML fetch per navigation. Right trade for
     a marketing page whose deploys must be visible when they ship.
  Also considered and deliberately NOT done: adding explicit rules for
  `/legal`, `/v2/*` etc. They are correct via the default; writing rules for
  them would recreate the override-goes-stale hazard this entry documents.
  Fewer rules, matching the default, is the fix.

- **What the header change does NOT fix, said plainly** - Pages rollout
  propagation. For a minute or so after a merge, different edge nodes can
  serve different builds, and `version.json` (no-store) can flip before the
  HTML settles - that is deployment skew, not caching, and no response
  header removes it. The deploy-verification consequence is recorded in
  CLAUDE.md: if version.json and the served HTML disagree, poll again; a
  content sentinel grep in the HTML is the stronger proof.

- **Verified** - locally via `npx wrangler pages dev .` (the repo's own
  method): `/` and `/careers` serve the new `max-age=0`, `/version.json`
  keeps `no-store`, `/legal` confirms the platform default is byte-identical
  to what we now set. Live verification after merge: response headers on `/`
  show `max-age=0` and a plain no-header curl returns the new build's
  sentinel.

- **Revisit if** - the site ever splits its CSS/JS out of index.html into
  versioned files (then HTML staleness becomes survivable and a small
  max-age could return), or Pages starts sending ETags on HTML (then
  revalidation becomes a 304 and this policy gets cheaper still).
