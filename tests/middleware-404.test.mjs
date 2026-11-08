import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/_middleware.js';

const env = {
  ASSETS: { fetch: async () => new Response('<title>Page not found</title>', { status: 200, headers: { 'content-type': 'text/html' } }) },
};
const run = (path, method = 'GET') =>
  onRequest({ request: new Request(`https://ediblefactor.com${path}`, { method }), env, next: async () => new Response('page', { status: 200 }) });

for (const path of ['/why-not-petpooja', '/why-not-petpooja.html', '/why-not-petpooja/', '/Why-Not-Petpooja', '/why-not-petpooja?x=1', '/why%2Dnot%2Dpetpooja', '//why-not-petpooja']) {
  test(`retired page 404s: ${path}`, async () => {
    const res = await run(path);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(await res.text(), /Page not found/);
  });
}

for (const path of ['/', '/careers', '/legal', '/blog/', '/why-not-petpooja-2', '/why', '/api/waitlist']) {
  test(`live path passes through: ${path}`, async () => {
    const res = await run(path);
    assert.equal(res.status, 200);
  });
}

test('existing internal paths still 404', async () => {
  for (const path of ['/CLAUDE.md', '/scripts/build-blog.mjs', '/.claude/x']) assert.equal((await run(path)).status, 404);
});

test('HEAD gets an empty 404', async () => {
  const res = await run('/why-not-petpooja', 'HEAD');
  assert.equal(res.status, 404);
  assert.equal(await res.text(), '');
});

test('_routes.json sends every retired variant to the Function', () => {
  const { include } = JSON.parse(readFileSync(new URL('../_routes.json', import.meta.url)));
  for (const p of ['/why-not-petpooja', '/why-not-petpooja.html', '/why-not-petpooja/']) assert.ok(include.includes(p), p);
  assert.ok(include.length <= 100);
});
