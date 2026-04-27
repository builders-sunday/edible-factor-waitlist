// Capture iPhone-aspect screenshots of the live EdibleFactor app for the
// waitlist mockups. Drives Playwright's Chromium at iPhone 14 viewport
// (393x852 @ DPR 3 = 1179x2556 native) with the guest cookie set so it
// can reach protected routes without OAuth.
//
// Re-run anytime the app design changes:
//     npm run capture
//
// Output: <repo>/mockups/<name>.webp  (Vercel serves these at /mockups/*.webp)

import { chromium, devices } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', '..', 'mockups')
const SITE = process.env.MOCKUP_SITE ?? 'https://www.ediblefactor.com'

// Each entry → one mockup file. `path` is the route to capture; `selector`
// (optional) is what we wait for before screenshotting; `wait` (optional) is
// extra ms to let animations settle.
const TARGETS = [
  { name: 'home-dashboard',     path: '/dashboard',   wait: 1500 },
  { name: 'restaurants-browse', path: '/restaurants', wait: 1500 },
  { name: 'ai-sommelier',       path: '/chat',        wait: 1500 },
  { name: 'calorie-trend',      path: '/insights',    wait: 1500 },
  { name: 'lifestyle-swap',     path: '/insights',    wait: 1500, scrollY: 800 },
]

const VIEWPORT = { width: 393, height: 852 } // iPhone 14
const DPR = 3 // captures at 1179 x 2556

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    ...devices['iPhone 14 Pro'],
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  })

  // Inject simulated iOS safe-area-inset-top before any page script runs.
  // Playwright's iPhone 14 Pro device profile doesn't actually simulate
  // the notch / safe area, so env(safe-area-inset-top) resolves to 0 and
  // the app paints its header at y=0. The waitlist phone-frame mockup
  // overlays a notch at the top of the rendered screenshot — without
  // safe-area padding, the notch covers the app's header text. This
  // pushes the body down and re-anchors fixed headers below the safe area
  // so the captured screenshot has clean room for the notch.
  await ctx.addInitScript(() => {
    const SAFE_TOP = 47 // matches iPhone 14 / 14 Pro safe-area-inset-top
    const inject = () => {
      const style = document.createElement('style')
      style.textContent = `
        :root { --mockup-safe-top: ${SAFE_TOP}px; }
        body { padding-top: ${SAFE_TOP}px !important; }
        /* Tailwind's "fixed top-0" headers and any element pinned to the
           viewport top need to slide down too, since fixed elements ignore
           ancestor padding. */
        header.fixed,
        header[class*="fixed"][class*="top-0"],
        [class*="fixed"][class*="top-0"]:not(input):not(button) {
          top: ${SAFE_TOP}px !important;
        }
      `
      document.documentElement.appendChild(style)
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true })
    } else {
      inject()
    }
  })

  // Set guest cookie so middleware lets us into protected routes
  // (see middleware.ts in the ediblefactor repo: ef-guest=true bypasses /login redirect)
  const url = new URL(SITE)
  await ctx.addCookies([{
    name: 'ef-guest',
    value: 'true',
    domain: url.hostname,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 86400,
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
  }])

  const page = await ctx.newPage()

  // Pre-warm: hit the homepage so any client-side guest setup runs
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.evaluate(() => localStorage.setItem('ef-guest', 'true')).catch(() => {})

  for (const target of TARGETS) {
    const url = `${SITE}${target.path}`
    console.log(`→ ${target.name}  ${url}`)
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      if (!resp || !resp.ok()) {
        console.warn(`   ⚠ status ${resp?.status()}`)
      }
      if (target.scrollY) {
        await page.evaluate(y => window.scrollTo(0, y), target.scrollY)
      }
      if (target.wait) {
        await page.waitForTimeout(target.wait)
      }
      const buf = await page.screenshot({
        type: 'png', // playwright doesn't emit webp directly; we'll convert below
        fullPage: false,
      })
      // Convert PNG → WebP via Chromium itself (no native deps)
      const webp = await page.evaluate(async (b64) => {
        const blob = await fetch(`data:image/png;base64,${b64}`).then(r => r.blob())
        const bmp = await createImageBitmap(blob)
        const canvas = new OffscreenCanvas(bmp.width, bmp.height)
        canvas.getContext('2d').drawImage(bmp, 0, 0)
        const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 })
        const ab = await out.arrayBuffer()
        return Array.from(new Uint8Array(ab))
      }, buf.toString('base64'))
      const outPath = resolve(OUT_DIR, `${target.name}.webp`)
      await writeFile(outPath, Buffer.from(webp))
      const kb = (webp.length / 1024).toFixed(1)
      console.log(`   ✓ ${outPath.replace(process.cwd() + '/', '')}  ${kb}KB`)
    } catch (err) {
      console.error(`   ✗ ${err.message}`)
    }
  }

  await browser.close()
  console.log('\nDone. Commit the new files in mockups/ and push to redeploy.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
