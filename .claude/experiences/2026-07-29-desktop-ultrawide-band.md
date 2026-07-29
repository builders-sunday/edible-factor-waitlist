# Desktop and ultrawide: the hero's CTA card put back in the hero, and a band that grows

- **Status** - on branch `feature/hero-scroll-budgets`, same branch as the
  one-line-tagline work. Follows directly from
  [2026-07-29-hero-one-line-tagline.md](./2026-07-29-hero-one-line-tagline.md),
  which recorded the escaped CTA card under "Known and deliberately not fixed
  here". This is the ticket that entry said it belonged in.

- **The why, as given** - "mobile version looks good, make the desktop version
  reactive and fit all screens normal, ultrawide etc."

- **Context / what we found** - four things, all measured on the running page
  through CDP device-metrics overrides rather than read out of the source:

  1. **The hero grid had exactly one child.** Two duplicated `</div>` closed the
     left column and `.hero-grid` early, so `#waitlist-hero` and the stats row
     were siblings of the 1400px container and rendered full-bleed at
     `x=8, width = viewport-16`, while everything else sat inset. The grid still
     reserved `920px 440px` at desktop widths with the 440px column EMPTY, and
     `.hero-grid-lg #waitlist-hero` was a dead rule. The author's own closers,
     further down, had nothing left to close and were silently dropped by the
     parser.
  2. **`body` never had its margin reset.** There is no preflight in this file
     at all - no `* { box-sizing: border-box }` either, whatever the repo
     CLAUDE.md says - so body kept the UA default 8px and every full-bleed band
     was inset by it. On the dark `.efmod` module that rendered as an 8px white
     stripe down both edges of the screen, confirmed by pixel crop.
  3. **Nothing scaled past 1512px.** The layout was byte-identical from 1512 to
     3840, a 2.5x range, so an ultrawide monitor got a 1400px island.
  4. **The CSS layer order is the reverse of what the repo doc describes.**
     `<style id="tailwind-static">` is emitted at line 89, BEFORE the bespoke
     `<style>` at 91, so custom rules beat the utilities on source order. That
     is what makes a fluid band possible without regenerating the precompiled
     subset - which matters, because that subset carries no breakpoint above
     `lg` (1024px), so there is no `xl`/`2xl` to write against.

- **Idea / options** for the ultrawide question:
  1. Proportional zoom of the whole canvas above ~1600px. Rejected: the page is
     px-based in its bespoke CSS and rem-based only in the Tailwind utilities,
     so a root-font-size scale would move half the page and not the other half.
     `zoom` was rejected too - it does not scale `vh`, and the `.efmod` scroll
     module is `360vh` with a `100svh` sticky pin, which would desync.
  2. Restructure at ultrawide (three-zone hero, sections gaining columns).
     Rejected for this pass: a real redesign, well past the 500-line diff bar,
     and it relitigates layout the previous session just tuned.
  3. **One fluid band, chosen.** A single `--band-grow` custom property that is
     `0px` below 1441px and takes 46% of the extra viewport width above it,
     with every other ultrawide rule derived from it so there is one number to
     retune.

- **Decision** - the band takes a share of the extra width rather than all of
  it, capped at 2040px. Claiming all of it drags the lede and the friction
  cards to a line length nobody reads; claiming none of it is the bug. 46% and
  the ceiling were picked by rendering, not arithmetic. Supporting type in the
  hero grows on a much flatter curve than the headline, because the H1 already
  sizes itself in `cqi` off its container and widening the band alone took it
  to 138px sitting above a flat 18px lede - a 4.7:1 relationship became 7.7:1.

