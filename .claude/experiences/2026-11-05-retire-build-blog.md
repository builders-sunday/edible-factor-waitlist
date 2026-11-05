# 2026-11-05 - build-blog.mjs retired, blog/ is hand-edited

## Status

Retired. `scripts/build-blog.mjs` keeps its code but exits with status 1 before
writing anything. Issue #135.

## Context

The script was written in #103 on 2026-08-27 to turn `.drafts/<slug>.md` into
`blog/<slug>.html` and `blog/index.html`. Its templates still carry that day's
markup. From #131 on, blog pages were changed by hand, so a run now replaces
newer work with older work.

## The why, as given

Nikhil flagged that a run overwrites the hand-edited `blog/index.html` and the
four older posts, losing the hub sections, the reel clip cards, the blog.css
bump and `blog/reels.js`, and asked for a decision from the evidence: retire it
or carry the current markup into its templates.

## Idea / options

- Carry the current markup into the templates. Rejected: see the cost below.
- Mark it retired in the header only. Rejected: a comment does not stop
  `node scripts/build-blog.mjs`, and the damage takes one command.
- Delete the script. Not done: the request was to retire or update, and the
  `.drafts/` sources and its notes on the Bites and Whole Meal toggle may still
  be useful. Git history would keep it either way, so this stays an easy call
  for later.
- Retire it in the header and exit before any write. Chosen.

## What we found

- History: one commit touches the script, 117dfb5 (#103). #105 added three
  drafts and #131 hand-edited the output, neither through a changed script.
- Callers: `git grep build-blog` on main finds nothing outside the script. The
  repo has no package.json, CI workflow or git hook, and Pages runs no build.
  `.drafts/` and `scripts/` are only named as paths that must return 404.
- Run on a throwaway export of main at 4938651: `blog/index.html` lost all 6
  sections, the jump row and 4 card images. All 4 posts lost hero art and
  og:image, the double-escaped `&amp;middot;` titles and trailing full stops
  came back, section tags reverted, and blog.css and hub.js fell from
  `?v=20261103` to `?v=20260827`. The `/plate` link in the camera post went too,
  so the drafts are behind the published copy, not only the templates.
- Run on an export of `feature/blog-reel-clips` at 69fffda: the hub went from
  12 posts to 4 and lost `reels.js`. The 8 reel posts survive only because the
  script does not know them.
- Cost of updating: 8 of the 12 posts have no draft. `md()` allows no raw HTML
  and has no tables, images or reel embeds, while 3 posts use tables, 8 use
  byline and read next, and 8 use reel clips. Keeping it true would mean a new
  template layer plus 8 reverse-written drafts, for 12 pages that no process
  regenerates.

## Decision

`blog/*.html` is the source of truth. Edit it directly and bump `?v=` on edited
assets. The script stays in the tree, disabled.

## What we shipped

- `scripts/build-blog.mjs`: retired header, and an exit before the first write.
- This entry and its index line.

## Revisit if

- Post volume makes hand-editing the hub the bottleneck. Then generate the hub
  card list from the published pages instead of reviving drafts.
- Anyone removes the exit: a run must first leave `blog/` byte-identical.
