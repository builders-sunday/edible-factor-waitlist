// One-off capture: render ninan-menu-demo.html into a webp matching the
// other waitlist mockups (1179 x 2556, iPhone 14 Pro DPR 3) with the same
// SAFE_TOP injection so the deck-card notch sits over the sticky app bar.
import { chromium, devices } from 'playwright'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const SRC = process.env.NINAN_SRC
  || '/Users/nikhilballal/Claude Code/design-bundle-2026-05-15/ediblefactor/ninan-menu-demo.html'
const OUT = process.env.NINAN_OUT
  || resolve(process.cwd(), 'mockups/restaurants-browse.webp')

const VIEWPORT = { width: 393, height: 852 }
const DPR = 3
const SAFE_TOP = 47

// Matches the init script the live capture tool uses, but the design source
// already uses --safe-top via env(safe-area-inset-top); we set the CSS var
// explicitly so the .app-bar offsets correctly under the notch and we also
// nudge body padding for any non-safe-area-aware chrome.
const safeAreaScript = `
  (() => {
    const SAFE_TOP = ${SAFE_TOP};
    // Pre-seed localStorage so the cookie banner doesn't pop on first visit
    // (otherwise it covers the whole featured-dish hero), and so the splash
    // overlay won't redraw on top of the captured frame.
    try { localStorage.setItem('ef_cookie_consent_v1', JSON.stringify({ value: 'accepted', at: new Date().toISOString() })); } catch (e) {}
    const inject = () => {
      const style = document.createElement('style');
      style.textContent = ":root { --safe-top: " + SAFE_TOP + "px !important; }"
        + ".splash { display: none !important; }"
        + ".cookie-banner, .cookie-banner.show { display: none !important; }"
        // Plate-pill is a floating bottom CTA that occludes the bottom dish
        // row in a still frame. Hide it for the marketing capture.
        + ".plate-pill { display: none !important; }"
        // App-bar at 393px fits brand + truncated meters + sign-up; shrink
        // the brand a touch so the meter cluster reads cleanly.
        + ".app-bar__brand { font-size: 18px !important; }";
      document.documentElement.appendChild(style);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
      inject();
    }
  })();
`

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  ...devices['iPhone 14 Pro'],
  viewport: VIEWPORT,
  deviceScaleFactor: DPR,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
})
await ctx.addInitScript(safeAreaScript)

const page = await ctx.newPage()
await page.goto('file://' + SRC, { waitUntil: 'domcontentloaded', timeout: 30000 })

// Wait for the menu to render. The script populates #content async after
// splash; first restaurant block is the signal.
await page.waitForSelector('#content .restaurant', { timeout: 15000 }).catch(() => {})
// Allow web fonts + lazy chip CSS + any micro animations to settle.
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
await page.waitForTimeout(1200)

// Scroll past the featured-dish hero so the captured frame shows the
// proper menu list (sticky app-bar + search-strip stay pinned at top, so
// the deck-card notch still rides over the app-bar). This matches the
// "see real dishes" framing the waitlist deck cards want for chapter 1.
await page.evaluate(() => window.scrollTo(0, 0))
const scrollY = Number(process.env.NINAN_SCROLL ?? 520)
if (scrollY > 0) {
  await page.evaluate(y => window.scrollTo(0, y), scrollY)
}
await page.waitForTimeout(400)

const buf = await page.screenshot({ type: 'png', fullPage: false })
// Re-encode PNG to webp in a CSP-free page (the source HTML's CSP blocks
// data: fetches, so we hop to about:blank for the conversion).
const convCtx = await browser.newContext()
const convPage = await convCtx.newPage()
await convPage.goto('about:blank')
const webpBytes = await convPage.evaluate(async (b64) => {
  const blob = await fetch(`data:image/png;base64,${b64}`).then(r => r.blob())
  const bmp = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bmp.width, bmp.height)
  canvas.getContext('2d').drawImage(bmp, 0, 0)
  const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 })
  const ab = await out.arrayBuffer()
  return Array.from(new Uint8Array(ab))
}, buf.toString('base64'))
await convCtx.close()

await writeFile(OUT, Buffer.from(webpBytes))
console.log(`wrote ${OUT}  ${(webpBytes.length / 1024).toFixed(1)}KB`)
await ctx.close()
await browser.close()
