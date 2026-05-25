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
import { mkdir, writeFile, rename, rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', '..', 'mockups')
const SITE = process.env.MOCKUP_SITE ?? 'https://app.ediblefactor.com'

// Each entry → one mockup file. `path` is the route to capture; `selector`
// (optional) is what we wait for before screenshotting; `wait` (optional) is
// extra ms to let animations settle. `scrollY` (optional) scrolls before snap.
// `video` (optional) records a short looping webm instead of (or in addition
// to) a still — used for scenes where the live app has motion that a still
// loses (insights donut fill, dashboard balance ring animating in).
const TARGETS = [
  // Chapter 0 · Your Home — /dashboard with Today's Balance donut.
  // Video records the ring fill animation on first paint. trimStart skips
  // the auth/redirect frames at the front of the recording so the loop
  // starts on the actual home screen, not the sign-in card.
  { name: 'home-dashboard',     path: '/dashboard', wait: 2200, video: { duration: 7000, trimStart: 3.4, trimDuration: 4.5 } },
  // Chapter 1 · Find The Table — /menu shows the restaurant header pills +
  // dish cards. Today's post-login landing. Static is fine here.
  { name: 'restaurants-browse', path: '/menu',      wait: 2400 },
  // Chapter 2 · AI Sommelier — /menu scrolled down a touch so the AI
  // Sommelier hero + alternates strip are dead-centre in the phone frame.
  { name: 'ai-sommelier',       path: '/menu',      wait: 2400, scrollY: 420 },
  // Chapter 3 · Insights — densified macro split donut animates in.
  // Video captures the ring fills + donut sweep that the still would lose.
  { name: 'calorie-trend',      path: '/insights',  wait: 2200, video: { duration: 7400, trimStart: 3.6, trimDuration: 4.5 } },
]

const VIEWPORT = { width: 393, height: 852 } // iPhone 14
const DPR = 3 // captures at 1179 x 2556

const SAFE_TOP = 47 // matches iPhone 14 / 14 Pro safe-area-inset-top

// Init-script body shared across contexts. Pushes the app body down by
// SAFE_TOP so the waitlist phone-frame notch doesn't cover header text.
const safeAreaScript = `
  (() => {
    const SAFE_TOP = ${SAFE_TOP};
    const inject = () => {
      const style = document.createElement('style');
      style.textContent = ":root { --mockup-safe-top: " + SAFE_TOP + "px; }"
        + "body { padding-top: " + SAFE_TOP + "px !important; }"
        + "header.fixed, header[class*='fixed'][class*='top-0'], [class*='fixed'][class*='top-0']:not(input):not(button) { top: " + SAFE_TOP + "px !important; }";
      document.documentElement.appendChild(style);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
      inject();
    }
  })();
`

async function newCtx(browser, { video } = {}) {
  const opts = {
    ...devices['iPhone 14 Pro'],
    viewport: VIEWPORT,
    deviceScaleFactor: video ? 2 : DPR, // lower DPR for video to keep file size sane
    isMobile: true,
    hasTouch: true,
    colorScheme: 'dark',
  }
  if (video) {
    opts.recordVideo = {
      dir: video.dir,
      size: { width: VIEWPORT.width, height: VIEWPORT.height },
    }
  }
  const ctx = await browser.newContext(opts)
  await ctx.addInitScript(safeAreaScript)
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
  return ctx
}

async function gotoWithRetry(page, url, { tries = 4, gap = 2500 } = {}) {
  let lastResp = null
  for (let i = 1; i <= tries; i++) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
      lastResp = resp
      if (resp && resp.ok()) {
        // Wait a moment then sanity check the page wasn't a Cloudflare error
        // (Cloudflare 1102/1101 returns 200 sometimes with error markup).
        await page.waitForTimeout(800)
        const isCfError = await page.evaluate(() => {
          const t = document.body?.textContent || ''
          return /Error\s+11\d\d|Worker exceeded|Cloudflare/.test(t) && t.length < 4000
        }).catch(() => false)
        if (!isCfError) return resp
        console.warn(`     [retry ${i}/${tries}] cloudflare error body`)
      } else {
        console.warn(`     [retry ${i}/${tries}] status ${resp?.status()}`)
      }
    } catch (err) {
      console.warn(`     [retry ${i}/${tries}] ${err.message.split('\n')[0]}`)
    }
    if (i < tries) await page.waitForTimeout(gap)
  }
  return lastResp
}

