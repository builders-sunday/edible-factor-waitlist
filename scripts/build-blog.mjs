/**
 * build-blog.mjs - authoring tool, NOT a deploy step.
 *
 * Reads .drafts/<slug>.md and writes blog/<slug>.html plus blog/index.html.
 * The generated HTML is committed and Cloudflare Pages serves it as-is, so the
 * deploy path stays exactly what it is today: static files, no build.
 *
 * Run by hand after editing a draft:  node scripts/build-blog.mjs
 *
 * Draft format:
 *   ---
 *   { json front matter }
 *   ---
 *   <!--BITES-->
 *   ...the short read...
 *   <!--MEAL-->
 *   ...the full read...
 *
 * Deliberate choices worth not "fixing":
 * - Whole Meal is the DEFAULT panel. nikhilballal.com defaults to Bites, but the
 *   long version is where the keyword depth lives and search engines down-weight
 *   text hidden behind a toggle. Defaulting to Meal means the version we want
 *   indexed is the version rendered.
 * - Both panels ship in the HTML. Only one is display:none, which is not cloaking
 *   (same bytes to everyone) and keeps the switch instant.
 * - Mode is carried in ?read=bites, not a #hash. A hash substring match fires on
 *   any heading anchor containing the word "meal", which this content has.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS = join(ROOT, '.drafts');
const OUT = join(ROOT, 'blog');
const SITE = 'https://ediblefactor.com';
const ASSET_V = '20260827';

const POSTS = [
  { slug: 'ferrero-rocher-30-percent-chocolate-what-menus-can-learn', date: '2026-08-27', tag: 'Ingredients' },
  { slug: 'lindt-two-lawsuits-what-your-menu-promises', date: '2026-08-27', tag: 'Ingredients' },
  { slug: 'camera-in-your-dining-room', date: '2026-08-27', tag: 'Operators' },
  { slug: 'india-sugar-price-rise-restaurants-2026', date: '2026-08-27', tag: 'Costs' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Minimal markdown: h2/h3, para, links, bold, italic, lists, hr. No raw HTML passthrough. */
function md(src) {
  const inline = (t) =>
    esc(t)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, b) => `<a href="${b}" rel="noopener">${a}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line === '---') { closeList(); out.push('<hr>'); continue; }
    let m;
    if ((m = line.match(/^###\s+(.*)/))) { closeList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^##\s+(.*)/))) { closeList(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    if ((m = line.match(/^\d+\.\s+(.*)/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function parseDraft(slug) {
  const raw = readFileSync(join(DRAFTS, `${slug}.md`), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) throw new Error(`${slug}: missing front matter`);
  const meta = JSON.parse(fm[1]);
  const body = fm[2];
  const bi = body.indexOf('<!--BITES-->');
  const mi = body.indexOf('<!--MEAL-->');
  if (bi === -1 || mi === -1) throw new Error(`${slug}: needs both <!--BITES--> and <!--MEAL--> markers`);
  // The drafts end with a trailing "--- / Source: ..." block. The citation is
  // rendered separately into .post__src, so leaving it in the body prints it
  // twice, which is exactly what the first render showed.
  const stripCitation = (s) => s.replace(/\n---\s*\n+Source:[\s\S]*$/i, '').trim();

  return {
    meta,
    bites: stripCitation(body.slice(bi + 12, mi)),
    meal: stripCitation(body.slice(mi + 11)),
  };
}

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const readMin = (w) => Math.max(1, Math.round(w / 220));

/** Shared head. Uses index.html's CURRENT tokens, not the stale ones in careers.html. */
function head({ title, desc, url, extraCss = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#f3efe4">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:site_name" content="edible&middot;factor">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="preload" href="/vendor/fonts/geist-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/blog/blog.css?v=${ASSET_V}">
${extraCss}<link rel="icon" type="image/svg+xml" href="/ef-favicon.svg">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/ef-mark-180.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self';">
<meta name="referrer" content="strict-origin-when-cross-origin">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;
}

/* Only sections that actually exist get a nav entry. Shipping a header for a
   page that 404s is worse than shipping no header. Add /news, /guides and
   /tools here as each one lands. */
const SECTIONS = [
  { href: '/blog', label: 'Blog', key: 'blog' },
  { href: '/careers', label: 'Careers', key: 'careers' },
];

/* Slim top bar, matching nikhilballal.com/blog: wordmark left, mono links
   right, 1px rule under, 680px inner. No burger: at 375 this is a wordmark
   plus two 10px mono links, which fits with room to spare. */
function nav(current) {
  const links = SECTIONS.map(
    (x) => `<a href="${x.href}"${current === x.key ? ' aria-current="page"' : ''}>${x.label}</a>`
  ).join('\n      ');
  return `
<nav class="b-nav" aria-label="Primary">
  <div class="b-nav-inner">
    <a href="/" class="home">edible<span class="period">factor.</span></a>
    <div class="b-nav__links">
      ${links}
      <a href="/#waitlist-hero">Join Waitlist</a>
    </div>
  </div>
