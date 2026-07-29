# Touch targets, contrast, and the two hardcoded-utility traps

- **Status** - branch `enhancement/a11y-targets-contrast`, not yet pushed.
  Follows PR #72 and #73.

- **The why, as given** - "fix the touch targets and contrast issues", then
  "update the rest of ediblefactor.com to match the header background closely".

- **The root cause behind BOTH asks turned out to be the same bug.** The
  precompiled Tailwind subset bakes literal colours captured long ago, and the
  light theme re-points them while the base theme never did:
  - `.bg-bg` is `rgb(7 7 11)`. `<body>` carries it, and a class (0,1,0)
    outranks the `html, body` element selector (0,0,1) whatever the source
    order - so when `--bg` moved to `#040407`, `html` and the sticky nav
    followed and the BODY did not. Every section below the hero kept painting
    the old black while its own header sat on the new one. That is the whole
    of "match the header background".
  - `.text-inklow` bakes `rgb(107 104 133)` and `.text-inkdim` bakes
    `rgb(150 147 172)`. Same shape: lifting `--ink-low` for contrast moved
    every element using the VARIABLE and left every element using the UTILITY
    exactly where it was. The deck hint and the section kickers stayed at
    3.85:1 while their neighbours moved to 4.9:1.
  All five utilities are now re-pointed at the tokens in the base theme, so the
  next token change cannot silently leave half the page behind.

- **Contrast: the DOM-walking method was lying, in both directions.** The
  generic audit walks ancestors for a background colour. That misses gradients,
  `backdrop-filter`, and the fixed origami backdrop entirely, and it reported
  `text-ink` at **1.30:1** - which would be invisible text - when the real
  value is about 18:1. It also has to parse `color(srgb 0.98 0.97 0.94 / 0.96)`,
  the form `color-mix()` returns, whose channels are 0-1 floats; read as 0-255
  a near-white card becomes near-black.
  Replaced with pixel truth: crop each text's box out of a screenshot, take the
  most common colour in the crop as the background, pair it with the computed
  text colour. Every fix below was measured that way, in both themes.

- **What actually failed, and the fix**
  | | was | now |
  |---|---|---|
  | `--ink-low` dark (all 10-12px labels) | 3.85:1 | 4.90:1 (`#7d799a`) |
  | `--ink-low` light | 3.97:1 | 4.80:1 (`#6f6a60`) |
  | `.hbz__l` teal on paper | 2.67:1 | 4.61:1 |
  | `.both-rotor` orange on paper | 3.23:1 | 5.15:1 |
  | skip link on wine, light | 3.29:1 | 5.03:1 |
  The light `--ink-low` carried the comment "`>= 4.5:1 on eggshell`". Measured,
  it was 3.97:1 against the light ground and 3.56:1 against eggshell proper.
  The claim had never been true. **A comment asserting a ratio is not a
  measurement.**

- **Data hues needed a text-only cut.** `--calorie` and `--budget` are tuned as
  MARKS - arcs, meter fills, rings - where the 3:1 non-text bar applies. As
  small words on paper they measure 2.67:1 and 3.23:1. Rather than darken the
  tokens and dull every mark on the page, light gains `--calorie-ink` and
  `--budget-ink`, used only where the hue has to carry words.

- **Touch targets: expand the hit area, do not inflate the control.** The nav
  pills, the theme switch and the two close buttons keep their exact visual
  size and gain an invisible 44px pad. Three things worth remembering:
  - The pad expands VERTICALLY ONLY for anything in a horizontal row. Growing
    sideways would overlap the neighbouring control and start stealing its
    taps, which is a worse bug than the one being fixed.
  - **No negative z-index on the pad.** Sending it behind the element also
    sends it behind any ancestor background in the same stacking context - the
    sticky nav has one - and a pad that is painted over stops receiving the
    taps it exists to catch.
  - The footer legal row got REAL height instead, because it wraps to two or
    three lines on a phone and 44px pads stacked 8px apart would overlap
    between rows.
  The deck pips stop at 38x44 by choice: they are `flex:1` and get to 28px wide
  on a small screen, and their pads already meet exactly in the middle of the
  10px gap. Wider would overlap. 38x44 clears the 24x24 AA floor comfortably.

- **A probe artifact to expect, not fix.** The hit-area pads inflate
  `scrollWidth` beyond `clientWidth`, so a naive text-overflow check reports
  four false positives on the pips and close buttons. That is the fix showing
  up, not a defect.

- **Verified** - effective hit areas re-measured with pseudo-elements counted;
  contrast re-measured from painted pixels in both themes, all real failures
  cleared. Against the pristine `HEAD` build over 8 widths x 2 themes the total
  finding count fell from 599 to 395.

- **Revisit if** - any token changes: check whether a precompiled utility bakes
  the old value first (`grep -o '\.text-[a-z]*{[^}]*}'`), or half the page will
  not follow.