async function captureStill(page, target) {
  const url = `${SITE}${target.path}`
  console.log(`  → still ${target.name}  ${url}`)
  const resp = await gotoWithRetry(page, url)
  if (!resp || !resp.ok()) console.warn(`     status ${resp?.status()}`)
  // Let any post-DOMContentLoaded fetches settle (the app hydrates async).
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (target.scrollY) await page.evaluate(y => window.scrollTo(0, y), target.scrollY)
  if (target.wait) await page.waitForTimeout(target.wait)
  const buf = await page.screenshot({ type: 'png', fullPage: false })
  const webp = await page.evaluate(async (b64) => {
    const blob = await fetch(`data:image/png;base64,${b64}`).then(r => r.blob())
    const bmp = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(bmp.width, bmp.height)
    canvas.getContext('2d').drawImage(bmp, 0, 0)
    const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 })
    const ab = await out.arrayBuffer()
    return Array.from(new Uint8Array(ab))
  }, buf.toString('base64'))
  const outPath = resolve(OUT_DIR, `${target.name}.webp`)
  await writeFile(outPath, Buffer.from(webp))
  console.log(`     ${outPath.replace(OUT_DIR + '/', 'mockups/')}  ${(webp.length / 1024).toFixed(1)}KB`)
}

async function captureVideo(browser, target) {
  const videoDir = resolve(__dirname, '.video-tmp', target.name)
  await rm(videoDir, { recursive: true, force: true })
  await mkdir(videoDir, { recursive: true })
  const ctx = await newCtx(browser, { video: { dir: videoDir } })
  const page = await ctx.newPage()
  // Pre-warm so localStorage guest flag is set and middleware lets us in.
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.evaluate(() => localStorage.setItem('ef-guest', 'true')).catch(() => {})
  const url = `${SITE}${target.path}`
  console.log(`  → video ${target.name}  ${url}  (${target.video.duration}ms)`)
  await gotoWithRetry(page, url)
  // Don't wait for full networkidle — we want to record the animations as they
  // play. Just give a tiny buffer for first paint, then record.
  await page.waitForTimeout(600)
  if (target.scrollY) await page.evaluate(y => window.scrollTo(0, y), target.scrollY)
  await page.waitForTimeout(target.video.duration)
  const videoPath = await page.video().path()
  await ctx.close() // flushes the video file
  const outPath = resolve(OUT_DIR, `${target.name}.webm`)
  // If a trim window is requested, re-encode through Playwright's bundled
  // ffmpeg. This drops the first N seconds (the auth/redirect/blank frames)
  // and re-encodes to a tight VP8 stream so the looping <video> on the
  // waitlist starts on real app content and stays under ~150 KB.
  if (target.video.trimStart && target.video.trimDuration) {
    await trimVideo(videoPath, outPath, target.video.trimStart, target.video.trimDuration)
  } else {
    await rename(videoPath, outPath)
  }
  await rm(videoDir, { recursive: true, force: true })
  const { size } = await stat(outPath)
  console.log(`     ${outPath.replace(OUT_DIR + '/', 'mockups/')}  ${(size / 1024).toFixed(1)}KB`)
}

// Use Playwright's bundled ffmpeg (vp8 encoder available, no extra deps).
async function trimVideo(src, dst, start, duration) {
  const ff = resolve(__dirname, 'node_modules', 'playwright-core', '.local-browsers')
  // Path discovery: the binary lives under
  // ~/Library/Caches/ms-playwright/ffmpeg-*/ffmpeg-mac on darwin. Probe
  // PLAYWRIGHT_BROWSERS_PATH or fall back to the default cache.
  const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH
    || `${process.env.HOME}/Library/Caches/ms-playwright`
  const { readdir } = await import('node:fs/promises')
  let ffmpegBin = null
  try {
    const entries = await readdir(cacheRoot)
    const ffDir = entries.find(e => e.startsWith('ffmpeg-'))
    if (ffDir) ffmpegBin = `${cacheRoot}/${ffDir}/ffmpeg-mac`
  } catch {}
  if (!ffmpegBin) {
    console.warn('     no ffmpeg; keeping untrimmed video')
    await rename(src, dst)
    return
  }
  await new Promise((res, rej) => {
    const args = [
      '-y',
      '-ss', String(start),
      '-i', src,
      '-t', String(duration),
      '-an',
      '-c:v', 'libvpx',
      '-b:v', '380k',
      '-crf', '32',
      '-deadline', 'good',
      '-cpu-used', '1',
      dst,
    ]
    const p = spawn(ffmpegBin, args, { stdio: 'ignore' })
    p.on('exit', code => code === 0 ? res() : rej(new Error(`ffmpeg exit ${code}`)))
    p.on('error', rej)
  })
  // ffmpeg succeeded; drop the original raw recording.
  await rm(src, { force: true })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  // Single shared context for stills (fast).
  const ctx = await newCtx(browser)
  const page = await ctx.newPage()
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.evaluate(() => localStorage.setItem('ef-guest', 'true')).catch(() => {})

  for (const target of TARGETS) {
    console.log(`▸ ${target.name}`)
    try {
      await captureStill(page, target)
    } catch (err) {
      console.error(`     still failed: ${err.message}`)
    }
    if (target.video) {
      try {
        await captureVideo(browser, target)
      } catch (err) {
        console.error(`     video failed: ${err.message}`)
      }
    }
  }

  await ctx.close()
  await browser.close()
  console.log('\nDone. Commit the new files in mockups/ and push to redeploy.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
