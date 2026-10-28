# Plate: the restaurant side of Edible Factor

Issue: https://github.com/builders-sunday/edible-factor-waitlist/issues/122

## Brief and decision

The requester said the existing page felt dated, then clarified:
"make it feel like the current app.ediblefactor.com experience but geared
towards to B2B plate audience & redo the site's explainers and intent, like
'claim your etc.' needs to be redone"

Reading: a product-led restaurant software page for owners and operators.
The reference is the current app, not the historical /v2 preview.

Design variance 7, motion intensity 4, visual density 3. Native CSS and
plain JavaScript preserve the static Pages architecture. Inter, the pale
blue-gray surface, soft raised controls, wine accent, and device-following
appearance derive from the rendered current app login. Plate keeps its mark.

## Audit

The old page had a dark red glow, dense miniature product recreations,
automatic screen rotation, an oversized comparison slider, repeated developer
explanations and a "claim" form that did nothing. Hero and small labels had
weak hierarchy. Its contact intent did not explain the actual next step.
Preserved: /plate, existing primary anchor IDs and navigation labels,
product subject areas, legal destination, Plate mark and the footer disclosure.

Three composition directions were considered:
- Console-led: real editor first, then explorable product views. Best for
  operators evaluating the work they will do. Chosen.
- Diner-led: food and published menu first. Strong brand continuity, weaker
  explanation of the operator workspace. Its diner view becomes a product tab.
- Print-led: a physical menu as the hero. Good hospitality context, but
  understates software. Its tactile material becomes a supporting room section.

## Changes

- New hero, product views, visibility demo, print examples, room types,
  operator FAQ and email introduction flow.
- "Claim your listing" replaced by Explore Plate, Open Plate and a clearly
  explained introduction. Preparing the introduction creates a mailto link;
  opening the draft and sending remain separate user actions.
- No new server endpoint, fake signup, account creation or silent submission.
- Product screenshots come from Plate's public walkthrough. Today and Trends
  are explicitly sample figures. The visibility demo is explicitly local.
- Removed the simulated API terminal, unsourced savings counter and blanket
  pricing promises. Current pricing and setup are established in conversation.
- The diner and operator products and POS scope are explained separately.
- Tabs have arrow/Home/End keyboard support, mobile navigation closes on
  Escape, forms expose inline errors and invalidate stale prepared drafts.
- Device-following light/dark appearance with a saved manual override.
- No new runtime dependencies. Inter and NB glyphs are self-hosted.

## Asset provenance

Product JPEGs: published /walkthrough/ assets at plate.ediblefactor.com.
Print WebPs: optimized derivatives of that site's public /print-collateral/
01-system-handshake.png, 04-receipt.png and 05-flyer-food-photo.png.
These are labelled design examples, not screenshots of live Print Studio.
Inter: the current app's published Latin variable font, self-hosted here.
NB credit: canonical workspace snippet; its Bricolage glyph subset is
self-hosted from the published Google Fonts file.

restaurant-still-life-v1.webp was created with the built-in image generation
tool as illustrative supporting photography. Prompt: contemporary editorial
restaurant table, brushed steel cutlery, clear glass, pale gray linen, a blank
wine-red menu, cool stone tabletop, raking daylight; no people, text, logo or
software. The page labels it illustrative. It is not a named restaurant.

## Validation

Fresh browser checks: 320, 375, 530, 768 and 1440 CSS pixels. No horizontal
page overflow or broken visible images. Hero primary action is 48px high.
Inspected desktop and mobile in light and dark appearances.
Verified every product tab, arrow navigation, visibility switches, hidden
menu state, print examples, room tabs, FAQ, mobile menu and Escape dismissal.
Exercised empty form validation, encoded draft preparation, and draft
invalidation after editing. No email sent.
JavaScript syntax check passed.

Initial mobile Lighthouse: accessibility 100, best practices 100,
performance 69, SEO 92 on the plain local file server. Critical images and
fonts experienced 7-8 second local file read delays; this is not a production
performance claim. The local server's robots response caused the SEO finding.
Production performance and deployment evidence are recorded after release.

## Remaining product limits

The redesign does not connect telemetry or create a server-side onboarding
pipeline. Today/Trends remain sample captures. The contact path prepares an
email to hello@ediblefactor.com and says exactly what happens.
