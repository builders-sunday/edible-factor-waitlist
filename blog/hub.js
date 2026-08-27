/* Bites / Whole Meal reading toggle.
   External file, not inline, so it works under any script-src policy.
   No dependencies, no build.

   Differences from the nikhilballal.com original, all deliberate:
   - Whole Meal is the default. The long version carries the keyword depth and
     hidden text gets down-weighted, so the version we want indexed is the one
     rendered on a cold load.
   - Mode rides on ?read=, not a #hash. The original matches the hash as a
     SUBSTRING, so any heading anchor containing "meal" silently flips the mode,
     and this content has an h2 with that word in it.
   - Real tablist semantics: aria-controls, roving tabindex, arrow keys, and a
     role=status line that announces the change.
   - setMode runs unconditionally at startup so the read-time label can never
     describe the panel that is not showing. */
(function () {
  'use strict';

  var tablist = document.querySelector('.b-toggle');
  if (!tablist) return;

  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var status = document.getElementById('rtStatus');
  var eyebrowRead = document.getElementById('rtRead');
  var panels = {};
  tabs.forEach(function (t) {
    panels[t.dataset.mode] = document.getElementById(t.getAttribute('aria-controls'));
  });

  function minutes(panel) {
    var w = (panel.innerText || '').trim().split(/\s+/).length;
    return Math.max(1, Math.round(w / 220));
  }

  function setMode(mode, focusTab) {
    if (!panels[mode]) return;
    tabs.forEach(function (t) {
      var on = t.dataset.mode === mode;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
      var p = panels[t.dataset.mode];
      if (p) p.classList.toggle('rl-hide', !on);
    });

    var mins = minutes(panels[mode]);
    if (status) status.textContent = 'The ' + mins + ' minute version';
    // The eyebrow advertises a read time too. Left alone it would keep quoting
    // the Whole Meal length while the reader is looking at Bites.
    if (eyebrowRead) eyebrowRead.textContent = mins + ' MIN READ';

    try { localStorage.setItem('ef-read', mode); } catch (e) {}
    try {
      var u = new URL(window.location.href);
      if (mode === 'meal') u.searchParams.delete('read');
      else u.searchParams.set('read', mode);
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    } catch (e) {}
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { setMode(t.dataset.mode, false); });
  });

  tablist.addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    setMode(tabs[next].dataset.mode, true);
  });

  var forced = null;
  try { forced = new URLSearchParams(window.location.search).get('read'); } catch (e) {}
  var saved = null;
  try { saved = localStorage.getItem('ef-read'); } catch (e) {}
  var start = (forced === 'bites' || forced === 'meal') ? forced
            : (saved === 'bites' || saved === 'meal') ? saved
            : 'meal';
  setMode(start, false);
})();
