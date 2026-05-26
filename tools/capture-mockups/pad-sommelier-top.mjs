// Add a dark safe-area band at the top of ai-sommelier.webp so the
// iPhone-frame notch on the waitlist deck/glimpse no longer clips the
// Sommelier reasoning card text. Loads the existing webp, draws it
// shifted down by BAND_PX, fills the top band with the EF page bg, then
// crops to the original 1179 x 2556 dimensions and re-encodes to webp.

import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'

const SRC = '/Users/nikhilballal/Downloads/ediblefactor-waitlist/.claude/worktrees/agent-a99b41e4cbc8c64dc/mockups/ai-sommelier.webp'
const OUT = SRC

const BAND_PX = 180        // shift content down by this much; matches ~60pt at DPR 3
const BG = '#07070b'       // EF page background

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()
await page.goto('about:blank')

const srcBytes = await readFile(SRC)
const srcB64 = srcBytes.toString('base64')

const outB64 = await page.evaluate(async ({ b64, BAND, BG }) => {
  const blob = await fetch(`data:image/webp;base64,${b64}`).then(r => r.blob())
  const bmp = await createImageBitmap(blob)
  const W = bmp.width
  const H = bmp.height
  const canvas = new OffscreenCanvas(W, H)
  const ctx2d = canvas.getContext('2d')
  ctx2d.fillStyle = BG
  ctx2d.fillRect(0, 0, W, H)
  // Draw source shifted down by BAND; bottom gets cropped naturally by canvas bounds.
  ctx2d.drawImage(bmp, 0, BAND)
  const out = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 })
  const ab = await out.arrayBuffer()
  const bytes = new Uint8Array(ab)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}, { b64: srcB64, BAND: BAND_PX, BG })

await writeFile(OUT, Buffer.from(outB64, 'base64'))
console.log(`padded ai-sommelier.webp (top ${BAND_PX}px safe band) -> ${OUT}`)

await ctx.close()
await browser.close()
