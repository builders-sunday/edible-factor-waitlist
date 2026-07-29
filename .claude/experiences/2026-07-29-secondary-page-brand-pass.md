# Secondary pages onto the landing brand, and the half-fix line

- **Status** - shipped in PR #77 (`e739798`), live and sentinel-verified.
  legal.html fully restyled; careers and why-not-petpooja ground-swapped;
  petpooja's display face converted; manifest icons recolored to wine.

- **The why, as given** - "the privacy page etc. needs to match the main
  landing page's hero, font etc. it needs to be updated to the wine theme,
  run a full website pass to check for everything like this."

- **What the pass found** - three tiers of staleness, which is the useful
  taxonomy for next time:
  1. **Never swept** (legal.html): pre-wine in every dimension - Instrument
     Serif, true periwinkle `#a8aaff`, old ground, `&mdash;` entities, and
     internal REVIEW badges publicly visible because a local debug toggle
     (`display:inline-block` after `display:none`) had been committed.
  2. **Half swept** (why-not-petpooja): the wine sweep had re-pointed its
     `--periwinkle` variable but left the retired serif and its italic
     accents - which, once the face became Space Grotesk, would have
     rendered as synthesized obliques (the exact thing DESIGN.md bans).
     A sweep that only greps hex values misses fonts and font-styles.
  3. **Current** (careers, og-image, favicon, ef-mark): only the ground
     token lagged, because those were built after the wine sweep.

- **The deliberate non-fix: `/design/`.** The brand-kit page is served
  publicly (HTTP 200), documents the pre-wine system as if current (4x
  periwinkle, 4x old ground, zero wine), and embeds violet QR assets. A
  text swap would put wine swatch labels beside violet QR images - a brand
  kit that is internally inconsistent teaches worse than one that is
  uniformly outdated. Left untouched pending a decision: regenerate the
  kit and its QR assets on the wine system, or unpublish the page.
  Unpublishing is not the agent's call (deleting things it did not create).

- **Also decided** - v2/ keeps its own true-periwinkle palette: it is a
  noindexed standalone preview and its identity is a settled decision;
  matching it to the landing would destroy the thing it preserves.

- **Revisit if** - a future rebrand sweep runs: sweep by DIMENSION (hex,
  font families, font-style, brand strings, icon data-URIs, manifest), not
  by file, and check /design/ first since it is the page that claims to
  define the brand.
