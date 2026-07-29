# CTA card and lede: one glass field, one reassurance line, three statements

- **Status** - branch `feature/hero-scroll-budgets`. The first half of this
  (cheer button under the CTA, one-line meta, deeper ground, three-line lede)
  shipped in PR #72, live on ediblefactor.com at `94fd84a`. The merged glass
  field is the follow-on and is NOT yet pushed.

- **The why, as given** - three separate asks over one session:
  1. "can we tighten up this card even further; I want the cheer button to be
     right under the CTA 'Reserve my seat' and put all the 'No Spam' etc. in
     one line at the very end"
  2. "Darken the background to a deeper black"
  3. "Match the font size of the last two lines and separate them after the
     fullstop into 3 simple straightforward messages line by line"
  4. "let's put 'reserve my seat' in the same transparent/glass text box as the
     email ID as 'your@email.com to reserve your seat', under that goes
     'cheer us on' etc."

- **What we found - "one line at the very end" was the constrained part.**
  The reassurance line could not simply be told not to wrap. Measured on the
  live page: the card's inner width runs from **265px** (a 1024px viewport,
  where the CTA column is narrowest) to 452px at 3440, and the existing
  "No spam · Unsubscribe anytime · India + Global rollout" needs **440px at
  its 11px size** - it fits at no width at all, which is why it had always
  wrapped to two lines. Eight candidate strings were measured against every
  card width before choosing. There is no legible size at which the original
  wording is one line, so the wording lost two filler words
  ("anytime", "rollout") and the type became fluid off the card:
  `clamp(9.5px, 2.9cqi, 11px)`, which is 11px on a wide card and 9.5px on the
  narrowest. Below a 250px card it is allowed to wrap again rather than
  overflow - a 320px phone leaves 236px and even the floor needs 260px.

- **Contrast had to move with size.** At `--ink-low` the line measured
  **3.66:1**, under the 4.5:1 bar, and this pass makes it smaller still on
  narrow cards. Shrinking type that already fails contrast is the one thing
  not to do, so it moved to `--ink-dim`: now 6.63:1 dark and 6.67:1 light.

- **The merged glass field.** The submit was a full-width "RESERVE MY SEAT"
  bar stacked under the input. The ask folded the words into the placeholder
  and reduced the button to a 44px arrow inside the same frosted box. The
  frosted treatment moved from the input to the form element itself, where it
  had previously only existed inside the narrow-card container query.
  Consequences worth recording:
  - **The whole narrow-card stacking rule became dead weight and was deleted.**
    It existed because a 199px text button could not share a row with an email
    field in a 265px card. A 44px arrow can, at every width down to 320px.
  - **The card lost 78px** (431 -> 353 at 1440; 416 -> 338 at 1024).
  - **The placeholder needed its own size.** The phrase wants 282px at 16px
    and the input is 188px wide at 1024, so it was cut off mid-sentence.
    `::placeholder` takes `clamp(10.5px, 3.8cqi, 15px)` while the input stays
    at 16px - iOS decides whether to zoom on focus from the INPUT's font-size,
    not the placeholder's, so the no-zoom guarantee is untouched.
  - **The accessible name is preserved.** The words now live in a placeholder,
    which disappears the moment anyone types, so a bare arrow would leave the
    button unnamed. `<span class="sr-only">Reserve my seat</span>` stays inside
    it; verified the button's accessible name still reads "Reserve my seat".

- **A probe bug worth remembering, not a page bug.** The audit reported the
  meta line at 2.87:1 in light theme after the colour was *improved*. The
  cause was the harness: its colour parser assumed `rgb()` 0-255 channels and
  `color-mix()` returns the `color(srgb 0.98 0.97 0.94 / 0.96)` form, whose
  channels are 0-1 floats. Parsed as 0-255 a near-white card reads as
  `[11,11,10]` - near-black - and invents contrast failures across the whole
  light theme. Fixing the parser dropped the light-theme false positives from
  325 findings to 245. Any contrast harness used against this codebase must
  handle `color(srgb ...)`, because this page uses `color-mix` heavily.

- **Decision** - all four asks implemented as given. The one thing deliberately
  NOT done unilaterally was deleting the "Not ready to sign up?" caption; it
  moved under the cheer button instead, where it now fits on one line at 440px.
  Dropping it entirely would save roughly another 35px if that is ever wanted.

- **Verified** - against a pristine `HEAD` build audited with the identical
  probe over 8 widths x 2 themes: zero new defects, and 491 findings against
  the baseline's 599. Form submit, inline validation, and the no-API failure
  path (honest error, no false success, no stuck spinner) all re-driven.

- **Revisit if** - the reassurance copy changes (the `2.9cqi` constant is
  specific to that exact string, re-measure), or the CTA column's width
  changes (the placeholder's `3.8cqi` was chosen against a 265px minimum card).
