/* Content-hub behaviour: the mobile nav sheet and the Bites / Whole Meal toggle.
   External file rather than inline so it works under any script-src policy.
   No dependencies, no build. */
(function () {
  'use strict';

  /* ---------------- mobile nav sheet ---------------- */
  var burger = document.getElementById('navBurger');
  var sheet = document.getElementById('navSheet');
  if (burger && sheet) {
    var setOpen = function (open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      sheet.hidden = !open;
    };
    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        burger.focus();
      }
    });
    // A resize past the desktop breakpoint leaves the sheet open but visually
    // hidden by CSS, so aria-expanded would lie. Reset it.
    var mq = window.matchMedia('(min-width: 900px)');
    var sync = function () { if (mq.matches) setOpen(false); };
    mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
  }

  /* ---------------- Bites / Whole Meal ---------------- */
  var tablist = document.querySelector('.rt');
  if (!tablist) return;
  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var status = document.getElementById('rtStatus');
  var panels = {};
  tabs.forEach(function (t) {
    panels[t.dataset.mode] = document.getElementById(t.getAttribute('aria-controls'));
  });

  var readTime = function (panel) {
    var w = (panel.innerText || '').trim().split(/\s+/).length;
    return Math.max(1, Math.round(w / 220));
  };

  function setMode(mode, focusTab) {
    if (!panels[mode]) return;
    tabs.forEach(function (t) {
      var on = t.dataset.mode === mode;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
      var p = panels[t.dataset.mode];
      if (p) p.classList.toggle('rt-off', !on);
    });
    if (status) {
      status.textContent = mode === 'bites'
        ? 'Bites, about ' + readTime(panels.bites) + ' minutes'
        : 'The whole meal, about ' + readTime(panels.meal) + ' minutes';
    }
    try { localStorage.setItem('ef-read', mode); } catch (e) {}
    // Reflect in the URL so a reader can share the version they are looking at.
    // A query param, not a #hash: a hash substring match would fire on any
    // heading anchor containing the word "meal", and this content has one.
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

  // Real tablist keyboard support: arrows move and activate, Home/End jump.
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

  // Startup: an explicit ?read= wins over a saved preference. Called
  // unconditionally so the read-time label is never left describing the
  // wrong panel.
  var forced = null;
  try { forced = new URLSearchParams(window.location.search).get('read'); } catch (e) {}
  var saved = null;
  try { saved = localStorage.getItem('ef-read'); } catch (e) {}
  var start = (forced === 'bites' || forced === 'meal') ? forced
            : (saved === 'bites' || saved === 'meal') ? saved
            : 'meal';
  setMode(start, false);
})();
