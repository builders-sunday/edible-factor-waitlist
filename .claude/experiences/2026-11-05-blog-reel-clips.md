# Blog reel clips: inside the card, played once

Date: 2026-11-05

## Decision

- Clip inside each card, not a top rail or a fanned stack. A rail split the clip from its story and repeated the subject in line art. A stack hid five of eight clips. Each card stays one link. The rail's hook line was kept and replaces "Read" on clip cards.
- Clips play once per entry into view, then return to the still. DESIGN.md: nudge the eye then stop. All clips are under 5 s, so no pause control is needed.
- Stills are the payoff frame, not the first frame. Reduced motion and Save-Data readers get only the still, so it has to carry the fact.
- H.264 only. AV1 came out about the same size at 360 wide, so a second encode bought nothing.

## Burned-in captions are claims

A review of each clip against its post found captions looser than the post, and a still reading "~120 kcal" over a plate of idlis when the figure is the chutney's. Five captions were corrected in `ef-remotion-3d/src/reels` and only the clip frames re-rendered. Check a still alone, away from its caption and card.

## Traps

- ffmpeg here has no libwebp and no drawtext. Use cwebp.
- wrangler pages dev answers Range with 200. Live Pages answers 206, which iOS Safari needs. Test Range against live.
- `scripts/build-blog.mjs` is stale: running it overwrites the hub and loses the clips.
