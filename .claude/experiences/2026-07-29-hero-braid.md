# Hero arcs v2: the budgets braid around the plate line

- **Status** - shipped in PR #85 (`a548bca`), live and sentinel-verified.
  Chosen from a two-variant preview (`N.B - Claude Code/ef-arc-variants/`,
  :4935) built on the real hero geometry.

- **The why, as given** - the user asked for two cuts of what happens after
  the convergence dot: (A) the two lines merge into a brown-wine line, or
  (B) "the orange and blue lines spinning around each other following
  independent paths after the convergent dot". They picked "B but keep the
  original line dynamic" - which resolved to: the wine spine STAYS with its
  full choreography, and the budget lines continue past the dot, braiding
  around it. Alongside: "remove the random gray line" (the ghost echo arc -
  never animated, never read as anything) and "make both lines more
  dynamic, almost like fluid lightning."

- **The story sharpened** - v1 said "two budgets become one plate" (the
  lines ended at the node). v2 says the truer thing: the budgets are not
  erased at the plate - they travel wrapped around it, still themselves.

- **Decisions worth keeping**
  - Braid paths are BAKED polylines (spine bezier, 3.5 twists, 26px
    amplitude tapered to zero at the node), precomputed in Python and
    inlined - the page stays dependency-free and the draw-in --len values
    are exact (945px each).
  - The lightning field (feTurbulence + feDisplacementMap, drifting via a
    ~12fps gated rAF) applies to the WHOLE arcs svg, so lines, pulses and
    the convergence marker wobble as one body - filtering only the lines
    would let pulses float off their wobbled paths.
  - Production restraint vs the preview: no 7px blur-glow layers (too big a
    texture change for the shipped hairline system); instead thin flowing
    energy cores at 0.4 opacity. The filter + drift run ONLY at >=1024px
    with motion allowed and the tab visible - phones get clean unfiltered
    lines and pay no per-frame filter cost.
  - Reduced motion: cores and pulses display:none, braid rests fully drawn.

- **Revisit if** - the braid amplitude/twists want tuning (regenerate the
  polylines - the generator math lives in this entry's PR and the preview),
  or real-device testing shows filter cost on low-end desktops (the gate
  can move up to 1280px, or the drift can drop to a static displacement).
