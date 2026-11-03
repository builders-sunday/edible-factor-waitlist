# 2026-11-03 - Blog hub split into six sections, eight posts added

## Status

Built on branch `feature/blog-sections-reel-posts`, not merged. `/blog` is now
six titled sections with a jump row, and eight new posts sit beside the four
from 2026-08-27.

## Context

The hub was one flat list of four cards, all from 27 August 2026. Nikhil
asked for eight new posts from the reels brief
(`reports/ef-reels-blog-briefs-2026-11-03.md` at the workspace root). The new
posts mix dated news (the Nandini milk hike, Mangaluru hotel prices, Bengaluru
coffee and tea) with evergreen comparisons (idli vs dosa, coffee vs chai,
cheese vs paneer, two thalis) and one product post. A flat date-sorted list
would have buried the comparisons under news and made the hub read like a feed.

## The why, as given

Nikhil asked for a blog with sections, in this order: News, Budget
comparisons, Nutrition comparisons, Ingredients and labels, For restaurants,
Building Edible Factor. The order puts the time-sensitive pieces first and the
studio's own story last.

## Idea / options

- One flat list, newest first. Rejected: twelve cards with no grouping, and
  the evergreen comparisons sink as news is added.
- Client-side filter chips. Rejected: needs JavaScript to show content, hides
  cards from a cold load, and adds state for a twelve-card page.
- Static sections with an anchor jump row. Chosen: works with no script,
  every card is in the HTML, and each section has a linkable id.

## What we found

- Mapping, as given in the task: News = Nandini, Mangaluru, sugar. Budget
  comparisons = Bengaluru coffee and tea, the two thalis (the thali post ends
  on what the plate costs at home and out). Nutrition comparisons = idli vs
  dosa, coffee vs chai, cheese vs paneer. Ingredients and labels = Ferrero,
  Lindt. For restaurants = the camera post. Building Edible Factor = two
  budgets, one plate.
- The sugar post moved from a "Costs" tag to News. Its card keeps its own date,
  27 AUG 2026, so it sorts last in News.
- Facts: the writers checked every number against a ledger of fetched sources
  on 3 November 2026 and each post carries "Facts checked on 3 Nov 2026" (the
  product post has no sources, because its numbers are demo screen values and
  are labelled as such). The builder did not re-fetch the sources. Items the
  writers flagged to re-check on publish day: Halli Mane and MTR coffee
  revisions, the reported ₹66 curd price (no KMF circular found), and whether
  CRISIL's October 2026 thali figure is out (the thali post cites CRISIL
  through Trak.in's 10 October 2026 report).
- Rendered over CDP with `Emulation.setDeviceMetricsOverride` at 375x812 DPR 2
  and 1440x900. Every page measured `scrollWidth` 375 at mobile. The overflow
  and full-stop probes were first run on a planted 600px div and a planted
  "Bad." h2, and both caught them.
- `/blog` answers 308 to `/blog/` on both wrangler and production. This is the
  Pages directory index behaviour and predates this change; the canonical and
  sitemap still say `/blog`.

## Decision

- Six sections, each an `h2` with an id and a one-line description. Card
  titles became `h3` so the outline is h1, section h2, card h3.
- The jump row scrolls sideways below 720px, bleeding to the screen edge so a
  cut-off pill shows there is more; at 720px and wider it wraps. No sticky
  header, no JavaScript, no scroll-spy.
- Card tag reads the section name.
- The index H1 lost its accent full stop (headings end without one now).
- New CSS is added after the measured block and says which values are not
  from nikhilballal.com. One deviation: below 480px the card padding drops from
  32px 34px to 26px 22px, because at 375 the long section tags wrapped the meta
  line on every card.
- Tables scroll inside `.table-wrap`, which is a focusable region with the
  caption as its label. The cheese post's inline table styles moved into
  blog.css and its classes were renamed to match.

## What we shipped

- `blog/index.html`: sections, jump row, refreshed eyebrow, lede and meta
  description, Blog plus ItemList JSON-LD listing all twelve posts.
- `blog/blog.css`: sections, jump row, `.byline`, `.checked`, `.read-next`,
  tables.
- All twelve posts and the index: `?v=20261103`; the four August posts and the
  index lost the double-escaped `&amp;middot;` in their titles and the trailing
  full stops on H1 and H2.
- Read next link text now matches each target's H1.
- `sitemap.xml`: eight new URLs, `/blog` lastmod 2026-11-03.

- `blog/img/`: one original line drawing per post (SVG, about 1 KB each), used
  as the post hero, as the hub card art and, rasterised by headless Chrome to
  `<slug>-og.png`, as og:image, twitter:image and the BlogPosting image. The hub
  uses the two-budgets drawing. Nikhil asked for Dribbble food outlines; Dribbble
  shots belong to their designers, so Dribbble was a style reference only and
  every drawing is ours. The SVG canvas is 1200x630 with the ink in the lower
  band, so the hero and card crop it with `aspect-ratio` plus `object-fit`.

## Revisit if

- A section grows past about six cards: split it or add pagination.
- A seventh section is needed: the jump row wraps to three lines at 1440.
- Search Console shows the `/blog` to `/blog/` redirect costing anything.
