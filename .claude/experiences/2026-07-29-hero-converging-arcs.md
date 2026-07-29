# Hero background: the two budget lines, converging and alive, in both themes

- **Status** - on branch `feature/hero-scroll-budgets`, alongside
  [2026-07-29-desktop-ultrawide-band.md](./2026-07-29-desktop-ultrawide-band.md).
  Ported from the "Edible Factor - two budgets, one plate" hero artifact
  (claude.ai artifact `490dad15-5839-47a1-9fc1-0ad12e37b5a7`), not copied from
  it: two things about the original had to change.

- **The why, as given** - "use this hero background in the same local host
  preview and make the lines dynamic & converging in both light & dark mode."

- **What the artifact actually did** - three SVG paths over the hero ground
  (`.arc--ghost`, `.arc--cal`, `.arc--inr`) plus a small ring-and-dot marker.
  The paths draw themselves in once via `stroke-dasharray` /
  `stroke-dashoffset` over 2.6s and then hold. Its own source comment is worth
  keeping: "These replace the decorative swirls. They are the product: one arc
  for calories, one for spend. They cross once, at the plate. Delete them and
  the page loses its argument, which is the test a background layer has to
  pass."

- **The two changes, and why**
  1. **Cross -> converge.** The artifact's arcs pass through each other at
     (884, 470) and diverge again on the far side. That draws an X, and an X
     says "these two things intersect", not "these two things become one".
     The brief said converging, and converging is also the truer sentence for
     the product. Redrawn so the calorie line arrives from above and the spend
     line from below, they meet at one point, and a single line leaves it. Two
     budgets in, one plate out, readable with the copy deleted.
  2. **Draw-once -> always alive.** A background that animates for 2.6s on
     load and is then frozen for the rest of the session is a loading effect,
     not a living one, and nobody who scrolls back up ever sees it. Replaced
     with a 9s loop: a pulse runs each budget line into the convergence point,
     both timed to land together, the point flares on arrival, and one pulse
     leaves along the merged line. Under that, the whole layer drifts on a 29s
     cycle chosen NOT to be a multiple of 9 so the two never resynchronise
     into the same arrangement twice.

- **Both themes, which the artifact could not do.** The original is dark-only:
  its ghost arc is `rgba(255,255,255,.05)` and its marker ring
  `rgba(255,255,255,.14)`. On this page's eggshell paper those are invisible -
  white on near-white. Every neutral here goes through
  `color-mix(in srgb, var(--ink) N%, transparent)` instead, and the two budget
  lines are stroked with the page's own `--calorie` and `--budget` tokens,
  which are already re-pointed per theme (cyan `#6eddf0` -> teal `#1697ab`,
  peach `#ff8a4a` -> burnt orange `#d2691e`). So the arcs follow the theme for
  free and the colour law holds in both: cyan is always calories, peach is
  always rupees, wine is the plate. Light also gets its own opacities - the
  same alpha that reads as a hairline on the void washes out on paper.

- **What we found**
  - **The convergence point's position is a responsive constraint, not a
    taste call.** `preserveAspectRatio="xMidYMid slice"` crops about the
    midpoint, so a tall phone crops horizontally and an ultrawide crops
    vertically. Measured: a 375px phone shows only viewBox x 591-849, and a
    3440px ultrawide only y 208-692. The point has to live in the
    intersection, which is why it sits at x=720 of 1440 exactly. Verified on
    the live page at 375 / 1440 / 3440: dead centre horizontally at all three.
  - **First placement was wrong for a reason worth recording.** y=462 put the
    meeting point behind the three dish photos. Everything was technically
    correct and the whole idea was invisible - the two lines vanished into the
    food and you never saw them meet. Moved to y=355, still inside the
    ultrawide band, now in clear space between the lede and the CTA card.
    Caught by rendering and looking; nothing in the geometry said it was wrong.
  - **A CSS transform beats a transform presentation attribute.** The marker
    was `<g class="cross" transform="translate(720 355)">` with a CSS
    `transform: scale()` flare animation on the same element. CSS wins over
    the attribute rather than composing with it, so the animation threw the
    marker back to the viewBox origin and drew it off screen. It silently
    "worked" - no error, just no marker. Fixed by splitting: the translate
    stays an attribute on an outer `<g>`, the animation goes on an inner one.
  - **`--len` must be per-path and must exist.** An undefined custom property
    inside `stroke-dasharray` invalidates the whole declaration, so the
    draw-in did nothing at all on the first pass. Lengths are now each path's
    real `getTotalLength()`, read off the rendered page and written back
    (975 / 904 / 971 / 866). Re-measure if any `d` changes.

- **How it was verified** - the animation was checked by sampling computed
  `stroke-dashoffset`, opacity and transform every 700ms over a full cycle,
  not by looking at screenshots: both budget pulses reach their full run and
  land together at ~5.8s, the marker scales 1 -> 1.43 exactly then, the merged
  pulse departs after, and the loop restarts on schedule. Reduced motion was
  emulated through CDP and confirmed to leave the lines resting in their
  converged state with the pulses at `display:none` and the drift off. The
  layer is deliberately larger than the hero (`inset:-10% -6%`) and is clipped
  by the section's `overflow:hidden`; document scrollWidth equals clientWidth
  at every width, so it adds no horizontal scroll. Audited against the
  pristine `HEAD` build over 7 widths x 2 themes: zero new defects.

- **Not measured, deliberately** - frame rate. Headless Chrome throttles
  `requestAnimationFrame` without a compositor (5 frames in 3.2s), so any FPS
  number from it is an artefact of the instrument. The drift was moved from
  the `<svg>` onto the wrapper div so it is a plain compositor transform
  rather than a transform on the element whose strokes are already
  repainting, but that is a reasoned change, not a measured one. If jank is
  ever reported on a real machine, this layer is the first suspect.

- **Revisit if** - the dish stage moves or resizes (the y=355 clearance was
  chosen against its current position), any `d` changes (re-measure `--len`
  and `--run`), or a second `.arcs` layer is ever added to the page.