</nav>`;
}

const FOOTER = `
<footer class="b-foot">
  <div class="b-foot__inner">
    <span>edible&middot;factor &middot; &copy; 2026 &middot; Bengaluru</span>
    <a class="b-foot__more" href="/blog">All writing</a>
  </div>
</footer>
<script src="/blog/hub.js?v=${ASSET_V}"></script>
</body>
</html>`;

function buildPost(p) {
  const { meta, bites, meal } = parseDraft(p.slug);
  const url = `${SITE}/blog/${p.slug}`;
  const bw = words(bites), mw = words(meal);
  const dateLong = new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: meta.efTitle,
    description: meta.metaDescription,
    datePublished: p.date,
    author: { '@type': 'Organization', name: 'Edible Factor' },
    publisher: { '@type': 'Organization', name: 'Edible Factor' },
    mainEntityOfPage: url,
  };

  const html = `${head({ title: `${meta.seoTitle} &middot; edible&middot;factor`, desc: meta.metaDescription, url })}
${nav('blog')}
<main id="main" class="wrap">
  <header class="post-header">
    <p class="eyebrow"><span class="tag">${esc(p.tag)}</span><span class="sep">&middot;</span><time datetime="${p.date}">${dateLong}</time><span class="sep">&middot;</span><span id="rtRead">${readMin(mw)} MIN READ</span></p>
    <h1>${esc(meta.efTitle)}</h1>
    <p class="standfirst">${esc(meta.hook)}</p>
    <div class="b-toggle-row">
      <div class="b-toggle" role="tablist" aria-label="Reading length">
        <button type="button" class="b-toggle-btn is-on" role="tab" id="tab-meal" aria-controls="panel-meal" aria-selected="true" tabindex="0" data-mode="meal">Whole Meal</button>
        <button type="button" class="b-toggle-btn" role="tab" id="tab-bites" aria-controls="panel-bites" aria-selected="false" tabindex="-1" data-mode="bites">Bites</button>
      </div>
      <p class="b-toggle-hint" role="status" aria-live="polite" id="rtStatus">The ${readMin(mw)} minute version</p>
    </div>
  </header>

  <article class="post-body" id="panel-meal" role="tabpanel" aria-labelledby="tab-meal" data-mode="meal">
${md(meal)}
  </article>
  <article class="post-body rl-hide" id="panel-bites" role="tabpanel" aria-labelledby="tab-bites" data-mode="bites">
${md(bites)}
  </article>

${(meta.sources && meta.sources.length) ? `
  <section class="sources">
    <h2>Sources</h2>
    <ul>
${meta.sources.map((x) => `      <li><a href="${x.url}" rel="noopener">${esc(x.label)}</a></li>`).join('\n')}
    </ul>
  </section>` : ''}

  <aside class="post-src">
    <p>${md(meta.citation).replace(/^<p>|<\/p>$/g, '')}</p>
  </aside>
</main>
<noscript><style>.rl-hide{display:block !important}.b-toggle,.b-toggle-hint{display:none}</style></noscript>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${FOOTER}`;

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${p.slug}.html`), html);
  return { ...p, meta, bw, mw };
}

function buildIndex(posts) {
  const cards = posts
    .map((p) => {
      const d = new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
      return `      <a class="b-post-card" href="/blog/${p.slug}">
        <p class="meta"><span class="tag">${esc(p.tag)}</span><span class="sep">&middot;</span>${d}<span class="sep">&middot;</span>${readMin(p.mw)} MIN READ</p>
        <h2>${esc(p.meta.efTitle)}</h2>
        <p class="dek">${esc(p.meta.hook)}</p>
        <p class="read">Read &rarr;</p>
      </a>`;
    })
    .join('\n');

  const html = `${head({
    title: 'Writing &middot; edible&middot;factor',
    desc: 'What is actually on the plate, and what it costs the kitchen. Writing on ingredients, menu transparency and the economics of eating out in India.',
    url: `${SITE}/blog`,
  })}
${nav('blog')}
<main id="main" class="wrap">
  <header class="b-index-head">
    <p class="eyebrow">Writing</p>
    <h1>What is actually on the plate<span class="period">.</span></h1>
    <p class="lede">Ingredients, menu transparency and the economics of eating out in India. Every piece reads two ways: the Whole Meal, or Bites if you have a minute.</p>
  </header>
  <div class="b-list">
${cards}
  </div>
</main>
${FOOTER}`;
  writeFileSync(join(OUT, 'index.html'), html);
}

const built = [];
for (const p of POSTS) {
  try {
    built.push(buildPost(p));
    console.log(`  ok   blog/${p.slug}.html`);
  } catch (e) {
    console.log(`  SKIP ${p.slug}: ${e.message}`);
  }
}
if (built.length) {
  buildIndex(built);
  console.log(`  ok   blog/index.html (${built.length} posts)`);
}
console.log(`\nbuilt ${built.length}/${POSTS.length}`);
for (const b of built) console.log(`  ${b.slug}: bites ${b.bw}w / meal ${b.mw}w`);
