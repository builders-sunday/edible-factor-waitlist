# Plate motion — 29 October 2026

Issue: https://github.com/builders-sunday/edible-factor-waitlist/issues/125

The user clarified “motion log” means the animated Plate logo. Preserve the stacked-plate identity and colour inheritance; refresh its movement rather than replace the mark.

## Published motion specification

- Hero title: `Your menu` / `Connected`, without full stops.
- Plate mark, navigation and footer: 5.6-second cycle. Top plate rises 5 SVG units, middle plate follows by 2; both settle, with most of the cycle at rest. CSS transform animation, disabled for reduced motion. Existing NB credit remains intact.
- Primary navigation: the same underline treatment as ninanssteakhouse.com, audited on 29 October. A 1px line grows from the left on hover or keyboard focus, withdraws to the right, and uses 280ms cubic-bezier(.16,1,.3,1). Reduced motion removes the transition. Plate keeps its existing typography.
- Hero film: 12 seconds, 960×720, 24fps, H.264/yuv420p, silent, fast-start MP4, 344,906 bytes. Menu → Team → Print → Menu with 600ms crossfades, then identical source imagery across the loop boundary. Product captures, not a recording of live interaction. No sample analytics in this sequence.
- Sources: existing `plate-edit-drawer.jpg`, `plate-settings.jpg`, `01-system-handshake.webp`, previously sourced from Plate's published walkthrough/print examples. No new restaurant data is exposed.
- Poster is the first encoded frame. It occupies the final media dimensions before the film loads. Playback-control space is reserved to prevent layout movement.
- The film loads only while in view and when motion/data-saving preferences allow it. Explicit Play opts in. Manual Pause persists across viewport and document visibility changes. Hidden tabs and offscreen media pause. Reduced motion, data saving and failed playback retain the poster. Network failure offers Retry.
- Static screen descriptions and the full walkthrough remain available outside the decorative video. Play/Pause is a keyboard-accessible button; the film is muted and plays inline.

## Validation

- `node --check plate-assets/plate-v2.js` passes.
- `node --test tests/plate-motion.test.mjs`: 8/8 pass. Tests exercise the shipped controller with simulated browser events: visibility, viewport, manual pause, reduced motion, data saving, autoplay rejection, network retry and a pending-play race.
- Browser preview: video playing, muted, loop enabled; Play/Pause works; focused navigation underline reaches scaleX(1). Menu closes with Escape.
- Responsive widths: 320, 390, 820 and default desktop; no horizontal overflow. Light and dark checked.
- First/last encoded frames: mean per-channel absolute difference below 0.66/255 (minor compression variation).

Production verification belongs in the release handoff after Cloudflare deploys the merged change. Local results alone do not establish a live release.

## EF coaster follow-up — issue #128

The user requested the EF coaster instead of the rectangular QR card in the hero film. Version 2 replaces only the Print scene with the existing dark/light EF coaster artwork from `https://plate.ediblefactor.com/print-collateral/02-periwinkle-drenched.png`. A resized WebP source is retained as `ef-coaster-v1.webp`.

The new `plate-hero-loop-v2.mp4` remains 12 seconds, 960×720, 24fps, silent H.264 with fast-start; 378,168 bytes. Menu and Team scenes, crossfade timings, static poster, seamless return, controls and preference handling are unchanged. The page uses a fresh filename and release marker `coaster-20261029b` so existing cached video does not conceal the update.
