import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../plate-assets/plate-v2.js', import.meta.url), 'utf8');
const controller = source.slice(source.indexOf('  // The poster is always available.'), source.lastIndexOf('})();'));
function fixture({ reduced = false, saveData = false, reject = false, deferred = false } = {}) {
  const handlers = {};
  const events = {};
  const attrs = {};
  let observed;
  let finish;
  const film = {
    paused: true, dataset: { src: '/test.mp4' }, loads: 0, plays: 0,
    addEventListener: (name, fn) => { handlers[name] = fn; },
    getAttribute: name => attrs[name], removeAttribute: name => { delete attrs[name]; },
    set src(value) { attrs.src = value; },
    load() { this.loads++; },
    play() { this.plays++; this.paused = false; return reject ? Promise.reject(new Error('blocked')) : deferred ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(); },
    pause() { this.paused = true; handlers.pause?.(); }
  };
  const button = { addEventListener: (name, fn) => { events.click = fn; } };
  const media = { dataset: {} };
  const motion = { matches: reduced, addEventListener: (_, fn) => { events.motion = fn; } };
  const connection = { saveData, addEventListener: (_, fn) => { events.connection = fn; } };
  const document = { hidden: false, getElementById: () => film, querySelector: s => s === '.hero-play' ? button : media, addEventListener: (_, fn) => { events.visibility = fn; } };
  runInNewContext(controller, { document, motion, navigator: { connection }, IntersectionObserver: class { constructor(fn) { observed = fn; } observe() {} } });
  return { film, button, media, motion, connection, document, events, handlers, view: value => observed([{ isIntersecting: value }]), finish: () => finish() };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('no video fetch until visible; pauses offscreen and resumes', async () => {
  const f = fixture(); assert.equal(f.film.loads, 0); f.view(true); await tick();
  assert.equal(f.film.loads, 1); assert.equal(f.film.paused, false);
  f.view(false); assert.equal(f.film.paused, true); f.view(true); await tick(); assert.equal(f.film.paused, false);
});
for (const option of ['reduced', 'saveData']) test(`${option} shows poster without fetching; explicit play opts in`, async () => {
  const f = fixture({ [option]: true }); f.view(true); assert.equal(f.film.loads, 0);
  f.events.click(); await tick(); assert.equal(f.film.paused, false);
});
test('manual pause survives visibility and viewport changes', async () => {
  const f = fixture(); f.view(true); await tick(); f.events.click(); f.view(false); f.view(true);
  f.document.hidden = true; f.events.visibility(); f.document.hidden = false; f.events.visibility();
  assert.equal(f.film.paused, true); assert.equal(f.film.plays, 1);
});
test('hidden document pauses and resumes when visible', async () => {
  const f = fixture(); f.view(true); await tick(); f.document.hidden = true; f.events.visibility(); assert.equal(f.film.paused, true);
  f.document.hidden = false; f.events.visibility(); await tick(); assert.equal(f.film.paused, false);
});
test('changed motion preference stops video and restores poster', async () => {
  const f = fixture(); f.view(true); await tick(); f.handlers.playing(); f.motion.matches = true; f.events.motion();
  assert.equal(f.film.paused, true); assert.equal(f.media.dataset.playing, 'false');
});
test('blocked autoplay keeps poster and offers play; network error offers retry', async () => {
  const f = fixture({ reject: true }); f.view(true); await tick(); assert.equal(f.media.dataset.playing, 'false');
  f.film.paused = true; f.handlers.error(); assert.equal(f.button.textContent, 'Retry product loop');
  f.events.click(); await tick(); assert.equal(f.film.loads, 2);
});
test('pending playback cannot restart video after leaving viewport', async () => {
  const f = fixture({ deferred: true }); f.view(true); f.view(false); f.finish(); await tick();
  assert.equal(f.film.paused, true);
});
