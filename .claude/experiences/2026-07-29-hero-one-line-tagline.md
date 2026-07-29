# Hero: phone rotator removed, tagline set on one line, colour rotors synced

- **Status** - shipped on branch `feature/hero-scroll-budgets`, commit
  `2479a3d`. Three changes to the hero, made together because they all
  compete for the same horizontal space.

- **Context** - the hero already carried a scroll-driven dual-budget
  module (dishes arrive as you scroll and add themselves to a calorie
  and a spend meter). With that module in place the hero was doing too
  much at the top: a small phone card in the top-right corner cycled
  four app screenshots on its own 2800ms timer while the headline wrapped
  to two lines beside it, and a third element, the word "both" in the
  lede, changed colour on yet another independent clock.

- **The why, as given** - "remove this mini screenshot reveal rotator
  from the top", "make the tagline 'you are HOW you eat' fit in one line",
  and "match the 'budget & calorie' + 'both' coloured text rotators to
  switch colours at the same moment so it looks stunning". The through
  line is that the top of the page had three unrelated motions running
  against each other, and the headline was losing the fight for width.

- **Idea / options** - for the one-line headline:
  1. A fixed font-size per breakpoint. Rejected: the H1's container is
     full-width on mobile but a fraction of the grid on desktop, so a
     viewport-based size cannot fit both without a per-breakpoint table
     that goes stale the moment the grid changes.
  2. A JS text fitter. Rejected: adds a resize listener and a layout
     thrash to a page that is otherwise dependency-free, for something
     CSS can express directly.
  3. Container query units. Chosen. `.hero-title-row` becomes an
     inline-size container and the H1 takes `9.6cqi`, so the type always
     scales off the box it actually lives in.

- **What we found** -
  - The tagline measures **10.031em** wide at the display face's
    tracking, measured off the live page rather than estimated. `9.6cqi`
    therefore fills ~96% of its container at any width, with headroom for
    font-loading variance.
  - The desync of "both" was not a subtle timing bug: it was a 3.4s CSS
    keyframe running against the rotor's 2400ms `setInterval`. Those two
    periods only realign every ~34 seconds, so the two colour changes
    agreed by coincidence and nothing more. An earlier code comment about
    deliberately *not* synchronising referred to the phone rotator's
    2800ms cadence, not to "both" - worth noting, because it reads at
    first glance like a decision being reversed here, and it is not.
  - Forcing one line exposed a real cliff that predates this work: at the
    1024px two-column breakpoint the left column dropped to ~432px, which
    took the headline from 77px to 41.5px in a single pixel of viewport.
    Making the CTA column proportional (`min(440px, 34%)`) instead of a
    flat 440px cut that step to under 2%.
  - Measured across 320-1920px: one line at all 16 sampled widths, no
    horizontal overflow, every breakpoint-adjacent step under 2%. The
    rotor sync sampled 482 times over 8s at ~60Hz with zero mismatches.

- **Decision** - remove the phone rotator outright rather than restyle or
  reposition it; the hero's motion budget is now spent on the scroll
  driven budget meters, which carry actual product meaning, instead of a
  decorative screenshot carousel. Hold the headline to one line via
  container query units, behind `@supports (font-size: 1cqi)` so engines
  without them keep the previous wrapping behaviour rather than
  overflowing a `nowrap` they cannot size for. Drive "both" from the
  rotor's own tick so the two can never drift again.

- **What we shipped** - the `.glimpse` markup, ~121 lines of its CSS and
  its interval are gone. The four mockup webps it used are still
  referenced by the section 02 deck and were deliberately not deleted.
  The H1 is a single flat run of `.word` spans instead of two `.block`
  groups. `.both-rotor` lost its keyframe and gained an `.is-bud` class
  that `initRotors` toggles on the same tick as the word swap, with a
  480ms colour transition matching the rotor's cross-fade.

- **Known and deliberately not fixed here** - the hero grid has only one
  child. `#waitlist-hero`, the CTA card and its rotating dial, escaped
  the grid through a stray `</div>` and renders full width below it,
  which leaves the hero's second column empty and is why the page carries
  two more `</div>` than `<div>`. This is present at `HEAD~1` and on the
  live site, so it is not a regression from this work, but it does mean
  the hero reserves a column that nothing occupies. Fixing it moves the
  CTA card up beside the headline, which is a real visual change to the
  live page and belongs in its own ticket.

- **Revisit if** - the tagline copy changes length (the `9.6cqi` figure
  is specific to "You are HOW you eat." in this face and must be
  re-measured, not guessed), the hero grid gains a second real column
  (the cap band from 640-1023px was tuned against the current layout), or
  a second `.rotor` is ever added to the page (only the first drives
  "both", by design, and a second would otherwise fight it).
