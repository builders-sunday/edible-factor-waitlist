# Plate hero motion

## Status

Implemented for issue #125; production verification follows merge.

## Context

The refreshed Plate page had a static product hero and a short repeated bounce on the top plate in its logo.

## The why, as given

“remove full stops from the hero title and make the top nav hover effects like the site we made for ninanssteakhouse.com, create a looped video for the hero section”. The user clarified the motion request means “Refresh the animated Plate logo”.

## Idea / options

Reuse the older showcase film, or edit a new loop from product captures. Keep the existing Plate mark or replace it. Load video eagerly or defer until motion is allowed and the media is visible.

## What we found

The older showcase film includes sample analytics. Existing menu, team and print captures explain the operator product without those figures. Ninan's live navigation uses a 280ms directional underline. The new silent 12-second film encodes to 345KB; all eight playback lifecycle tests pass.

## Decision

Preserve the mark and typography; soften the logo to a 5.6-second lift/settle cycle with a long rest. Match Ninan's underline timing, including focus. Use a small capture montage with a static first-frame poster and explicit Play/Pause. Reduced motion and data saving do not fetch the film without user opt-in. Reserve control space before initialization.

## What we shipped

See [the motion specification](../../docs/plate-motion-2026-10-29.md) for assets, provenance and validation. Scope is the marketing page; operator application behavior is unchanged.

## Revisit if

Current product footage becomes available, the operator interface materially changes, or field performance reveals video playback costs.
