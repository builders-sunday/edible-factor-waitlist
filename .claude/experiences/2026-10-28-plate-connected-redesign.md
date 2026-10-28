# Plate connected redesign

Status: built for review, issue #122

## Context and the why

The requester found /plate dated and clarified that it should feel like
the current app.ediblefactor.com, adapted to the B2B audience. They explicitly
asked to redo explainers and the "claim your" intent.

## Decision

Use the current rendered app as the visual reference: pale blue-gray,
soft raised surfaces, Inter and wine. Retain Plate's mark and the route.
Explain the restaurant workspace, diner surface and POS boundary separately.
Replace the inert listing-claim form with a transparent email introduction.
Keep sample telemetry labelled and make the local visibility demo explicit.

## Evidence and tradeoffs

The old page's simulated terminal described enforcement without making a
request. It is replaced by an operator-facing local preview rather than a
claim of live API inspection. Published walkthrough screenshots replace
miniature dashboard recreations. Analytics remain sample captures.
No onboarding backend, billing integration or telemetry work is implied.

Full audit, provenance and validation: docs/plate-refresh-2026-10-28.md.

## Revisit if

Telemetry is connected, a real onboarding endpoint is approved, current
pricing is confirmed, or the operator product itself changes appearance.