- **Card-relative, not viewport-relative.** The single most useful thing this
  pass established: once the CTA card moved into a column, every rule that
  keyed off the VIEWPORT to describe the CARD broke.
  - The form's stacked layout was gated on a 560px viewport, a proxy for "the
    card is narrow" that held only while the card spanned the page. At a 1024px
    viewport the column is 321px and the inline layout squeezed the email field
    to **36px wide** with the button on top of the placeholder. Now gated on
    `@container wlcard (max-width: 476px)`. 476 is not a round number: a size
    container resolves against its CONTENT box, and a 560px viewport gives a
    476px inner card while 561px gives 477px, so mobile resolves identically to
    the rule it replaces. Card content widths were sampled at 18 viewports to
    find that.
  - The card's `md:text-[2.4rem]` heading broke "Skip the problem. / Join the
    waitlist." from two lines into four between 1024 and 1373px, taking the
    card from 364px to 504px tall. Now `clamp(24px, 9.4cqi, 46px)`, one
    continuous expression from a 265px card to a 452px one, which also removes
    any step at the 1441px boundary.

- **Mobile regressions caught and closed.** Putting the card back inside the
  padded container took 32px off it, which had knock-on effects the desktop
  work would otherwise have shipped silently:
  - 360px: the stats row broke from two flex rows to three (+79px). Fixed with
    a 16px column gap below 375px. 16 is measured - the three items are 134,
    159 and 142px, so the first pair needs 293px plus a gap and a 360px phone
    leaves 312px. 20px overshot by one pixel and still wrapped.
  - 390px (iPhone 12-15): the "Cheer us on" row wrapped and the card grew 38px.
    `.eff-cheer__copy`'s flex-basis is a wrap THRESHOLD, not a width, so
    dropping it 160 -> 120 moves only the point at which the button drops.
    375px was wrapping by a two-pixel accident before; now 375-430 behave
    alike.
  - 320px: the card heading went to three lines (+61px). Closed with a second,
    tightly scoped container query at 260px.

- **How it was verified** - the pristine `HEAD` build was served on a second
  port and audited with the identical probe over 10 widths x 2 themes, and the
  two findings sets diffed. Result: **zero new defects**, with the changed
  build removing the baseline's right-edge overflows. Element geometry was
  diffed the same way across 320-3840px: after the fixes above, no mobile or
  tablet width is taller than baseline and several are shorter. Interactions
  were driven end to end (scroll-driven meters reach 1,560/2,000 and 890/1,200,
  rotor and "both" stay in step, deck advances, invalid email shows the inline
  error) and the failure path was exercised with no API behind the form: honest
  error, no false success, no stuck spinner.

- **Note for the next session** - the workspace `.scraper-audit/probe.js` is
  not merely unparameterized, it is hardcoded to a DIFFERENT page's class names
  (`.kpi`, `.src-name`, `.pipe-meta`). Pointing its `URL` at this page returns
  a clean run that means nothing. It needs selectors for the page under test.
  Separately, CLAUDE.md's dash-check command uses `grep -P`, which macOS BSD
  grep does not support; `perl -ne` with the same pattern is the local
  equivalent.

- **Known and deliberately not fixed here** - the audit surfaces a body of
  PRE-EXISTING findings this pass did not touch, because they are a separate
  concern and would blow the diff bar: informational text below the 4.5:1
  contrast bar (mono micro-labels at 9.5-11px, the nav "Private Beta" line,
  `.hbz__l`, `.hbz__note`), touch targets under 44px (the deck pips are 2px
  tall, the theme toggle is 62x30, the close buttons are 30x30, the eff-chips
  are 39px), and one friction card clipping its text at 1024px. They are
  identical on the shipped build. Also: the walkthrough section still left
  slack between its copy and the phone below 1441px at the time of this pass.
  CLOSED in PR #82 (2026-07-29, same day) once the user lifted the hero freeze
  ("proceed to the rest"): the column cap + centring now applies from 1024px,
  with the clamp floor equal to the 1024 column width so the narrowest
  desktops stayed pixel-identical.

- **Revisit if** - the band ceiling needs retuning (change `--band-grow`'s
  factor and ceiling in one place and everything follows), the CTA column's
  proportions change (the `9.4cqi` heading figure is specific to the string
  "Join the waitlist." in this face and must be re-measured, not guessed), or
  a second `.wl-card` is ever added (it is the named container `wlcard`).
