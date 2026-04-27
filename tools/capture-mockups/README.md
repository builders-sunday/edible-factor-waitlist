# capture-mockups

Auto-captures iPhone-aspect screenshots of the live EdibleFactor app and
writes them to `../../mockups/*.webp` for the waitlist page.

## Why

Mockups inside the phone frames on the waitlist need to match the frame's
9:19.5 aspect (iPhone 14 Pro). Capturing the live app at the right viewport
guarantees the screenshots are always current, pixel-perfect, and sized to
fill the phone screen edge-to-edge with `object-fit: cover`.

## Usage

```sh
cd tools/capture-mockups
npm install                              # one-time, ~150MB Playwright + Chromium
npm run capture                          # captures all 5 mockups
cd ../..
git add mockups/ && git commit -m "refresh mockups" && git push
```

Override the target site (e.g. to a Vercel preview):

```sh
MOCKUP_SITE=https://ediblefactor-v2-git-foo.vercel.app npm run capture
```

## How it works

1. Launches Playwright Chromium headless at iPhone 14 Pro device profile
   (393×852 viewport, DPR 3 → captures at 1179×2556 native)
2. Sets `ef-guest=true` cookie + localStorage so the app's middleware
   bypasses the OAuth wall and renders all protected routes
3. For each target route, navigates, waits for network idle + a tunable
   settle delay, optionally scrolls, then screenshots
4. Converts PNG → WebP in-browser via OffscreenCanvas (no native deps)
5. Writes to `../../mockups/<name>.webp`

## Adding / changing a mockup

Edit the `TARGETS` array in `capture.mjs`:

```js
{ name: 'orders-history', path: '/orders', wait: 1500 }
```

Then `npm run capture` and reference `/mockups/orders-history.webp` from
`index.html`.

## Notes

- `node_modules/` is gitignored — only the script + lockfile are versioned
- Chromium binary lives in `~/Library/Caches/ms-playwright/`, shared
  across projects
- Capture takes ~30s for all 5 routes
